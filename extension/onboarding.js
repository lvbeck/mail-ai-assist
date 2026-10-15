// Explain the native helper dependency on first installation only.
messenger.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') messenger.runtime.openOptionsPage().catch(() => {});
});
