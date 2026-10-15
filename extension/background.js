const sessions = new Map();
const windowsByTab = new Map();
const openingTabs = new Set();

async function prepareScripts() {
  const registered = await messenger.scripting.compose.getRegisteredScripts({ ids: ["compose-ai-selection"] });
  if (!registered.length) {
    await messenger.scripting.compose.registerScripts([{ id: "compose-ai-selection", js: ["selection.js"] }]);
  }
}
prepareScripts().catch(() => { /* On-click injection also covers existing compose windows. */ });

async function openWritingAssistant(tab) {
  if (openingTabs.has(tab.id)) return;
  openingTabs.add(tab.id);
  try {
    const previous = windowsByTab.get(tab.id);
    if (previous) {
      try { await messenger.windows.update(previous, { focused: true }); return; }
      catch { windowsByTab.delete(tab.id); }
    }
    const key = crypto.randomUUID();
    let result;
    try {
      await messenger.scripting.executeScript({ target: { tabId: tab.id }, files: ["selection.js"] });
      result = await messenger.tabs.sendMessage(tab.id, { scope: "compose-ai-selection", action: "capture", key });
    } catch {
      result = { ok: false, error: "无法访问撰写窗口。请重新打开邮件编辑窗口后再试。" };
    }
    sessions.set(key, { tabId: tab.id, text: result.text || "", error: result.error || "" });
    try {
      const popup = await messenger.windows.create({
        url: messenger.runtime.getURL(`rewrite.html?key=${key}`), type: "popup", width: 720, height: 800
      });
      sessions.get(key).windowId = popup.id;
      windowsByTab.set(tab.id, popup.id);
    } catch (error) {
      sessions.delete(key);
      await messenger.tabs.sendMessage(tab.id, { scope: "compose-ai-selection", action: "release", key }).catch(() => {});
      throw error;
    }
  } finally { openingTabs.delete(tab.id); }
}
messenger.composeAction.onClicked.addListener(openWritingAssistant);
messenger.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'compose-ai-write' && tab?.id !== undefined) return openWritingAssistant(tab);
  if (info.menuItemId === 'compose-ai-settings') return messenger.runtime.openOptionsPage();
});

messenger.runtime.onMessage.addListener((message, sender) => {
  if (!sender.url?.startsWith(messenger.runtime.getURL("rewrite.html?")) || message?.scope !== "compose-ai-dialog") return;
  return (async () => {
    const session = sessions.get(message.key);
    if (!session) return { ok: false, error: "此改写窗口已过期，请重新选择文字。" };
    if (message.action === "load") return { ok: true, text: session.text, error: session.error };
    if (message.action === "replace") {
      try {
        const result = await messenger.tabs.sendMessage(session.tabId, {
          scope: "compose-ai-selection", action: "replace", key: message.key, text: message.text
        });
        if (result.ok) await messenger.windows.update((await messenger.tabs.get(session.tabId)).windowId, { focused: true });
        return result;
      } catch { return { ok: false, error: "原邮件编辑窗口已关闭，未进行替换。" }; }
    }
    return { ok: false, error: "Unsupported dialog action." };
  })();
});

messenger.windows.onRemoved.addListener((windowId) => {
  for (const [key, session] of sessions) {
    if (session.windowId !== windowId) continue;
    sessions.delete(key);
    windowsByTab.delete(session.tabId);
    messenger.tabs.sendMessage(session.tabId, { scope: "compose-ai-selection", action: "release", key }).catch(() => {});
  }
});
