(() => {
  let queue = Promise.resolve(), active;
  const inbox = folder => folder && (folder.type === 'inbox' || folder.specialUse?.includes('inbox'));
  async function allowed(accountId, generation) {
    const saved = await messenger.storage.local.get('autoSummaryAccounts');
    return Number.isFinite(generation) && saved.autoSummaryAccounts?.[accountId] === generation;
  }
  async function record(accountId, state, code = '') {
    await messenger.storage.local.set({ autoSummaryLast: { accountId, state, code: /^[a-z0-9_]{1,100}$/.test(code) ? code : '', time: Date.now() } });
  }
  async function reserveDailyRequest(accountId) {
    const saved = await messenger.storage.local.get(['autoSummaryDailyLimit', 'autoSummaryUsage']);
    const limit = Number.isInteger(saved.autoSummaryDailyLimit) && saved.autoSummaryDailyLimit >= 1 && saved.autoSummaryDailyLimit <= 1000 ? saved.autoSummaryDailyLimit : 100;
    const now = new Date();
    const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const usage = saved.autoSummaryUsage?.[accountId];
    const count = usage?.day === day ? usage.count : 0;
    if (!Number.isInteger(count) || count < 0 || count >= limit) throw new Error('auto_summary_limit');
    // This queue is serial. Persist before dispatch; failed/cancelled attempts still count.
    await messenger.storage.local.set({ autoSummaryUsage: { ...saved.autoSummaryUsage, [accountId]: { day, count: count + 1 } } });
  }
  async function claim(accountId, header) {
    // Store only a digest, never message content or the raw Message-ID.
    const identity = JSON.stringify([accountId, header.headerMessageId || header.id, header.date, header.size]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const saved = await messenger.storage.local.get('autoSummarySeen');
    const seen = Array.isArray(saved.autoSummarySeen) ? saved.autoSummarySeen : [];
    if (seen.includes(key)) return false;
    await messenger.storage.local.set({ autoSummarySeen: [...seen.slice(-4999), key] });
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
      const saved = await messenger.storage.local.get(['provider', 'taskModel', 'model_chatgpt', 'model_gemini', 'model_claude', 'summaryLanguage']);
      const provider = saved.provider || 'chatgpt';
      if (!['chatgpt', 'gemini', 'claude'].includes(provider)) throw new Error('invalid_provider');
      const model = saved['model_' + provider] || (provider === 'chatgpt' ? saved.taskModel : '');
      if (!model) throw new Error('model_required');
      const session = { messageId: current.id, subject: current.subject || '' };
      const text = await loadMail(session);
      if (!await allowed(accountId, generation)) return;
      channel = connection(accountId);
      const outputLanguage = await MailSummaryLanguage(saved.summaryLanguage);
      const custom = MailSummaryInstructions;
      const descriptor = { version: 2, task: 'summary', provider, model, outputLanguage, custom, text };
      const cached = await channel.request(provider, 'cacheGet', { descriptor });
      if (typeof cached.text === 'string' && cached.text.trim() && cached.text.length <= 40000 && !cached.text.includes('\u0000')) { await record(accountId, 'success'); return; }
      const status = await channel.request(provider, 'status');
      if (provider !== 'chatgpt' && status.provider !== provider) throw new Error('helper_update_required');
      if (!status.sharing) throw new Error('sign_in_required');
      // Mail filters may have moved or marked the message while the helper connected.
      const latest = await messenger.messages.get(current.id);
      if (latest.folder?.accountId !== accountId || !inbox(latest.folder) || latest.junk) return;
      if (!await allowed(accountId, generation) || channel.cancelled) return;
      await reserveDailyRequest(accountId);
      if (!await allowed(accountId, generation) || channel.cancelled) return;
      const result = await channel.request(provider, 'rewrite', { model, text, recipe: 'custom', custom, outputLanguage });
      if (channel.cancelled || !await allowed(accountId, generation)) return;
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('incomplete_response');
      if (result.text.length > 40000 || result.text.includes('\u0000')) throw new Error('invalid_rewrite_result');
      const stored = await channel.request(provider, 'cachePut', { descriptor, generation: cached.generation, text: result.text });
      if (stored.stored) await record(accountId, 'success');
    } catch (error) {
      if (!channel?.cancelled) await record(accountId, 'failed', error.message);
    } finally { channel?.close(); }
  }
  async function receive(folder, page, snapshot) {
    if (!inbox(folder)) return;
    const generation = snapshot.autoSummaryAccounts?.[folder.accountId];
    if (!Number.isFinite(generation)) return;
    while (page) {
      for (const header of page.messages || []) await process(folder.accountId, generation, header);
      if (!page.id || !await allowed(folder.accountId, generation)) break;
      page = await messenger.messages.continueList(page.id);
    }
  }
  messenger.messages.onNewMailReceived.addListener((folder, page) => {
    // Capture eligibility at receipt; enabling later must not process an old event.
    const snapshot = messenger.storage.local.get('autoSummaryAccounts');
    queue = queue.then(async () => receive(folder, page, await snapshot)).catch(() => {});
    return queue;
  });
  messenger.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.autoSummaryAccounts && active) {
      const before = changes.autoSummaryAccounts.oldValue?.[active.accountId];
      const after = changes.autoSummaryAccounts.newValue?.[active.accountId];
      if (before !== after) { active.cancelled = true; active.close(); }
    }
  });
  async function clearAccount(id) {
    const saved = await messenger.storage.local.get(['autoSummaryAccounts', 'autoSummaryUsage']);
    const next = { ...saved.autoSummaryAccounts }; delete next[id];
    const usage = { ...saved.autoSummaryUsage }; delete usage[id];
    await messenger.storage.local.set({ autoSummaryAccounts: next, autoSummaryUsage: usage });
  }
  messenger.accounts.onCreated.addListener(id => clearAccount(id));
  messenger.accounts.onDeleted.addListener(id => clearAccount(id));
})();
