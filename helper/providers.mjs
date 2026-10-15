import { validateTranslationService, azureRegion, verifyTranslationKey, translateService } from './translation-services.mjs';
import { verifyGoogleKey, translateGoogle } from './google-translate.mjs';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, buildRequest, boundedJson, validateResultText } from './core.mjs';
import { protect, unprotect } from './windows.mjs';
import { withSessionLock } from './auth.mjs';

export function validateProvider(value = 'chatgpt') {
  if (!['chatgpt', 'gemini', 'claude'].includes(value)) throw new AppError('invalid_provider');
  return value;
}
function apiProvider(value) {
  validateProvider(value);
  if (value === 'chatgpt') throw new AppError('invalid_provider');
}
function directory() {
  if (!process.env.LOCALAPPDATA) throw new AppError('storage_unavailable');
  return join(process.env.LOCALAPPDATA, 'MailAiAssist');
}
async function loadKeys() {
  let raw;
  try { raw = await readFile(join(directory(), 'providers.json'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw new AppError('storage_unavailable'); }
  try { return JSON.parse(await unprotect(raw)); }
  catch { throw new AppError('credential_storage_unavailable'); }
}
async function saveKeys(keys) {
  const root = directory(); await mkdir(root, { recursive: true });
  const temp = join(root, `providers-${randomUUID()}.tmp`);
  try {
    await writeFile(temp, await protect(JSON.stringify(keys)), { flag: 'wx' });
    await rename(temp, join(root, 'providers.json'));
  } finally { await unlink(temp).catch(() => {}); }
}
export async function apiStatus(provider) {
  apiProvider(provider);
  const configured = Boolean((await loadKeys())[provider]);
  return { provider, connected: configured, sharing: configured, configured };
}
async function getKey(provider) {
  apiProvider(provider);
  const key = (await loadKeys())[provider];
  if (!key) throw new AppError('api_key_required');
  return key;
}
export async function saveApiKey(provider, value, signal) {
  apiProvider(provider);
  if (typeof value !== 'string' || !/^[\x21-\x7e]{8,512}$/.test(value.trim()) || value.trim().startsWith('sk-ant-oat')) throw new AppError('invalid_api_key');
  const key = value.trim();
  // Verify using the read-only catalog before replacing a previously working key.
  await listApiModels(provider, signal, key);
  return withSessionLock(async () => {
    const keys = await loadKeys(); keys[provider] = key; await saveKeys(keys);
    return { provider, configured: true };
  }, signal);
}
export async function removeApiKey(provider, signal) {
  apiProvider(provider);
  return withSessionLock(async () => {
    const keys = await loadKeys(); delete keys[provider]; await saveKeys(keys);
    return { provider, configured: false };
  }, signal);
}
const endpoints = { gemini: 'https://generativelanguage.googleapis.com/v1beta', claude: 'https://api.anthropic.com/v1' };
async function callApi(provider, path, key, signal, body) {
  apiProvider(provider);
  const headers = provider === 'gemini' ? { 'x-goog-api-key': key } : { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  let response;
  try {
    response = await fetch(endpoints[provider] + path, { method: body ? 'POST' : 'GET', redirect: 'error', signal,
      headers: { ...headers, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    throw new AppError('api_network_error');
  }
  // Do not relay server error text: it may echo a credential or source text.
  if (!response.ok) {
    throw new AppError(({ 400: 'api_invalid_request', 401: 'invalid_api_key', 403: 'api_permission_denied',
      404: 'api_model_unavailable', 429: 'api_quota_exceeded' })[response.status] || 'api_service_error');
  }
  try { return await boundedJson(response); } catch (error) { if (signal?.aborted) throw signal.reason; throw error; }
}
export async function listApiModels(provider, signal, suppliedKey) {
  const key = suppliedKey || await getKey(provider);
  const models = []; const seen = new Set(); let cursor = '';
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams(provider === 'gemini' ? { pageSize: '100' } : { limit: '100' });
    if (cursor) query.set(provider === 'gemini' ? 'pageToken' : 'after_id', cursor);
    const data = await callApi(provider, `/models?${query}`, key, signal);
    const items = provider === 'gemini' ? data?.models : data?.data;
    if (!Array.isArray(items)) throw new AppError('invalid_model_catalog');
    for (const model of items) {
      const slug = provider === 'gemini' ? model.name?.replace(/^models\//, '') : model.id;
      if (typeof slug !== 'string' || !/^[a-zA-Z0-9._-]{1,150}$/.test(slug)) continue;
      if (provider === 'gemini' && !model.supportedGenerationMethods?.includes('generateContent')) continue;
      models.push({ slug, displayName: (provider === 'gemini' ? model.displayName : model.display_name) || slug });
    }
    const next = provider === 'gemini' ? data.nextPageToken : data.has_more ? data.last_id : null;
    if (!next) return models;
    if (typeof next !== 'string' || seen.has(next)) throw new AppError('invalid_model_catalog');
    seen.add(next); cursor = next;
  }
  throw new AppError('invalid_model_catalog');
}
export async function rewriteApi(provider, data, signal) {
  apiProvider(provider);
  const request = buildRequest(data);
  if (!/^[a-zA-Z0-9._-]{1,150}$/.test(request.model)) throw new AppError('invalid_model');
  const key = await getKey(provider);
  const system = request.instructions + '\n\n' + request.input[0].content;
  let text;
  if (provider === 'gemini') {
    const result = await callApi(provider, `/models/${request.model}:generateContent`, key, signal, {
      systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: request.input[1].content }] }],
      generationConfig: { maxOutputTokens: 8192 }
    });
    const candidate = result?.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new AppError(candidate?.finishReason === 'MAX_TOKENS' ? 'incomplete_response' : 'api_response_blocked');
    text = candidate.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
  } else {
    const result = await callApi(provider, '/messages', key, signal, {
      model: request.model, max_tokens: 8192, system, messages: [{ role: 'user', content: request.input[1].content }]
    });
    if (result?.stop_reason !== 'end_turn') throw new AppError(result?.stop_reason === 'max_tokens' ? 'incomplete_response' : 'api_response_blocked');
    text = result.content?.filter(part => part.type === 'text').map(part => part.text).join('');
  }
  return { text: validateResultText(text) };
}

export async function googleStatus() { return { configured: Boolean((await loadKeys()).googleTranslation) }; }
export async function googleSave(value, signal) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{20,200}$/.test(value.trim())) throw new AppError('invalid_api_key');
  const key = value.trim();
  await verifyGoogleKey(key, signal);
  return withSessionLock(async () => {
    const keys = await loadKeys(); keys.googleTranslation = key; await saveKeys(keys);
    return { configured: true };
  }, signal);
}
export async function googleRemove(signal) {
  return withSessionLock(async () => {
    const keys = await loadKeys(); delete keys.googleTranslation; await saveKeys(keys);
    return { configured: false };
  }, signal);
}
export async function googleTranslate(message, signal) {
  const key = (await loadKeys()).googleTranslation;
  if (!key) throw new AppError('api_key_required');
  return translateGoogle(message, key, signal);
}

