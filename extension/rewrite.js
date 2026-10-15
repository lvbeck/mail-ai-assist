const $ = (id) => document.getElementById(id);
const isSettings = document.body.dataset.page === 'settings';
const key = new URLSearchParams(location.search).get("key");
let nativePort;
let sequence = 0;
let busy = false;
let sharing = false;
let readyResult = false;
let activeRequest;
const pending = new Map();
const t = (text, values) => ComposeI18n.t(text, values);
let accountEmail = '';
let statusText = '';
let statusError = false;
let accountProblem = '';
let renewable;
let selectedModel = "";
let availableModels = [];
let currentProvider = "chatgpt";

const errors = {
  api_key_required: '请在设置页填写所选提供商的 API Key。',
  invalid_api_key: 'API Key 无效，请检查并重新保存。',
  api_permission_denied: 'API 权限不足，请检查密钥、项目、地区或账户权限。',
  api_quota_exceeded: 'API 额度不足或请求过多，请查看提供商用量与计费设置。',
  api_model_unavailable: '所选 API 模型不可用，请在设置页重新选择。',
  api_invalid_request: '提供商拒绝了请求，请检查所选模型是否支持文字生成。',
  api_network_error: '无法连接 API，请检查网络后重试。',
  api_service_error: 'API 服务暂时不可用，请稍后重试。',
  api_response_blocked: '未获得完整可用的文字结果，可能被安全策略阻止。',
  invalid_rewrite_result: '改写结果为空或过长，未替换正文。',
  helper_update_required: '请安装新版辅助程序 MSI，然后重启 Thunderbird。',
  invalid_provider: '提供商设置无效，请在设置页重新选择。',

  helper_unavailable: "本地辅助程序未连接。请在设置页下载并安装 Windows x64 MSI，然后重启 Thunderbird。",
  sign_in_required: "登录已失效，请重新登录 ChatGPT 以启用自动续期。",
  refresh_unavailable: "暂时无法续期，请检查网络。登录凭据已保留，将自动重试。",
  invalid_client: "应用登录配置无效，请更新辅助程序后重新登录。",
  sharing_not_enabled: "账号未授予使用 ChatGPT 套餐的权限，请重新登录并检查授权。不会改用付费 API。",
  subscription_sharing_usage_limit_exceeded: "ChatGPT 套餐额度已用完，请等待恢复或检查额度设置。",
  subscription_sharing_usage_unavailable: "此账号或工作区暂时无法使用套餐共享。不会改用付费 API。",
  access_denied: "登录或套餐授权被取消。",
  cancelled: "请求已取消，原文未修改。",
  login_busy: "另一个窗口正在登录或续期，请稍后重试。",
  timeout: "请求超时，原文未修改。请稍后重试。",
  incomplete_response: "生成未完整结束，结果不会用于替换。请重试。",
  invalid_id_token: "登录身份验证未通过，未保存此次登录。",
  invalid_registration: "账号注册未完成。请重新登录；此功能的实际开放情况取决于 OpenAI 账户权限。"
};
function show(text, error = false) {
  statusText = text; statusError = error;
  $("status").textContent = t(text); $("status").classList.toggle("error", error);
}
function renderDynamicText() {
  const apiMode = currentProvider !== 'chatgpt';
  if ($('chatgptControls')) $('chatgptControls').hidden = apiMode;
  if ($('apiControls')) $('apiControls').hidden = !apiMode;
  if ($('providerNote')) $('providerNote').textContent = t(currentProvider === 'gemini' ? 'Gemini API 免费层取决于项目和模型；已启用计费的项目可能产生费用，不使用网页订阅额度。' : currentProvider === 'claude' ? 'Claude API 通常另行计费，不包含在 Claude Free、Pro 或 Max 网页订阅中。' : '使用已授权的 ChatGPT 订阅额度。');
  if ($('apiConsole')) $('apiConsole').href = currentProvider === 'claude' ? 'https://platform.claude.com/settings/keys' : 'https://aistudio.google.com/apikey';
  if ($('account')) $('account').textContent = t(!nativePort ? '本地辅助程序未连接' : accountProblem || (apiMode ? (sharing ? 'API Key 已加密保存。' : '尚未配置 API Key。') : (sharing ?
    renewable === true ? 'connectedRenewable' : renewable === false ? 'connectedLegacy' : 'connected' : '未登录，或当前授权已过期')), { email: accountEmail || 'ChatGPT' });
  if ($("count")) $("count").textContent = t('characterCount', { count: $("source").value.length });
  if (!sharing && $("model") && $("model").options.length === 1) $("model").options[0].textContent = t('请先登录');
  show(statusText, statusError);
}
function showError(error) {
  if (['sign_in_required', 'refresh_unavailable', 'invalid_client', 'login_busy', 'invalid_token_response', 'invalid_api_key', 'api_key_required', 'helper_update_required'].includes(error.code)) {
    sharing = false;
    accountProblem = errors[error.code] || '登录状态暂时无法确认，将自动重试。';
    renderDynamicText();
    refreshControls();
  }
  show(errors[error.code] || error.message || '操作失败', true);
}
function refreshControls() {
  const disabled = { installHelperUpdate: busy || !nativePort, signIn: busy || !nativePort, signOut: busy || !nativePort,
    saveKey: busy || !nativePort, removeKey: busy || !nativePort, apiKey: busy, provider: busy, model: busy || !sharing || !availableModels.length, recipe: busy, language: busy, custom: busy, uiLanguage: busy,
    generate: busy || !sharing || !$("source")?.value.trim() || !selectedModel,
    cancel: !busy || !activeRequest, apply: busy || !readyResult || !$("result")?.value.trim() };
  for (const [id, value] of Object.entries(disabled)) if ($(id)) $(id).disabled = value;
}
function connect() {
  nativePort = messenger.runtime.connectNative("local.mail_ai_assist");
  nativePort.onMessage.addListener((message) => {
    const task = pending.get(message.id);
    if (!task) return;
    if (message.event === "delta") { task.onDelta?.(message.text); return; }
    pending.delete(message.id);
    if (message.ok) task.resolve(message.result);
    else task.reject(message.error || { code: "unknown_error" });
  });
  nativePort.onDisconnect.addListener(() => {
    for (const task of pending.values()) task.reject({ code: "helper_unavailable" });
    pending.clear();
    nativePort = null;
    sharing = false;
    if ($("account")) $("account").textContent = t("本地辅助程序未连接");
    refreshControls();
  });
}
function request(action, data = {}, onDelta) {
  if (!nativePort) return Promise.reject({ code: "helper_unavailable" });
  const id = ++sequence;
  activeRequest = id;
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onDelta });
    try { nativePort.postMessage({ id, action, provider: currentProvider, ...data }); }
    catch { pending.delete(id); reject({ code: "helper_unavailable" }); }
  });
  refreshControls();
  return promise.finally(() => { if (activeRequest === id) activeRequest = null; });
}
async function loadAccount(forceModels = true) {
  const wasSharing = sharing;
  const previousProvider = currentProvider;
  const saved = await messenger.storage.local.get(['provider', 'taskModel', 'model_chatgpt', 'model_gemini', 'model_claude']);
  currentProvider = saved.provider || 'chatgpt';
  if (!['chatgpt', 'gemini', 'claude'].includes(currentProvider)) throw { code: 'invalid_provider' };
  const changed = previousProvider !== currentProvider;
  if (changed) {
    selectedModel = ''; availableModels = []; sharing = false; accountProblem = ''; show('');
    if ($('apiKey')) $('apiKey').value = '';
  }
  if ($('provider')) $('provider').value = currentProvider;
  renderDynamicText();
  let session;
  if (isSettings && $('helperUpdate')) {
    try {
      const update = await request('helperUpdateStatus');
      $('helperUpdate').hidden = !update.available && !update.waiting;
      $('installHelperUpdate').hidden = !update.available;
    } catch { $('helperUpdate').hidden = true; }
  }
  try {
    session = await request('status');
    if (currentProvider !== 'chatgpt' && session.provider !== currentProvider) throw { code: 'helper_update_required' };
  } catch (error) {
    sharing = false; selectedModel = '';
    accountProblem = errors[error.code] || '登录状态暂时无法确认，将自动重试。';
    renderDynamicText(); throw error;
  }
  sharing = session.sharing;
  accountEmail = session.email || ''; renewable = session.renewable;
  if (accountProblem && statusError && (statusText === accountProblem || Object.values(errors).includes(statusText))) show('');
  accountProblem = '';
  if (!isSettings && !sharing) show('请在设置页配置所选提供商及模型。', true);
  else if (sharing && statusText === '请在设置页配置所选提供商及模型。') show('');
  renderDynamicText();
  if (forceModels || changed || wasSharing !== sharing || (sharing && !availableModels.length)) {
    availableModels = [];
    selectedModel = '';
    if ($('model')) $('model').replaceChildren(new Option(t('请选择模型'), ''));
    availableModels = sharing ? await request('models') : [];
  }
  const storedModel = saved['model_' + currentProvider] || (currentProvider === 'chatgpt' ? saved.taskModel : '');
  selectedModel = availableModels.some(model => model.slug === storedModel) ? storedModel :
    !storedModel && currentProvider === 'chatgpt' ? availableModels[0]?.slug || '' : '';
  if (sharing && !availableModels.length) show('当前账户没有可用模型，请检查套餐授权。', true);
  else if (sharing && !selectedModel) show('请在设置页选择可用的模型。', true);
  else if (statusText === '请在设置页选择可用的模型。') show('');
  if ($('model')) {
    $('model').replaceChildren();
    if (!selectedModel) $('model').add(new Option(t('请选择模型'), ''));
    for (const model of availableModels) $('model').add(new Option(model.displayName, model.slug));
    $('model').value = selectedModel;
  }
  if (!storedModel && selectedModel) await messenger.storage.local.set({ ['model_' + currentProvider]: selectedModel });
}

