import { AppError, boundedJson, validateResultText } from './core.mjs';
import { splitTranslation } from './google-translate.mjs';
const languages = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'];
export function validateTranslationService(value) {
  if (!['google', 'azure', 'deepl'].includes(value)) throw new AppError('invalid_provider');
  return value;
}
export function azureRegion(value = '') {
  if (typeof value !== 'string') throw new AppError('translation_access');
  const region = value.trim().toLowerCase();
  if (region && !/^[a-z0-9]{2,40}$/.test(region)) throw new AppError('translation_access');
  return region === 'global' ? '' : region;
}
const deepLEndpoint = key => key.endsWith(':fx') ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2';
async function call(url, options) {
  const response = await fetch(url, { ...options, redirect: 'error' });
  if (!response.ok) throw new AppError([429, 456].includes(response.status) ? 'translation_quota' : [400, 401, 403].includes(response.status) ? 'translation_access' : 'translation_failed');
  return response;
}
export async function verifyTranslationKey(service, credential, signal) {
  if (service === 'azure') {
    const region = azureRegion(credential.region);
    const host = region ? `${region}.api.cognitive.microsoft.com` : 'api.cognitive.microsoft.com';
    const response = await call(`https://${host}/sts/v1.0/issueToken`, { method: 'POST', signal, headers: { 'Ocp-Apim-Subscription-Key': credential.key }, body: '' });
    if (!(await response.text()).trim()) throw new AppError('translation_access');
  } else if (service === 'deepl') {
    const response = await call(deepLEndpoint(credential.key) + '/usage', { signal, headers: { Authorization: `DeepL-Auth-Key ${credential.key}` } });
    const value = await boundedJson(response);
    if (!Number.isFinite(value.character_count) && !Array.isArray(value.products)) throw new AppError('translation_failed');
  } else throw new AppError('invalid_provider');
}
function languageCode(service, language, source = false) {
  if (service === 'azure') return ({ 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', pt: 'pt-pt' })[language] || language;
  if (source) return language.startsWith('zh-') ? 'ZH' : language.toUpperCase();
  return ({ en: 'EN-US', pt: 'PT-PT', 'zh-CN': 'ZH-HANS', 'zh-TW': 'ZH-HANT' })[language] || language.toUpperCase();
}
export async function translateService(service, credential, message, signal) {
  if (!['azure', 'deepl'].includes(service)) throw new AppError('invalid_provider');
  if (!languages.includes(message.outputLanguage) || (message.sourceLanguage !== 'auto' && !languages.includes(message.sourceLanguage))) throw new AppError('translation_access');
  if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 20000) throw new AppError('invalid_text');
  // Azure also interprets dynamic dictionary markup in plain-text requests.
  // Reject it before chunking or any network call, without silently changing the source.
  if (service === 'azure' && /<\s*\/?\s*mstrans\s*:\s*dictionary\b/i.test(message.text)) throw new AppError('translation_unsafe_markup');
  const chunks = splitTranslation(message.text), output = new Array(chunks.length);
  const stopped = new AbortController();
  const combined = signal ? AbortSignal.any([signal, stopped.signal]) : stopped.signal;
  let cursor = 0;
  async function worker() {
    while (cursor < chunks.length) {
      combined.throwIfAborted();
      const index = cursor++, text = chunks[index];
      if (!text.trim()) { output[index] = text; continue; }
      let response, result;
      const target = languageCode(service, message.outputLanguage);
      const source = message.sourceLanguage === 'auto' ? null : languageCode(service, message.sourceLanguage, true);
      if (service === 'azure') {
        const query = new URLSearchParams({ 'api-version': '3.0', to: target, textType: 'plain' });
        if (source) query.set('from', source);
        const region = azureRegion(credential.region);
        response = await call('https://api.cognitive.microsofttranslator.com/translate?' + query, { method: 'POST', signal: combined,
          headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': credential.key, ...(region ? { 'Ocp-Apim-Subscription-Region': region } : {}) }, body: JSON.stringify([{ Text: text.trim() }]) });
        result = (await boundedJson(response))?.[0]?.translations?.[0]?.text;
      } else {
        response = await call(deepLEndpoint(credential.key) + '/translate', { method: 'POST', signal: combined,
          headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${credential.key}` },
          body: JSON.stringify({ text: [text.trim()], target_lang: target, preserve_formatting: true, ...(source ? { source_lang: source } : {}) }) });
        result = (await boundedJson(response))?.translations?.[0]?.text;
      }
      validateResultText(result);
      output[index] = text.match(/^\s*/)[0] + result + text.match(/\s*$/)[0];
    }
  }
  try { await Promise.all([worker(), worker()]); }
  catch (error) { stopped.abort(); throw error; }
  combined.throwIfAborted();
  return { text: validateResultText(output.join('')) };
}