export async function translationStatus(service) {
  validateTranslationService(service);
  if (service === 'google') return googleStatus();
  const credential = (await loadKeys())[service + 'Translation'];
  return { configured: Boolean(credential?.key), ...(service === 'azure' ? { region: credential?.region || '' } : {}) };
}
export async function translationSave(message, signal) {
  const service = validateTranslationService(message.service);
  if (service === 'google') return googleSave(message.apiKey, signal);
  if (typeof message.apiKey !== 'string' || !/^[a-zA-Z0-9_:.-]{16,512}$/.test(message.apiKey.trim())) throw new AppError('invalid_api_key');
  const credential = { key: message.apiKey.trim(), ...(service === 'azure' ? { region: azureRegion(message.region) } : {}) };
  await verifyTranslationKey(service, credential, signal);
  return withSessionLock(async () => {
    const keys = await loadKeys(); keys[service + 'Translation'] = credential; await saveKeys(keys);
    return { configured: true, ...(service === 'azure' ? { region: credential.region } : {}) };
  }, signal);
}
export async function translationRemove(service, signal) {
  validateTranslationService(service);
  if (service === 'google') return googleRemove(signal);
  return withSessionLock(async () => {
    const keys = await loadKeys(); delete keys[service + 'Translation']; await saveKeys(keys);
    return { configured: false };
  }, signal);
}
export async function translationTranslate(message, signal) {
  const service = validateTranslationService(message.service);
  if (service === 'google') return googleTranslate(message, signal);
  const credential = (await loadKeys())[service + 'Translation'];
  if (!credential?.key) throw new AppError('api_key_required');
  return translateService(service, credential, message, signal);
}