async function perform(operation) {
  if (busy) return;
  busy = true; refreshControls();
  try { await operation(); }
  catch (error) { showError(error); }
  finally { busy = false; activeRequest = null; refreshControls(); }
}
$("signIn")?.addEventListener("click", () => perform(async () => {
  show("请在浏览器中完成 ChatGPT 登录，并允许此工具使用套餐额度。");
  await request("signIn", { uiLanguage: document.documentElement.lang });
  await loadAccount();
  show(sharing ? "登录完成，可以开始改写。" : errors.sharing_not_enabled, !sharing);
}));
$("signOut")?.addEventListener("click", () => perform(async () => {
  const result = await request("signOut");
  await loadAccount();
  show(result.revoked ? '已退出登录并结束自动续期会话。' : '本机登录凭据已清除，但未能确认服务器撤销。可在 ChatGPT 设置中断开此应用。');
}));
$("recipe")?.addEventListener("change", () => {
  $("customField").hidden = $("recipe").value !== "custom";
});
$("uiLanguage")?.addEventListener("change", () => perform(async () => {
  await ComposeI18n.setInterface($("uiLanguage").value);
  renderDynamicText();
}));
$("language")?.addEventListener("change", () => perform(async () => {
  try { await ComposeI18n.setOutput($("language").value); }
  catch { throw new Error('设置保存失败，请重试。'); }
}));
$("generate")?.addEventListener("click", () => perform(async () => {
  readyResult = false;
  $("result").value = "";
  $("result").disabled = true;
  await loadAccount(false);
  if (!sharing || !selectedModel) throw new Error(t('请在设置页配置所选提供商及模型。'));
  show("正在改写…");
  const result = await request("rewrite", {
    text: $("source").value, recipe: $("recipe").value, outputLanguage: $("language").value,
    custom: $("custom").value, model: selectedModel
  }, (delta) => { $("result").value += delta; });
  $("result").value = result.text;
  $("result").disabled = false;
  readyResult = true;
  show("改写完成。检查结果后点击“替换选中文字”。");
}));
$("cancel")?.addEventListener("click", () => {
  if (nativePort && activeRequest) nativePort.postMessage({ id: ++sequence, action: "cancel", target: activeRequest });
});
$("result")?.addEventListener("input", refreshControls);
$("apply")?.addEventListener("click", () => perform(async () => {
  const result = await messenger.runtime.sendMessage({ scope: "compose-ai-dialog", action: "replace", key, text: $("result").value });
  if (!result?.ok) throw new Error(result?.error || "替换失败，原文未修改。");
  window.close();
}));
$("close")?.addEventListener("click", () => window.close());
function checkAccount() {
  if (!busy && nativePort) perform(() => loadAccount(false));
}
const accountTimer = setInterval(checkAccount, 30000);
window.addEventListener('focus', checkAccount);
window.addEventListener('online', checkAccount);
window.addEventListener("pagehide", () => { clearInterval(accountTimer); nativePort?.disconnect(); });
perform(async () => {
  await ComposeI18n.initialize();
  if (isSettings) {
    const saved = await messenger.storage.local.get(['translationLanguage', 'translationSourceLanguage', 'tagLanguage', 'summaryLanguage']);
    $('summaryLanguage').value = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'].includes(saved.summaryLanguage) ? saved.summaryLanguage : 'auto';
    $('translationSourceLanguage').value = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'].includes(saved.translationSourceLanguage) ? saved.translationSourceLanguage : 'auto';
    for (const name of ['translationLanguage', 'tagLanguage']) {
      $(name).value = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'].includes(saved[name]) ? saved[name] : 'en';
    }
  }
  for (const id of ['addonVersion', 'headerVersion']) {
    if ($(id)) $(id).textContent = messenger.runtime.getManifest().version;
  }
  if (!isSettings) {
  const session = await messenger.runtime.sendMessage({ scope: "compose-ai-dialog", action: "load", key });
  if (!session?.ok || session.error) throw new Error(session?.error || "无法获取选中文字。");
  $("source").value = ComposePreview.normalize(session.text);
  if ($("count")) $("count").textContent = t('characterCount', { count: $("source").value.length });
  }
  connect();
  await loadAccount();
});

