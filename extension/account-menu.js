(() => {
  let epoch = 0, writes = Promise.resolve();
  async function accountFor(info) {
    const folders = info.selectedFolders;
    if (folders?.length > 1) return null;
    const folder = folders?.[0] || info.selectedFolder;
    if (folder && (!folder.isRoot || folder.isUnified || folder.isVirtual)) return null;
    const id = folder?.accountId || info.selectedAccount?.id;
    if (!id) return null;
    const account = await messenger.accounts.get(id, false);
    return account && ['imap', 'pop3'].includes(account.type) ? account : null;
  }
  messenger.menus.onShown.addListener(async info => {
    const current = ++epoch;
    try {
      const account = await accountFor(info);
      const saved = await messenger.storage.local.get(['autoTagAccounts', 'autoSummaryAccounts']);
      if (current !== epoch) return;
      await messenger.menus.update('account-ai', { visible: Boolean(account) });
      await messenger.menus.update('account-ai-auto-tags', { checked: Boolean(account && Number.isFinite(saved.autoTagAccounts?.[account.id])) });
      await messenger.menus.update('account-ai-auto-summary', { checked: Boolean(account && Number.isFinite(saved.autoSummaryAccounts?.[account.id])) });
      await messenger.menus.refresh();
    } catch {
      if (current === epoch) {
        await messenger.menus.update('account-ai', { visible: false }).catch(() => {});
        await messenger.menus.refresh().catch(() => {});
      }
    }
  });
  messenger.menus.onHidden.addListener(() => { epoch++; });
  messenger.menus.onClicked.addListener(info => {
    if (!['account-ai-auto-tags', 'account-ai-auto-summary'].includes(info.menuItemId)) return;
    const preference = info.menuItemId === 'account-ai-auto-summary' ? 'autoSummaryAccounts' : 'autoTagAccounts';
    // Resolve the clicked account, not the last shown menu or active mail tab.
    const requested = Boolean(info.checked);
    writes = writes.then(async () => {
      const account = await accountFor(info);
      if (!account) return;
      const saved = await messenger.storage.local.get(preference);
      const next = { ...saved[preference] };
      if (requested) {
        if (!Number.isFinite(next[account.id])) next[account.id] = Date.now();
      } else delete next[account.id];
      await messenger.storage.local.set({ [preference]: next });
    }).catch(async () => {
      await messenger.storage.local.set({ [preference === 'autoSummaryAccounts' ? 'autoSummaryLast' : 'autoTagLast']: { state: 'failed', code: 'settings_save_failed', time: Date.now() } }).catch(() => {});
    });
    return writes;
  });
})();
