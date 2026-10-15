import test from 'node:test';
import assert from 'node:assert/strict';
import { translateService, verifyTranslationKey, azureRegion } from '../helper/translation-services.mjs';
const input = { text: 'Hello\n\nMail', sourceLanguage: 'auto', outputLanguage: 'zh-TW' };

test('Azure uses regional headers, Chinese script codes and automatic source detection', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).searchParams.get('to'), 'zh-Hant');
    assert.equal(new URL(url).searchParams.has('from'), false);
    assert.equal(options.headers['Ocp-Apim-Subscription-Key'], 'synthetic-key');
    assert.equal(options.headers['Ocp-Apim-Subscription-Region'], 'westeurope');
    assert.deepEqual(JSON.parse(options.body), [{ Text: input.text }]);
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify([{ translations: [{ text: 'Translated' }] }]));
  };
  try { assert.equal((await translateService('azure', { key: 'synthetic-key', region: 'westeurope' }, input)).text, 'Translated'); }
  finally { globalThis.fetch = previous; }
});
for (const suffix of ['', ':fx']) test(`DeepL selects correct endpoint (${suffix || 'Pro'}) and Portuguese variant`, async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `https://${suffix ? 'api-free' : 'api'}.deepl.com/v2/translate`);
    assert.equal(options.headers.Authorization, 'DeepL-Auth-Key synthetic-key' + suffix);
    const body = JSON.parse(options.body);
    assert.equal(body.target_lang, 'PT-PT'); assert.equal(body.source_lang, 'ZH');
    return new Response(JSON.stringify({ translations: [{ text: 'Translated' }] }));
  };
  try { await translateService('deepl', { key: 'synthetic-key' + suffix }, { ...input, sourceLanguage: 'zh-CN', outputLanguage: 'pt' }); }
  finally { globalThis.fetch = previous; }
});
test('credential checks do not translate mail and reject unsafe region hosts', async () => {
  const previous = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.endsWith('issueToken')) { assert.equal(options.body, ''); return new Response('synthetic-token'); }
    assert.equal(options.body, undefined);
    return new Response(JSON.stringify({ character_count: 0, character_limit: 500000 }));
  };
  try {
    await verifyTranslationKey('azure', { key: 'synthetic', region: 'global' });
    await verifyTranslationKey('azure', { key: 'synthetic', region: 'westeurope' });
    await verifyTranslationKey('deepl', { key: 'synthetic:fx' });
    assert.deepEqual(calls, ['https://api.cognitive.microsoft.com/sts/v1.0/issueToken', 'https://westeurope.api.cognitive.microsoft.com/sts/v1.0/issueToken', 'https://api-free.deepl.com/v2/usage']);
    assert.throws(() => azureRegion('evil.example/'), { code: 'translation_access' });
  } finally { globalThis.fetch = previous; }
});
test('quota failures and cancellation do not retry or switch providers', async () => {
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('', { status: 456 }); };
  try {
    await assert.rejects(translateService('deepl', { key: 'synthetic:fx' }, input), { code: 'translation_quota' });
    const controller = new AbortController(); controller.abort();
    await assert.rejects(translateService('azure', { key: 'synthetic' }, input, controller.signal), { name: 'AbortError' });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = previous; }
});
