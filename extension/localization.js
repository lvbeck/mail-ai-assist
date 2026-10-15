(() => {
  const locales = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'];
  let locale = 'en';
  let initialization;
  let automaticLocale = 'en';
  let staticText = [];
  let attributes = [];
  function matchLocale(value) {
    const tag = String(value || '').replace(/_/g, '-').toLowerCase();
    if (/^en(?:-|$)/.test(tag)) return 'en';
    if (/^de(?:-|$)/.test(tag)) return 'de';
    const european = /^(fr|it|es|pt|ja|ko)(?:-|$)/.exec(tag);
    if (european) return european[1];
    if (/^zh(?:-|$)/.test(tag)) {
      if (tag.includes('-hans')) return 'zh-CN';
      return /-(hant|tw|hk|mo)(?:-|$)/.test(tag) ? 'zh-TW' : 'zh-CN';
    }
    return null;
  }
  function resolveLocale(preference, thunderbird, system = []) {
    return locales.includes(preference) ? preference : matchLocale(thunderbird) || system.map(matchLocale).find(Boolean) || 'en';
  }
  function t(key, values = {}) {
    let text = globalThis.ComposeTranslations[locale]?.[key] || globalThis.ComposeTranslations.en[key] || key;
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  }
  function capturePage() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script,style,textarea,#account,#status,#count,#model,#providerNote,#autoTagAccounts,#autoTagStatus,#autoSummaryStatus,#translationStatus,#cacheStatus,#cachePath,#exportDirectoryStatus,#exportDirectorySize,#aliasStatus,#aliasRules,#aliasTarget')) continue;
      const key = node.textContent.trim();
      if (globalThis.ComposeTranslations.en[key]) staticText.push({ node, key });
    }
    attributes = [...document.querySelectorAll('[placeholder]')].map((element) => ({ element, key: element.getAttribute('placeholder') }));
  }
  function render() {
    document.documentElement.lang = locale;
    document.title = `${t('邮箱 AI 助手')} · ${t(document.body.dataset.page === 'settings' ? '设置' : '改写选中文字')}`;
    for (const { node, key } of staticText) node.textContent = t(key);
    for (const { element, key } of attributes) element.setAttribute('placeholder', t(key));
  }
  function initialize() {
    return initialization ||= initializePage();
  }
  async function initializePage() {
    const saved = await messenger.storage.local.get(['uiLanguage', 'outputLanguage']);
    let thunderbird;
    let system = navigator.languages || [navigator.language];
    try { thunderbird = await messenger.i18n.getUILanguage(); } catch { /* Use system preference. */ }
    try {
      if (messenger.i18n.getPreferredSystemLanguages) system = await messenger.i18n.getPreferredSystemLanguages();
    } catch { /* Fall back to navigator languages. */ }
    automaticLocale = resolveLocale('auto', thunderbird, system);
    const preference = locales.includes(saved.uiLanguage) ? saved.uiLanguage : 'auto';
    locale = preference === 'auto' ? automaticLocale : preference;
    if (document.getElementById('uiLanguage')) document.getElementById('uiLanguage').value = preference;
    if (document.getElementById('language')) document.getElementById('language').value = locales.includes(saved.outputLanguage) ? saved.outputLanguage : 'en';
    capturePage(); render();
    window.dispatchEvent(new Event('compose-language-changed'));
  }
  async function setInterface(preference) {
    const valid = locales.includes(preference) ? preference : 'auto';
    await messenger.storage.local.set({ uiLanguage: valid });
    locale = valid === 'auto' ? automaticLocale : valid;
    render();
  }
  async function setOutput(value) {
    if (!locales.includes(value)) throw new Error('Unsupported output language.');
    await messenger.storage.local.set({ outputLanguage: value });
  }
  globalThis.messenger?.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.uiLanguage) {
      locale = locales.includes(changes.uiLanguage.newValue) ? changes.uiLanguage.newValue : automaticLocale;
      if (document.getElementById('uiLanguage')) document.getElementById('uiLanguage').value = changes.uiLanguage.newValue || 'auto';
      render();
      window.dispatchEvent(new Event('compose-language-changed'));
    }
  });
  globalThis.ComposeI18n = { t, initialize, setInterface, setOutput, matchLocale, resolveLocale };
})();
