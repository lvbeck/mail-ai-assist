(async () => {
  await ComposeI18n.initialize();
  const choice = document.getElementById('translationService');
  const field = document.getElementById('translationKey');
  const region = document.getElementById('azureRegion');
  const state = document.getElementById('translationStatus');
  const save = document.getElementById('translationSave'), remove = document.getElementById('translationRemove');
  let selected = 'none', configured = false, busy = true, error = '';
  function render() {
    document.getElementById('translationCredentials').hidden = selected === 'none';
    document.getElementById('azureRegionField').hidden = selected !== 'azure';
    document.getElementById('translationConsole').href = { google: 'https://console.cloud.google.com/apis/library/translate.googleapis.com', azure: 'https://portal.azure.com/', deepl: 'https://www.deepl.com/your-account/keys' }[selected] || '#';
    state.textContent = ComposeI18n.t(error || (configured ? '所选翻译服务商已配置，将优先使用。' : '未选择或未配置翻译服务商，使用当前 AI 模型。'));
    choice.disabled = busy; save.disabled = busy || !field.value.trim(); remove.disabled = busy || !configured; field.disabled = busy; region.disabled = busy;
  }
  function request(action) {
    return new Promise((resolve, reject) => {
      const port = messenger.runtime.connectNative('local.mail_ai_assist');
      const timer = setTimeout(() => { reject(new Error('translation_failed')); port.disconnect(); }, 60000);
      port.onMessage.addListener(message => {
        if (message.event) return;
        clearTimeout(timer);
        message.ok ? resolve(message.result) : reject(new Error(message.error?.code || 'translation_failed'));
        port.disconnect();
      });
      port.onDisconnect.addListener(() => { clearTimeout(timer); reject(new Error('translation_failed')); });
      port.postMessage({ id: 1, action, service: selected, ...(action === 'translationSave' ? { apiKey: field.value.trim(), region: region.value.trim() } : {}) });
    });
  }
  async function operate(action) {
    busy = true; error = ''; render();
    try {
      const result = selected === 'none' ? { configured: false } : await request(action);
      configured = result.configured;
      if (selected === 'azure') region.value = result.region || '';
      field.value = '';
    } catch (failure) { error = ['translation_access', 'translation_quota', 'google_access', 'google_quota', 'invalid_api_key'].includes(failure.message) ? failure.message : 'translation_failed'; }
    finally { busy = false; render(); }
  }
  choice.addEventListener('change', async () => {
    busy = true; render();
    try {
      const next = choice.value;
      await messenger.storage.local.set({ translationService: next });
      selected = next; configured = false; field.value = ''; region.value = '';
      await operate('translationStatus');
    } catch { choice.value = selected; error = 'translation_failed'; }
    finally { busy = false; render(); }
  });
  save.addEventListener('click', () => operate('translationSave'));
  remove.addEventListener('click', () => operate('translationRemove'));
  field.addEventListener('input', render);
  window.addEventListener('compose-language-changed', render);
  render();
  messenger.storage.local.get('translationService').then(saved => {
    selected = ['google', 'azure', 'deepl'].includes(saved.translationService) ? saved.translationService : 'none';
    choice.value = selected;
    return operate('translationStatus');
  }).catch(() => { busy = false; error = 'translation_failed'; render(); });
})();
