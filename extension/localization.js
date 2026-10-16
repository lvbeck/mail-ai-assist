(() => {
  const locales = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'];
  let locale = 'en';
  let platform = '';
  const macKeys = {"需要单独安装 Windows x64 辅助程序（MSI）。下载后手动安装，重启 Thunderbird，再登录或填写 API Key。": "macHelperSetup", "本地辅助程序未连接。请在设置页下载并安装 Windows x64 MSI，然后重启 Thunderbird。": "macHelperUnavailable", "请安装新版辅助程序 MSI，然后重启 Thunderbird。": "macHelperUpgrade", "应用程序路径（.exe）": "macApplicationPath", "Thunderbird 管理插件更新；辅助程序仍使用独立更新机制。已安装本插件时，无需再次安装 MSI 中附带的 XPI。": "macUpdateChannel", "辅助程序更新已下载。点击安装后，请关闭 Thunderbird，再确认管理员授权。": "macUpdateReady", "请关闭 Thunderbird，随后确认管理员授权以安装更新。": "macUpdateInstall"};
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
    if (platform === 'mac') key = macKeys[key] || key;
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
    try { platform = (await messenger.runtime.getPlatformInfo()).os; } catch { /* Keep the existing Windows copy when unavailable. */ }
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
