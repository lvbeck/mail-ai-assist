(async () => {
  await ComposeI18n.initialize();
  const el = id => document.getElementById(id);
  let tags = [], rules = [], status = '', busy = false;
  const errors = { alias_target: '请选择已有标签。', alias_invalid: '别名格式无效：每个最多 32 个字符，每个标签最多 100 个别名。', alias_conflict: '此别名已用于其他标签，请先移除冲突规则。' };
  function render() {
    for (const option of el('aliasTarget').options) {
      if (!tags.some(tag => tag.key === option.value)) option.textContent = `${ComposeI18n.t('目标标签已删除')} (${option.value})`;
    }
    el('aliasStatus').textContent = ComposeI18n.t(status);
    el('aliasRules').replaceChildren();
    for (const rule of rules) {
      const target = tags.find(tag => tag.key === rule.tagKey);
      const item = document.createElement('li');
      item.textContent = `${target?.tag || ComposeI18n.t('目标标签已删除')} ← ${Array.isArray(rule.aliases) ? rule.aliases.join(', ') : ''}`;
      el('aliasRules').append(item);
    }
    ['aliasTarget', 'aliasNames', 'aliasSave', 'aliasRemove'].forEach(id => { el(id).disabled = busy || !el('aliasTarget').value; });
    el('aliasRefresh').disabled = busy;
  }
  function select() {
    el('aliasNames').value = rules.find(rule => rule.tagKey === el('aliasTarget').value)?.aliases?.join('\n') || '';
  }
  async function refresh() {
    busy = true; render();
    try {
      const selected = el('aliasTarget').value;
      tags = (await messenger.messages.listTags()).filter(tag => MailTagPolicy.names([tag]).length);
      const saved = (await messenger.storage.local.get('tagAliases')).tagAliases;
      rules = Array.isArray(saved) ? saved.filter(rule => rule && typeof rule.tagKey === 'string') : [];
      el('aliasTarget').replaceChildren();
      for (const tag of tags) {
        const option = document.createElement('option'); option.value = tag.key; option.textContent = tag.tag;
        el('aliasTarget').append(option);
      }
      for (const rule of rules.filter(rule => !tags.some(tag => tag.key === rule.tagKey))) {
        const option = document.createElement('option'); option.value = rule.tagKey; option.textContent = `${ComposeI18n.t('目标标签已删除')} (${rule.tagKey})`;
        el('aliasTarget').append(option);
      }
      if (tags.some(tag => tag.key === selected) || rules.some(rule => rule.tagKey === selected)) el('aliasTarget').value = selected;
      select(); status = tags.length ? '' : '请先在 Thunderbird 中创建标签。';
    } catch { status = '标签别名操作失败，请重试。'; }
    finally { busy = false; render(); }
  }
  async function save(remove = false) {
    if (busy) return;
    busy = true; render();
    try {
      const latestTags = await messenger.messages.listTags();
      const saved = (await messenger.storage.local.get('tagAliases')).tagAliases;
      const next = remove ? (Array.isArray(saved) ? saved : []).filter(rule => rule?.tagKey !== el('aliasTarget').value) : MailTagPolicy.saveRule(saved, latestTags, el('aliasTarget').value, el('aliasNames').value);
      await messenger.storage.local.set({ tagAliases: next });
      rules = next; tags = latestTags; select(); status = '别名规则已保存。';
    } catch (error) { status = errors[error.message] || '标签别名操作失败，请重试。'; }
    finally { busy = false; render(); }
  }
  el('aliasTarget').addEventListener('change', select);
  el('aliasSave').addEventListener('click', () => save());
  el('aliasRemove').addEventListener('click', () => save(true));
  el('aliasRefresh').addEventListener('click', refresh);
  window.addEventListener('compose-language-changed', render);
  refresh();
})();
