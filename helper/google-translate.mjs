import { AppError, boundedJson, validateResultText } from './core.mjs';
const endpoint = 'https://translation.googleapis.com/language/translate/v2';
const languages = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'];
async function request(path, key, signal, body) {
  const response = await fetch(endpoint + path + '?key=' + encodeURIComponent(key), {
    method: body ? 'POST' : 'GET', redirect: 'error', signal,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) throw new AppError(response.status === 429 ? 'google_quota' : response.status === 400 || response.status === 403 ? 'google_access' : 'google_failed');
  return boundedJson(response);
}
export async function verifyGoogleKey(key, signal) {
  const response = await request('/languages', key, signal);
  if (!Array.isArray(response.data?.languages) || !response.data.languages.length) throw new AppError('google_failed');
}
export function splitTranslation(text) {
  // Bound requests by Unicode characters and prefer paragraph boundaries.
  const points = Array.from(text), parts = [];
  for (let offset = 0; offset < points.length;) {
    let end = Math.min(offset + 4500, points.length);
    if (end < points.length) {
      for (let i = end - 1; i > offset + 2000; i--) if (points[i] === '\n') { end = i + 1; break; }
    }
    parts.push(points.slice(offset, end).join('')); offset = end;
  }
  return parts;
}
export async function translateGoogle(message, key, signal) {
  if (!languages.includes(message.outputLanguage) || (message.sourceLanguage !== 'auto' && !languages.includes(message.sourceLanguage))) throw new AppError('google_failed');
  if (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 20000) throw new AppError('invalid_text');
  const parts = splitTranslation(message.text), output = new Array(parts.length);
  let cursor = 0;
  const stopped = new AbortController();
  const combined = signal ? AbortSignal.any([signal, stopped.signal]) : stopped.signal;
  async function worker() {
    while (cursor < parts.length) {
      combined.throwIfAborted();
      const index = cursor++, part = parts[index];
      const prefix = part.match(/^\s*/)[0], suffix = part.match(/\s*$/)[0];
      if (!part.trim()) { output[index] = part; continue; }
      const data = await request('', key, combined, { q: part.trim(), target: message.outputLanguage, format: 'text', model: 'nmt', ...(message.sourceLanguage === 'auto' ? {} : { source: message.sourceLanguage }) });
      const value = data.data?.translations?.[0]?.translatedText;
      validateResultText(value);
      output[index] = prefix + value + suffix;
    }
  }
  try { await Promise.all([worker(), worker()]); }
  catch (error) { stopped.abort(); throw error; }
  combined.throwIfAborted();
  return { text: validateResultText(output.join('')) };
}
