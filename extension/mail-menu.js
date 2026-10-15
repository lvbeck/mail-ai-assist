(async () => {
  await ComposeI18n.initialize();
  const saved = await messenger.storage.local.get(['translationLanguage', 'translationSourceLanguage']);
  const names = { en: 'English', de: 'Deutsch', fr: 'Français', it: 'Italiano', es: 'Español', pt: 'Português (Portugal)', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ja: '日本語', ko: '한국어' };
  document.getElementById('targetLanguage').textContent = `${Object.hasOwn(names, saved.translationSourceLanguage) ? names[saved.translationSourceLanguage] : ComposeI18n.t('自动识别原文')} → ${names[saved.translationLanguage] || names.en}`;
  const [tab] = await messenger.tabs.query({ active: true, currentWindow: true });
  for (const button of document.querySelectorAll('[data-task]')) button.addEventListener('click', async () => {
    document.querySelectorAll('button').forEach(item => { item.disabled = true; });
    try {
      const result = await messenger.runtime.sendMessage({ scope: 'mail-ai', action: 'open', task: button.dataset.task, tabId: tab?.id });
      if (!result?.ok) throw new Error(result?.error || 'mail_operation_failed');
      window.close();
    } catch (error) {
      document.getElementById('status').textContent = ComposeI18n.t(error.message);
      document.querySelectorAll('button').forEach(item => { item.disabled = false; });
    }
  });
  document.getElementById('settings').addEventListener('click', () => messenger.runtime.openOptionsPage().then(() => window.close()));
})().catch(() => { document.getElementById('status').textContent = ComposeI18n.t('mail_operation_failed'); });
