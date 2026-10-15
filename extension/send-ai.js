(async () => {
  await ComposeI18n.initialize();
  const t = key => ComposeI18n.t(key).replaceAll('{app}', appName);
  const el = id => document.getElementById(id);
  let appName = 'ChatGPT';
  document.title = t('导出邮件');
  el('filePath').setAttribute('aria-label', t('导出文件路径'));
  const key = new URL(location.href).searchParams.get('key');
  const saved = await messenger.storage.local.get(['desktopTarget', 'desktopExecutable']);
  const target = ['chatgpt', 'codex', 'custom'].includes(saved.desktopTarget) ? saved.desktopTarget : 'chatgpt';
  appName = target === 'codex' ? 'Codex' : 'ChatGPT';
  let mail, token, port, nextId = 0, epoch = 0;
  let txtQuotes = false;
  const format = () => document.querySelector('[name="format"]:checked').value;
  const pending = new Map();
  function native(action, data) {
    if (!port) {
      port = messenger.runtime.connectNative('local.mail_ai_assist');
      port.onMessage.addListener(message => {
        const promise = pending.get(message.id);
        if (!promise || message.event) return;
        pending.delete(message.id); clearTimeout(promise.timer);
        message.ok ? promise.resolve(message.result) : promise.reject(new Error(message.error?.code || 'desktop_failed'));
      });
      port.onDisconnect.addListener(() => {
        port = null;
        for (const promise of pending.values()) { clearTimeout(promise.timer); promise.reject(new Error('desktop_failed')); }
        pending.clear();
      });
    }
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); port?.disconnect(); reject(new Error('desktop_failed')); }, 60000);
      pending.set(id, { resolve, reject, timer });
      port.postMessage({ id, action, ...data });
    });
  }
  async function preview() {
    const current = ++epoch;
    mail = null; el('preview').value = ''; el('prepare').disabled = true;
    try {
      const result = await messenger.runtime.sendMessage({ scope: 'mail-ai', action: 'export', key, format: format(), includeQuotes: el('quotes').checked });
      if (current !== epoch) return;
      if (!result?.ok) throw new Error(result?.error || 'desktop_failed');
      mail = result.mail;
      el('preview').value = `${mail.subject}\n${mail.from}\n${mail.to}\n${mail.date}\n\n${format() === 'eml' ? t('TXT 导出正文，可排除引用；EML 保留完整原始邮件及附件，不过滤引用。') : mail.body}`;
      el('prepare').disabled = false; el('status').textContent = '';
    } catch (error) { el('status').textContent = t(error.message); }
  }
  el('quotes').addEventListener('change', () => { txtQuotes = el('quotes').checked; return preview(); });
  for (const radio of document.querySelectorAll('[name="format"]')) radio.addEventListener('change', () => {
    const eml = format() === 'eml';
    el('quotes').checked = eml || txtQuotes;
    el('quotes').disabled = eml;
    return preview();
  });
  el('prepare').addEventListener('click', async () => {
    if (!mail) return;
    el('prepare').disabled = true; el('choices').disabled = true;
    el('close').disabled = true;
    el('status').textContent = t('正在准备文件…');
    try {
      const options = { identity: mail.exportIdentity, includeQuotes: el('quotes').checked, target, executable: saved.desktopExecutable || '' };
      let result;
      if (format() === 'eml') {
        let offset = 0, size;
        do {
          const chunk = await messenger.runtime.sendMessage({ scope: 'mail-ai', action: 'raw', key, offset });
          if (!chunk?.ok) throw new Error(chunk?.error || 'desktop_failed');
          if (!token) { const started = await native('beginEml', { ...options, size: chunk.size }); token = started.token; el('filePath').value = started.path; }
          size = chunk.size;
          await native('appendEml', { token, offset, base64: chunk.base64 });
          offset = chunk.end;
        } while (offset < size);
        result = await native('finishEml', { token });
      } else result = await native('prepareDesktop', { mail, ...options, format: 'txt' });
      token = result.token;
      el('filePath').value = result.path; el('filePath').hidden = false;
      el('prepare').hidden = true;
      el('reveal').hidden = false; el('copyPath').hidden = false;
      el('status').textContent = t('选择目标聊天后，将文件拖入输入区；也可复制路径，在添加文件对话框中粘贴。');
      if (!result.revealed) el('status').textContent += ' ' + t('无法打开文件夹，请复制文件路径手动添加。');
      if (!result.opened) el('status').textContent += ' ' + t('应用未能自动打开，请手动打开。');
    } catch (error) { el('status').textContent = t(error.message in ComposeTranslations.en ? error.message : 'desktop_failed'); el('prepare').disabled = Boolean(token); el('choices').disabled = Boolean(token); }
    finally { el('close').disabled = false; }
  });
  el('reveal').addEventListener('click', async () => {
    el('reveal').disabled = true; el('close').disabled = true;
    try { await native('revealDesktop', { token }); }
    catch { el('status').textContent = t('无法打开文件夹，请复制文件路径手动添加。'); }
    finally { el('reveal').disabled = false; el('close').disabled = false; }
  });
  el('copyPath').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(el('filePath').value);
      el('status').textContent = t('路径已复制。请在目标聊天的添加文件对话框中粘贴并打开。');
    } catch {
      el('filePath').focus(); el('filePath').select();
      el('status').textContent = t('复制失败，路径已选中，请按 Ctrl+C 复制。');
    }
  });
  el('settings').addEventListener('click', () => messenger.runtime.openOptionsPage());
  el('close').addEventListener('click', () => window.close());
  window.addEventListener('pagehide', () => port?.disconnect());
  await preview();
})().catch(() => { document.getElementById('status').textContent = ComposeI18n.t('desktop_failed'); });
