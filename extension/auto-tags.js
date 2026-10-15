(() => {
  let queue = Promise.resolve(), active;
  const inbox = folder => folder && (folder.type === 'inbox' || folder.specialUse?.includes('inbox'));
  async function allowed(accountId, generation) {
    const saved = await messenger.storage.local.get('autoTagAccounts');
    return Number.isFinite(generation) && saved.autoTagAccounts?.[accountId] === generation;
  }
  async function record(accountId, state, code = '') {
    await messenger.storage.local.set({ autoTagLast: { accountId, state, code: /^[a-z0-9_]{1,100}$/.test(code) ? code : '', time: Date.now() } });
  }
  async function claim(accountId, header) {
    // Store only a digest, never message content or the raw Message-ID.
    const identity = JSON.stringify([accountId, header.headerMessageId || header.id, header.date, header.size]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const saved = await messenger.storage.local.get('autoTagSeen');
    const seen = Array.isArray(saved.autoTagSeen) ? saved.autoTagSeen : [];
    if (seen.includes(key)) return false;
    await messenger.storage.local.set({ autoTagSeen: [...seen.slice(-4999), key] });
    return true;
  }
  function connection(accountId) {
    const port = messenger.runtime.connectNative('local.mail_ai_assist');
    let sequence = 0, waiting;
    const operation = { accountId, port, cancelled: false };
    active = operation;
    port.onMessage.addListener(message => {
      if (!waiting || message.id !== waiting.id || message.event) return;
      const task = waiting; waiting = null; clearTimeout(task.timer);
      message.ok ? task.resolve(message.result) : task.reject(new Error(message.error?.code || 'operation_failed'));
    });
    function reject() {
      if (waiting) { clearTimeout(waiting.timer); waiting.reject(new Error(operation.cancelled ? 'cancelled' : 'helper_unavailable')); waiting = null; }
    }
    port.onDisconnect.addListener(reject);
    operation.close = () => { reject(); port.disconnect(); if (active === operation) active = null; };
    operation.request = (provider, action, data = {}) => new Promise((resolve, rejectRequest) => {
      if (operation.cancelled) { rejectRequest(new Error('cancelled')); return; }
      const id = ++sequence;
      const timer = setTimeout(() => { if (waiting?.id === id) { waiting = null; rejectRequest(new Error('timeout')); port.disconnect(); } }, 130000);
      waiting = { id, resolve, reject: rejectRequest, timer };
      try { port.postMessage({ id, provider, action, ...data }); }
      catch { reject(); }
    });
    return operation;
  }
  async function process(accountId, generation, header) {
    if (!await allowed(accountId, generation)) return;
    let channel;
    try {
      const current = await messenger.messages.get(header.id);
      if (current.folder?.accountId !== accountId || !inbox(current.folder) || current.junk) return;
      if (!await claim(accountId, current)) return;
      const saved = await messenger.storage.local.get(['provider', 'taskModel', 'model_chatgpt', 'model_gemini', 'model_claude', 'tagLanguage', 'tagAliases']);
      const provider = saved.provider || 'chatgpt';
      if (!['chatgpt', 'gemini', 'claude'].includes(provider)) throw new Error('invalid_provider');
      const model = saved['model_' + provider] || (provider === 'chatgpt' ? saved.taskModel : '');
      if (!model) throw new Error('model_required');
      const session = { messageId: current.id, subject: current.subject || '' };
      const text = await loadMail(session);
      if (!await allowed(accountId, generation)) return;
      channel = connection(accountId);
      const status = await channel.request(provider, 'status');
      if (provider !== 'chatgpt' && status.provider !== provider) throw new Error('helper_update_required');
      if (!status.sharing) throw new Error('sign_in_required');
      if (!await allowed(accountId, generation) || channel.cancelled) return;
      const outputLanguage = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'].includes(saved.tagLanguage) ? saved.tagLanguage : 'en';
      const existingTags = await messenger.messages.listTags();
      const result = await channel.request(provider, 'rewrite', { model, text, recipe: 'custom', custom: MailTagPolicy.instructions(existingTags, text, saved.tagAliases), outputLanguage });
      if (channel.cancelled || !await allowed(accountId, generation)) return;
      const write = tagQueue.then(async () => {
        if (channel.cancelled || !await allowed(accountId, generation)) return false;
        const latest = await messenger.messages.get(current.id);
        if (latest.folder?.accountId !== accountId || !inbox(latest.folder) || latest.junk) return false;
        const tags = MailTagPolicy.resolve(MailContent.parseTags(result.text), await messenger.messages.listTags(), (await messenger.storage.local.get('tagAliases')).tagAliases);
        await applyMailTags(session, JSON.stringify(tags));
        return true;
      });
      tagQueue = write.catch(() => {});
      if (await write) await record(accountId, 'success');
    } catch (error) {
      if (!channel?.cancelled) await record(accountId, 'failed', error.message);
    } finally { channel?.close(); }
  }
  async function receive(folder, page, snapshot) {
    if (!inbox(folder)) return;
    const generation = snapshot.autoTagAccounts?.[folder.accountId];
    if (!Number.isFinite(generation)) return;
    while (page) {
      for (const header of page.messages || []) await process(folder.accountId, generation, header);
      if (!page.id || !await allowed(folder.accountId, generation)) break;
      page = await messenger.messages.continueList(page.id);
    }
  }
  messenger.messages.onNewMailReceived.addListener((folder, page) => {
    // Capture eligibility at receipt; enabling later must not process an old event.
    const snapshot = messenger.storage.local.get('autoTagAccounts');
    queue = queue.then(async () => receive(folder, page, await snapshot)).catch(() => {});
    return queue;
  });
  messenger.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.autoTagAccounts && active) {
      const before = changes.autoTagAccounts.oldValue?.[active.accountId];
      const after = changes.autoTagAccounts.newValue?.[active.accountId];
      if (before !== after) { active.cancelled = true; active.close(); }
    }
  });
  async function clearAccount(id) {
    const saved = await messenger.storage.local.get('autoTagAccounts');
    const next = { ...saved.autoTagAccounts }; delete next[id];
    await messenger.storage.local.set({ autoTagAccounts: next });
  }
  messenger.accounts.onCreated.addListener(id => clearAccount(id));
  messenger.accounts.onDeleted.addListener(id => clearAccount(id));
})();
