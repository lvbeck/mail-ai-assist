(async () => {
  await ComposeI18n.initialize();
  const state = document.getElementById('cacheStatus');
  const buttons = ['cacheOpen', 'cacheClear', 'cacheRefresh'].map(id => document.getElementById(id));
  let stats, error = false;
  let port, sequence = 0;
  const pending = new Map();
  function disconnect() {
    const previous = port;
    port = null;
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error('helper_unavailable')); }
    pending.clear();
    previous?.disconnect();
  }
  function render() {
    state.textContent = error ? ComposeI18n.t('缓存操作失败，请检查本地辅助程序。') : stats ? `${ComposeI18n.t('缓存条目')}: ${stats.count} · ${(stats.bytes / 1024).toFixed(1)} KB` : '';
    document.getElementById('cachePath').textContent = stats?.path || '';
  }
  function request(action) {
    return new Promise((resolve, reject) => {
      if (!port) {
        port = messenger.runtime.connectNative('local.mail_ai_assist');
        port.onMessage.addListener(message => {
          const task = pending.get(message.id);
          if (!task || message.event) return;
          clearTimeout(task.timer); pending.delete(message.id);
          message.ok ? task.resolve(message.result) : task.reject(new Error('cache_failed'));
        });
        port.onDisconnect.addListener(() => {
          port = null;
          for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error('helper_unavailable')); }
          pending.clear();
        });
      }
      const id = ++sequence;
      const timer = setTimeout(disconnect, 60000);
      pending.set(id, { resolve, reject, timer });
      try { port.postMessage({ id, action }); }
      catch { clearTimeout(timer); pending.delete(id); reject(new Error('helper_unavailable')); }
    });
  }
  async function operate(action) {
    buttons.forEach(button => { button.disabled = true; });
    try {
      const result = await request(action);
      stats = action === 'cacheOpen' ? await request('cacheStats') : result;
      error = false;
    } catch { error = true; }
    finally { render(); buttons.forEach(button => { button.disabled = false; }); }
  }
  buttons.forEach(button => button.addEventListener('click', () => operate(button.id === 'cacheRefresh' ? 'cacheStats' : button.id)));
  window.addEventListener('compose-language-changed', render);
  window.addEventListener('pagehide', disconnect);
  operate('cacheStats');
})();
