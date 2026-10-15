(() => {
  if (globalThis.composeAiSelectionReady) return;
  globalThis.composeAiSelectionReady = true;
  const snapshots = new Map();
  const excluded = 'blockquote, .moz-cite-prefix, .moz-forward-container, .moz-email-headers-table, script, style, img, hr';
  const blocks = new Set(['DIV', 'P', 'PRE', 'LI', 'UL', 'OL', 'TABLE', 'TR', 'SECTION']);
  function readableText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.data;
    if (node.nodeName === 'BR') return '\n';
    const value = [...node.childNodes].map(readableText).join('');
    return blocks.has(node.nodeName) ? `\n${value}\n` : value;
  }
  function fingerprint(node) {
    if (node.nodeType === Node.TEXT_NODE) return ['text', node.data];
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    // Ignore editor-maintained attributes but retain content-bearing URLs and structure.
    return [node.nodeName, node.getAttribute('href'), node.getAttribute('src'), [...node.childNodes].map(fingerprint)];
  }
  function bodyRanges() {
    const ranges = [];
    let first = null;
    let last = null;
    let forwardedTail = false;
    function flush() {
      if (first) {
        const range = document.createRange();
        range.setStart(first.node, first.offset); range.setEnd(last.node, last.offset);
        if (readableText(range.cloneContents()).trim()) ranges.push(range);
      }
      first = last = null;
    }
    function append(start, end) { first ||= start; last = end; }
    function visit(node) {
      if (forwardedTail) return;
      if (node.nodeType === Node.ELEMENT_NODE && node.matches(excluded)) { flush(); return; }
      if (node.nodeType === Node.TEXT_NODE) {
        let offset = 0;
        for (const line of node.data.match(/[^\n]*\n|[^\n]+$/g) || []) {
          const end = offset + line.length;
          const trimmed = line.trim();
          if (/^-{2,}\s*(?:forwarded message|original message|weitergeleitete nachricht|ursprüngliche nachricht|转发邮件|轉寄郵件|原始邮件|原始郵件)/i.test(trimmed)) {
            flush(); forwardedTail = true; return;
          }
          const quote = /^>/.test(trimmed) || /^On .+wrote:\s*$/i.test(trimmed) || /^Am .+schrieb.+:\s*$/i.test(trimmed) || /^(?:在|於).+(?:写道|寫道)[：:]\s*$/.test(trimmed);
          if (quote) flush(); else append({ node, offset }, { node, offset: end });
          offset = end;
        }
      } else if (node.nodeName === 'BR') {
        const index = [...node.parentNode.childNodes].indexOf(node);
        append({ node: node.parentNode, offset: index }, { node: node.parentNode, offset: index + 1 });
      } else { for (const child of node.childNodes) visit(child); }
    }
    visit(document.body); flush(); return ranges;
  }
  messenger.runtime.onMessage.addListener((message) => {
    if (!message || message.scope !== 'compose-ai-selection') return;
    try {
      if (message.action === 'capture') {
        const selection = window.getSelection();
        const explicit = selection && !selection.isCollapsed && selection.toString().trim();
        if (explicit && selection.rangeCount !== 1) throw new Error('请只选择一个连续的文字范围。');
        const ranges = explicit ? [selection.getRangeAt(0).cloneRange()] : bodyRanges();
        if (ranges.some(range => !document.body.contains(range.commonAncestorContainer))) throw new Error('只能改写邮件正文中的选中文字。');
        const text = explicit ? selection.toString() : ranges.map(range => readableText(range.cloneContents()).trim()).join('\n\n');
        if (!text.trim()) throw new Error('没有可改写的正文。引用回复和转发内容不会自动作为输入。');
        if (text.length > 20000) throw new Error('一次最多处理 20,000 个字符，请缩小选区。');
        snapshots.set(message.key, {
          automatic: !explicit,
          ranges: ranges.map(range => ({ range, rawText: range.toString() })),
          fingerprint: JSON.stringify(fingerprint(document.body))
        });
        return Promise.resolve({ ok: true, text, mode: explicit ? 'selection' : 'body' });
      }
      if (message.action === 'release') { snapshots.delete(message.key); return Promise.resolve({ ok: true }); }
      if (message.action === 'replace') {
        const saved = snapshots.get(message.key);
        if (!saved) throw new Error('原选区已失效，请关闭此窗口后重新选择文字。');
        if (saved.fingerprint !== JSON.stringify(fingerprint(document.body)) || saved.ranges.some(({ range, rawText }) => !range.startContainer.isConnected || !range.endContainer.isConnected || range.toString() !== rawText)) {
          throw new Error('邮件正文在预览期间发生了变化。为避免覆盖，请复制结果，关闭窗口后重新选择文字。');
        }
        if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 40000) throw new Error('改写结果为空或过长，未替换正文。');
        document.body.focus();
        const selection = window.getSelection();
        let applied = 0;
        try {
          // Work backwards to preserve quoted blocks and native editor undo.
          for (let index = saved.ranges.length - 1; index >= 0; index--) {
            const entry = saved.ranges[index];
            // Preserve the line boundary before an excluded plain-text quote,
            // but never turn collapsed HTML source whitespace into visible text.
            const end = entry.range.endContainer;
            const suffix = saved.automatic && end.nodeType === Node.TEXT_NODE &&
              entry.range.endOffset < end.length && /\n\s*$/.test(entry.rawText) ? '\n' : '';
            selection.removeAllRanges(); selection.addRange(entry.range);
            if (!document.execCommand('insertText', false, (index === 0 ? message.text : '') + suffix)) throw new Error('编辑器没有接受替换操作，请手动复制结果。');
            applied++;
          }
        } catch (error) {
          while (applied-- > 0) document.execCommand('undo');
          snapshots.delete(message.key); throw error;
        }
        snapshots.delete(message.key); return Promise.resolve({ ok: true });
      }
      throw new Error('Unsupported selection action.');
    } catch (error) { return Promise.resolve({ ok: false, error: error.message }); }
  });
})();
