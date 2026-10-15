const mailSessions = new Map();
let tagQueue = Promise.resolve();
function plainHtml(html) {
  return MailContent.fragmentText(MailContent.htmlFragment(html));
}
async function loadMail(session) {
  if (session.text) return session.text;
  const full = await messenger.messages.getFull(session.messageId);
  const body = MailContent.extract(full, plainHtml).trim();
  if (!body) throw new Error('empty_mail');
  const text = `Subject: ${session.subject}\n\n${body}`;
  if (text.length > 20000) throw new Error('mail_too_long');
  session.text = text;
  return text;
}
async function applyMailTags(session, text) {
  if (session.applied) return { names: session.names };
  const names = MailContent.parseTags(text);
  const existing = await messenger.messages.listTags();
  const keys = [];
  // Validate the original message before creating any global tag definitions.
  await messenger.messages.get(session.messageId);
  for (const name of names) {
    const known = existing.find(tag => tag.tag.normalize('NFKC').toLowerCase() === name.normalize('NFKC').toLowerCase());
    const key = known?.key || `mailai-${crypto.randomUUID()}`;
    if (!known) await messenger.messages.createTag(key, name, '#7856D8');
    keys.push(key);
  }
  const current = await messenger.messages.get(session.messageId);
  const original = current.tags || [];
  session.added = keys.filter(key => !original.includes(key));
  await messenger.messages.update(session.messageId, { tags: [...new Set([...original, ...keys])] });
  session.applied = true;
  session.names = names;
  return { names };
}
async function openMailSession(header, task) {
  const key = crypto.randomUUID();
  const session = { messageId: header.id, subject: header.subject || '', task: task };
  mailSessions.set(key, session);
  try {
    const popup = await messenger.windows.create({ url: messenger.runtime.getURL(`${task === 'send' ? 'send-ai' : 'mail-reader'}.html?key=${key}`), type: 'popup', width: 760, height: 780 });
    session.windowId = popup.id;
  } catch (error) { mailSessions.delete(key); throw error; }
}
messenger.runtime.onMessage.addListener((message, sender) => {
  if (message?.scope !== 'mail-ai') return;
  const isMenu = sender.url === messenger.runtime.getURL('mail-menu.html');
  const isSend = sender.url?.startsWith(messenger.runtime.getURL('send-ai.html?'));
  const isReader = sender.url?.startsWith(messenger.runtime.getURL('mail-reader.html?'));
  if (!isMenu && !isReader && !isSend) return;
  return (async () => {
    try {
      if (isMenu && message.action === 'open' && ['summary', 'translate', 'tags', 'send'].includes(message.task)) {
        const header = await messenger.messageDisplay.getDisplayedMessage(message.tabId);
        if (!header) throw new Error('select_mail');
        await openMailSession(header, message.task);
        return { ok: true };
      }
      const session = mailSessions.get(message.key);
      if ((!isReader && !isSend) || !session || new URL(sender.url).searchParams.get('key') !== message.key) throw new Error('expired_mail');
      if (isSend) {
        if (session.task !== 'send' || !['export', 'raw'].includes(message.action)) throw new Error('expired_mail');
        if (message.action === 'raw') {
          if (!Number.isSafeInteger(message.offset) || message.offset < 0) throw new Error('expired_mail');
          if (!session.rawFile) session.rawFile = await messenger.messages.getRaw(session.messageId, { data_format: 'File', decrypt: false });
          const file = session.rawFile;
          if (message.offset >= file.size) throw new Error('empty_mail');
          const bytes = new Uint8Array(await file.slice(message.offset, message.offset + 65536).arrayBuffer());
          let binary = '';
          for (const byte of bytes) binary += String.fromCharCode(byte);
          return { ok: true, base64: btoa(binary), size: file.size, end: message.offset + bytes.length };
        }
        if (message.format === 'eml') {
          const header = await messenger.messages.get(session.messageId);
          return { ok: true, mail: { exportIdentity: JSON.stringify([header.headerMessageId || '', header.author || '', header.date || '', header.subject || '', header.size || 0, header.headerMessageId ? '' : header.id]), subject: header.subject || '', from: header.author || '', to: (header.recipients || []).join(', '), date: header.date ? new Date(header.date).toISOString() : '', body: '' } };
        }
        const full = await messenger.messages.getFull(session.messageId);
        const header = await messenger.messages.get(session.messageId);
        const body = MailExport.extract(full, message.includeQuotes === true, (html, include) => {
          const doc = MailContent.htmlFragment(html);
          if (!include) doc.querySelectorAll('blockquote[type="cite"],.gmail_quote,.moz-forward-container,.moz-cite-prefix,#divRplyFwdMsg').forEach(node => {
            if (node.id === 'divRplyFwdMsg') { while (node.nextSibling) node.nextSibling.remove(); }
            node.remove();
          });
          const text = MailContent.fragmentText(doc);
          return include ? text : MailExport.stripQuotes(text);
        }).trim();
        if (!body) throw new Error(message.includeQuotes === true ? 'empty_mail' : 'export_filtered_empty');
        const mail = { exportIdentity: JSON.stringify([header.headerMessageId || '', header.author || '', header.date || '', header.subject || '', header.size || 0, header.headerMessageId ? '' : header.id]), subject: header.subject || '', from: header.author || '', to: (header.recipients || []).join(', '), date: header.date ? new Date(header.date).toISOString() : '', body };
        if (new TextEncoder().encode(JSON.stringify(mail)).length > 180000) throw new Error('mail_too_long');
        return { ok: true, mail };
      }
      if (session.task === 'send') throw new Error('expired_mail');
      if (message.action === 'load') return { ok: true, task: session.task, subject: session.subject, text: await loadMail(session), existingTags: session.task === 'tags' ? await messenger.messages.listTags() : [], tagAliases: session.task === 'tags' ? (await messenger.storage.local.get('tagAliases')).tagAliases || [] : [] };
      if (message.action === 'tags' && session.task === 'tags') {
        const operation = tagQueue.then(() => applyMailTags(session, message.text));
        tagQueue = operation.catch(() => {});
        return { ok: true, ...await operation };
      }
      if (message.action === 'undo' && session.applied) {
        const operation = tagQueue.then(async () => {
          const current = await messenger.messages.get(session.messageId);
          await messenger.messages.update(session.messageId, { tags: (current.tags || []).filter(key => !session.added.includes(key)) });
          session.applied = false;
        });
        tagQueue = operation.catch(() => {});
        await operation;
        return { ok: true };
      }
      throw new Error('expired_mail');
    } catch (error) {
      const known = ['export_filtered_empty', 'empty_mail', 'mail_too_long', 'select_mail', 'expired_mail', 'invalid_tags'];
      return { ok: false, error: known.includes(error.message) ? error.message : 'mail_operation_failed' };
    }
  })();
});
messenger.windows.onRemoved.addListener(windowId => {
  for (const [key, session] of mailSessions) if (session.windowId === windowId) mailSessions.delete(key);
});

let messageMenuEpoch = 0;
function singleContextMessage(info) {
  const list = info.selectedMessages;
  return !list?.id && list?.messages?.length === 1 ? list.messages[0] : null;
}
messenger.menus.onShown.addListener(async info => {
  if (!info.contexts?.includes('message_list')) return;
  const epoch = ++messageMenuEpoch;
  await messenger.menus.update('message-ai', { enabled: Boolean(singleContextMessage(info)) });
  if (epoch === messageMenuEpoch) await messenger.menus.refresh();
});
messenger.menus.onHidden.addListener(() => { messageMenuEpoch++; });
messenger.menus.onClicked.addListener(async info => {
  if (info.menuItemId === 'message-ai-settings') {
    await messenger.runtime.openOptionsPage();
    return;
  }
  const task = { 'message-ai-summary': 'summary', 'message-ai-translate': 'translate', 'message-ai-tags': 'tags', 'message-ai-send': 'send' }[info.menuItemId];
  if (!task) return;
  const header = singleContextMessage(info);
  if (!header) return;
  // Use the context-clicked message, never the reading pane's current message.
  try { await openMailSession(header, task); }
  catch (error) { console.error('Unable to open AI mail window', error); }
});
