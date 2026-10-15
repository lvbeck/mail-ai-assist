import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTranslation, translateGoogle, verifyGoogleKey } from '../helper/google-translate.mjs';

test('Google translation splits Unicode safely and preserves chunk order and paragraph boundaries', async () => {
  const text = ('First 😀 paragraph.\n\n').repeat(550);
  const pieces = splitTranslation(text);
  assert.equal(pieces.join(''), text);
  assert.ok(pieces.every(piece => Array.from(piece).length <= 4500));
  const calls = []; let active = 0, maximum = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options }); active++; maximum = Math.max(maximum, active);
    const body = JSON.parse(options.body);
    await new Promise(resolve => setTimeout(resolve, calls.length === 1 ? 10 : 1)); active--;
    return new Response(JSON.stringify({ data: { translations: [{ translatedText: body.q }] } }));
  };
  try {
    const result = await translateGoogle({ text, sourceLanguage: 'auto', outputLanguage: 'zh-CN' }, 'test-key', new AbortController().signal);
    assert.equal(result.text, text); assert.equal(maximum, 2);
    for (const call of calls) {
      const body = JSON.parse(call.options.body);
      assert.equal(body.source, undefined); assert.equal(body.model, 'nmt'); assert.equal(body.format, 'text');
      assert.equal(call.options.redirect, 'error'); assert.ok(call.url.startsWith('https://translation.googleapis.com/'));
    }
  } finally { globalThis.fetch = previous; }
});
test('Google key verification is read-only; errors and cancellation never retry', async () => {
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++; assert.ok(url.includes('/languages?')); assert.equal(options.method, 'GET');
    return new Response(JSON.stringify({ data: { languages: [{ language: 'en' }] } }));
  };
  try {
    await verifyGoogleKey('test-key');
    globalThis.fetch = async () => { calls++; return { ok: false, status: 429 }; };
    await assert.rejects(translateGoogle({ text: 'Hello', sourceLanguage: 'en', outputLanguage: 'de' }, 'test-key'), { code: 'google_quota' });
    const controller = new AbortController(); controller.abort();
    await assert.rejects(translateGoogle({ text: 'Hello', sourceLanguage: 'en', outputLanguage: 'de' }, 'test-key', controller.signal), { name: 'AbortError' });
    assert.equal(calls, 2);
  } finally { globalThis.fetch = previous; }
});
