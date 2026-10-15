(() => {
  const labels = { en: 'Writing Assistant', de: 'Schreibhilfe', fr: 'Aide à la rédaction', it: 'Assistente di scrittura', es: 'Asistente de escritura', pt: 'Assistente de escrita', 'zh-CN': '辅助写作', 'zh-TW': '輔助寫作', ja: '文章作成アシスタント', ko: '글쓰기 도우미' };
  let menusCreated = false;
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
  async function update() {
    const saved = await messenger.storage.local.get('uiLanguage');
    let locale = Object.hasOwn(labels, saved.uiLanguage) ? saved.uiLanguage : null;
    if (!locale) {
      try { locale = matchLocale(await messenger.i18n.getUILanguage()); } catch { /* Use system preference. */ }
      if (!locale) {
        let languages = navigator.languages || [navigator.language];
        try { languages = await messenger.i18n.getPreferredSystemLanguages(); } catch { /* Use navigator languages. */ }
        locale = languages.map(matchLocale).find(Boolean) || 'en';
      }
    }
    globalThis.MailUiLocale = locale;
    const assistant = { en: 'AI Assist', de: 'KI-Assistent', fr: 'Assistant IA', it: 'Assistente IA', es: 'Asistente IA', pt: 'Assistente IA', 'zh-CN': 'AI 助手', 'zh-TW': 'AI 助手', ja: 'AI アシスタント', ko: 'AI 도우미' }[locale];
    await messenger.composeAction.setLabel({ label: assistant });
    await messenger.composeAction.setTitle({ title: assistant });
    const settings = { en: 'Settings', de: 'Einstellungen', fr: 'Paramètres', it: 'Impostazioni', es: 'Configuración', pt: 'Definições', 'zh-CN': '设置', 'zh-TW': '設定', ja: '設定', ko: '설정' }[locale];
    const mailTasks = {
      summary: { en: 'AI Summary', de: 'KI-Zusammenfassung', fr: 'Résumé IA', it: 'Riepilogo IA', es: 'Resumen IA', pt: 'Resumo IA', 'zh-CN': 'AI 摘要', 'zh-TW': 'AI 摘要', ja: 'AI 要約', ko: 'AI 요약' },
      translate: {"en": "Translate email", "de": "E-Mail übersetzen", "fr": "Traduire le message", "it": "Traduci email", "es": "Traducir correo", "pt": "Traduzir mensagem", "zh-CN": "翻译邮件", "zh-TW": "翻譯郵件", "ja": "メールを翻訳", "ko": "메일 번역"},
      tags: { en: 'AI Auto-tag', de: 'KI-Tags hinzufügen', fr: 'Étiquettes IA', it: 'Etichette IA', es: 'Etiquetas IA', pt: 'Etiquetas IA', 'zh-CN': 'AI 自动添加标签', 'zh-TW': 'AI 自動新增標籤', ja: 'AI 自動タグ付け', ko: 'AI 자동 태그 지정' },
      send: {"en": "Export email", "de": "E-Mail exportieren", "fr": "Exporter le message", "it": "Esporta email", "es": "Exportar correo", "pt": "Exportar mensagem", "zh-CN": "导出邮件", "zh-TW": "匯出郵件", "ja": "メールをエクスポート", "ko": "메일 내보내기"}
    };
    const autoTag = { en: 'Automatically tag new mail', de: 'Neue E-Mails automatisch verschlagworten', fr: 'Étiqueter automatiquement les nouveaux messages', it: 'Etichetta automaticamente i nuovi messaggi', es: 'Etiquetar automáticamente los mensajes nuevos', pt: 'Etiquetar automaticamente novas mensagens', 'zh-CN': '自动标记新邮件', 'zh-TW': '自動標記新郵件', ja: '新着メールの自動タグ付け', ko: '새 메일 자동 태그 지정' }[locale];
    const autoSummary = { en: 'Automatically summarize new mail with AI', de: 'Neue E-Mails automatisch mit KI zusammenfassen', fr: 'Résumer automatiquement les nouveaux messages avec l’IA', it: 'Riepiloga automaticamente i nuovi messaggi con IA', es: 'Resumir automáticamente los mensajes nuevos con IA', pt: 'Resumir automaticamente novas mensagens com IA', 'zh-CN': '自动为新邮件生成 AI 摘要', 'zh-TW': '自動為新郵件產生 AI 摘要', ja: '新着メールを AI で自動要約', ko: '새 메일을 AI로 자동 요약' }[locale];
    if (!menusCreated) {
      messenger.menus.create({ id: 'compose-ai-write', title: labels[locale], contexts: ['compose_action_menu'], icons: { 16: 'write.svg' } });
      messenger.menus.create({ id: 'compose-ai-separator', type: 'separator', contexts: ['compose_action_menu'] });
      messenger.menus.create({ id: 'compose-ai-settings', title: settings, contexts: ['compose_action_menu'], icons: { 16: 'settings.svg' } });
      messenger.menus.create({ id: 'account-ai', title: assistant, contexts: ['folder_pane'], visible: false, icons: { 16: 'icon-menu.svg' } });
      messenger.menus.create({ id: 'account-ai-auto-tags', parentId: 'account-ai', title: autoTag, type: 'checkbox', checked: false, contexts: ['folder_pane'] });
      messenger.menus.create({ id: 'account-ai-auto-summary', parentId: 'account-ai', title: autoSummary, type: 'checkbox', checked: false, contexts: ['folder_pane'] });
      messenger.menus.create({ id: 'message-ai', title: assistant, contexts: ['message_list'], enabled: false, icons: { 16: 'icon-menu.svg' } });
      for (const [task, titles] of Object.entries(mailTasks)) messenger.menus.create({ id: `message-ai-${task}`, parentId: 'message-ai', title: titles[locale], contexts: ['message_list'], icons: { 16: `${task === 'tags' ? 'tag' : task}.svg` } });
      messenger.menus.create({ id: 'message-ai-separator', parentId: 'message-ai', type: 'separator', contexts: ['message_list'] });
      messenger.menus.create({ id: 'message-ai-settings', parentId: 'message-ai', title: settings, contexts: ['message_list'], icons: { 16: 'settings.svg' } });
      menusCreated = true;
    } else {
      await messenger.menus.update('account-ai', { title: assistant });
      await messenger.menus.update('message-ai', { title: assistant });
      for (const [task, titles] of Object.entries(mailTasks)) await messenger.menus.update(`message-ai-${task}`, { title: titles[locale] });
      await messenger.menus.update('account-ai-auto-tags', { title: autoTag });
      await messenger.menus.update('account-ai-auto-summary', { title: autoSummary });
      await messenger.menus.update('compose-ai-write', { title: labels[locale] });
      await messenger.menus.update('compose-ai-settings', { title: settings });
      await messenger.menus.update('message-ai-settings', { title: settings });
    }
    await messenger.messageDisplayAction.setLabel({ label: assistant });
    await messenger.messageDisplayAction.setTitle({ title: assistant });
  }
  // Serialize updates so a slower startup cannot overwrite a newer preference.
  let pending = Promise.resolve();
  function schedule() { pending = pending.then(update).catch(() => {}); return pending; }
  messenger.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.uiLanguage) return schedule();
  });
  schedule();
})();