$("settings")?.addEventListener('click', () => messenger.runtime.openOptionsPage().catch(showError));
window.addEventListener('compose-language-changed', renderDynamicText);

$("model")?.addEventListener('change', () => perform(async () => {
  selectedModel = $('model').value;
  await messenger.storage.local.set({ ["model_" + currentProvider]: selectedModel });
  await loadAccount(false);
}));
$("provider")?.addEventListener('change', () => perform(async () => {
  await messenger.storage.local.set({ provider: $('provider').value });
  await loadAccount();
}));
messenger.storage.onChanged?.addListener((changes, area) => {
  if (area === 'local' && (changes.provider || Object.keys(changes).some(name => name.startsWith('model_')))) checkAccount();
});

$('saveKey')?.addEventListener('click', () => perform(async () => {
  const apiKey = $('apiKey').value;
  $('apiKey').value = '';
  await request('saveApiKey', { apiKey });
  await loadAccount();
  if (selectedModel) show('API Key 已加密保存。');
}));
$('removeKey')?.addEventListener('click', () => perform(async () => {
  $('apiKey').value = '';
  await request('signOut');
  await loadAccount();
  show('本机 API Key 已移除。');
}));

$('translationLanguage')?.addEventListener('change', () => messenger.storage.local.set({ translationLanguage: $('translationLanguage').value }).catch(showError));

$('tagLanguage')?.addEventListener('change', () => messenger.storage.local.set({ tagLanguage: $('tagLanguage').value }).catch(showError));

$('translationSourceLanguage')?.addEventListener('change', () => messenger.storage.local.set({ translationSourceLanguage: $('translationSourceLanguage').value }).catch(showError));
$('installHelperUpdate')?.addEventListener('click', () => perform(async () => {
  await request('installHelperUpdate');
  $('installHelperUpdate').hidden = true;
  show('请关闭 Thunderbird，随后确认管理员授权以安装更新。');
}));

$('summaryLanguage')?.addEventListener('change', () => messenger.storage.local.set({ summaryLanguage: $('summaryLanguage').value }).catch(showError));
