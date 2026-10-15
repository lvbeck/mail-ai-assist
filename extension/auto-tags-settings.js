(async () => {
  await ComposeI18n.initialize();
  const dailyLimit = document.getElementById('autoSummaryDailyLimit');
  dailyLimit.addEventListener('input', () => dailyLimit.setCustomValidity(''));
  dailyLimit.addEventListener('change', async () => {
    const value = dailyLimit.valueAsNumber;
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      dailyLimit.setCustomValidity(ComposeI18n.t('请输入 1 到 1000 之间的整数。'));
      dailyLimit.reportValidity(); return;
    }
    try { await messenger.storage.local.set({ autoSummaryDailyLimit: value }); }
    catch { document.getElementById('autoSummaryStatus').textContent = ComposeI18n.t('操作失败'); }
  });
  async function render() {
    const saved = await messenger.storage.local.get(['autoTagLast', 'autoSummaryLast', 'autoSummaryDailyLimit']);
    if (document.activeElement !== dailyLimit) dailyLimit.value = Number.isInteger(saved.autoSummaryDailyLimit) && saved.autoSummaryDailyLimit >= 1 && saved.autoSummaryDailyLimit <= 1000 ? saved.autoSummaryDailyLimit : 100;
    const summary = saved.autoSummaryLast;
    const summaryStatus = summary?.code === 'auto_summary_limit' ? '今日自动摘要已达上限，可手动生成摘要或等待新一天的新邮件。' : summary?.state === 'success' ? '最近自动摘要处理成功。' : '最近自动摘要处理失败，请检查设置或手动重试。';
    document.getElementById('autoSummaryStatus').textContent = summary ? `${ComposeI18n.t(summaryStatus)} ${new Date(summary.time).toLocaleString(document.documentElement.lang)}${summary.code ? ` (${summary.code})` : ''}` : '';
    const last = saved.autoTagLast;
    const status = document.getElementById('autoTagStatus');
    status.textContent = last ? `${ComposeI18n.t(last.state === 'success' ? '最近自动标签处理成功。' : '最近自动标签处理失败，请检查设置或手动重试。')} ${new Date(last.time).toLocaleString(document.documentElement.lang)}${last.code ? ` (${last.code})` : ''}` : '';
  }
  const refresh = () => render().catch(() => { document.getElementById('autoTagStatus').textContent = ComposeI18n.t('操作失败'); });
  messenger.accounts.onCreated.addListener(refresh);
  messenger.accounts.onDeleted.addListener(refresh);
  messenger.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.autoTagAccounts || changes.autoTagLast || changes.autoSummaryAccounts || changes.autoSummaryLast || changes.autoSummaryDailyLimit)) refresh(); });
  window.addEventListener('compose-language-changed', refresh);
  refresh();
})();
