import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiStatus, saveApiKey, removeApiKey, listApiModels, rewriteApi, validateProvider, googleStatus, googleSave, googleRemove, translationSave, translationRemove, translationStatus } from '../helper/providers.mjs';
const originalFetch = globalThis.fetch;
const originalAppData = process.env.LOCALAPPDATA;
let directory;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
const catalogs = {
  gemini: { models: [{ name: 'models/gemini-test', displayName: 'Gemini test', supportedGenerationMethods: ['generateContent'] }] },
  claude: { data: [{ id: 'claude-test', display_name: 'Claude test' }], has_more: false }
};
const data = { text: 'A harmless test.', recipe: 'formal', outputLanguage: 'de', model: 'test-model' };
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'compose-api-test-'));
  process.env.LOCALAPPDATA = directory;
});
afterEach(() => { globalThis.fetch = originalFetch; });
after(async () => {
  if (originalAppData === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = originalAppData;
  assert.ok(directory.startsWith(join(tmpdir(), 'compose-api-test-')));
  await rm(directory, { recursive: true, force: true });
});
for (const provider of ['gemini', 'claude']) {
  test(`${provider}: keys are verified, encrypted and never returned to UI`, async () => {
    globalThis.fetch = async (url, options) => {
      assert.match(url, provider === 'gemini' ? /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\?/ : /^https:\/\/api.anthropic.com\/v1\/models\?/);
      assert.equal(options.headers[provider === 'gemini' ? 'x-goog-api-key' : 'x-api-key'], `synthetic-${provider}-key`);
      assert.equal(new URL(url).searchParams.has('key'), false);
      assert.equal(options.redirect, 'error');
      return json(catalogs[provider]);
    };
    await saveApiKey(provider, `synthetic-${provider}-key`);
    const session = await apiStatus(provider);
    assert.equal(session.configured, true); assert.equal(session.apiKey, undefined);
    assert.equal((await readFile(join(directory, 'MailAiAssist', 'providers.json'), 'utf8')).includes('synthetic'), false);
  });
  test(`${provider}: generation uses its own key and validated editing instructions`, async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers[provider === 'gemini' ? 'x-goog-api-key' : 'x-api-key'], `synthetic-${provider}-key`);
      const body = JSON.parse(options.body);
      if (provider === 'gemini') {
        assert.match(url, /\/models\/test-model:generateContent$/);
        assert.match(body.systemInstruction.parts[0].text, /German/);
        assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { source_text: data.text });
        assert.equal(body.tools, undefined);
        return json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'hidden' }, { text: 'Hallo' }] } }] });
      }
      assert.match(url, /\/messages$/); assert.equal(options.headers['anthropic-version'], '2023-06-01');
      assert.match(body.system, /German/); assert.deepEqual(JSON.parse(body.messages[0].content), { source_text: data.text });
      assert.equal(body.tools, undefined);
      return json({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'hidden' }, { type: 'text', text: 'Hallo' }] });
    };
    assert.deepEqual(await rewriteApi(provider, data), { text: 'Hallo' });
  });
  test(`${provider}: truncated output cannot be applied`, async () => {
    globalThis.fetch = async () => json(provider === 'gemini' ? { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Partial' }] } }] } : { stop_reason: 'max_tokens', content: [{ type: 'text', text: 'Partial' }] });
    await assert.rejects(rewriteApi(provider, data), { code: 'incomplete_response' });
  });
}
test('invalid keys do not overwrite working credentials or disclose remote error text', async () => {
  globalThis.fetch = async () => json({ error: { message: 'echoed-secret-value' } }, 401);
  await assert.rejects(saveApiKey('gemini', 'replacement-fake-key'), { code: 'invalid_api_key', message: 'invalid_api_key' });
  globalThis.fetch = async (url, options) => { assert.equal(options.headers['x-goog-api-key'], 'synthetic-gemini-key'); return json(catalogs.gemini); };
  assert.equal((await listApiModels('gemini')).length, 1);
});
test('catalogs paginate and Gemini excludes embeddings', async () => {
  let call = 0;
  globalThis.fetch = async (url) => {
    call++;
    if (call === 1) return json({ models: [{ name: 'models/embed', supportedGenerationMethods: ['embedContent'] }], nextPageToken: 'next' });
    assert.equal(new URL(url).searchParams.get('pageToken'), 'next'); return json(catalogs.gemini);
  };
  assert.deepEqual((await listApiModels('gemini')).map(model => model.slug), ['gemini-test']);
  call = 0;
  globalThis.fetch = async (url) => { call++; if (call === 1) return json({ ...catalogs.claude, has_more: true, last_id: 'claude-test' }); assert.equal(new URL(url).searchParams.get('after_id'), 'claude-test'); return json({ data: [], has_more: false }); };
  assert.equal((await listApiModels('claude')).length, 1);
});
test('unknown providers, OAuth credentials and unsafe model paths are rejected', async () => {
  assert.throws(() => validateProvider('other'), { code: 'invalid_provider' });
  await assert.rejects(saveApiKey('claude', 'sk-ant-oat-fake-token'), { code: 'invalid_api_key' });
  await assert.rejects(rewriteApi('gemini', { ...data, model: '../evil?key=x' }), { code: 'invalid_model' });
});
test('quota and network errors have safe codes; aborted calls remain cancelled', async () => {
  globalThis.fetch = async () => json({}, 429);
  await assert.rejects(rewriteApi('claude', data), { code: 'api_quota_exceeded' });
  globalThis.fetch = async () => { throw new Error('private diagnostics'); };
  await assert.rejects(rewriteApi('claude', data), { code: 'api_network_error' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(rewriteApi('claude', data, controller.signal), { name: 'AbortError' });
});
test('removing one key leaves the other provider and ChatGPT files untouched', async () => {
  await removeApiKey('gemini'); assert.equal((await apiStatus('gemini')).configured, false);
  assert.equal((await apiStatus('claude')).configured, true);
  await assert.rejects(readFile(join(directory, 'MailAiAssist', 'state.json')), { code: 'ENOENT' });
});

test('Google Translation keys are verified, encrypted and preserved after failed replacement', async () => {
  const synthetic = 'synthetic-google-translation-key';
  globalThis.fetch = async (url, options) => {
    assert.ok(url.startsWith('https://translation.googleapis.com/language/translate/v2/languages?'));
    assert.equal(options.method, 'GET');
    return json({ data: { languages: [{ language: 'en' }] } });
  };
  assert.deepEqual(await googleSave(synthetic), { configured: true });
  assert.deepEqual(await googleStatus(), { configured: true });
  const stored = await readFile(join(directory, 'MailAiAssist', 'providers.json'), 'utf8');
  assert.equal(stored.includes(synthetic), false);
  globalThis.fetch = async () => json({}, 403);
  await assert.rejects(googleSave('synthetic-rejected-google-key'), { code: 'google_access' });
  assert.equal(await readFile(join(directory, 'MailAiAssist', 'providers.json'), 'utf8'), stored);
  assert.deepEqual(await googleRemove(), { configured: false });
  assert.deepEqual(await googleStatus(), { configured: false });
});

test('translation credentials remain independent and Azure region is persisted without exposing keys', async () => {
  globalThis.fetch = async url => url.endsWith('issueToken') ? new Response('synthetic-token') : json({ character_count: 0 });
  await translationSave({ service: 'azure', apiKey: 'synthetic-azure-credential', region: 'westeurope' });
  await translationSave({ service: 'deepl', apiKey: 'synthetic-deepl-credential:fx' });
  assert.deepEqual(await translationStatus('azure'), { configured: true, region: 'westeurope' });
  assert.deepEqual(await translationStatus('deepl'), { configured: true });
  const stored = await readFile(join(directory, 'MailAiAssist', 'providers.json'), 'utf8');
  assert.equal(stored.includes('synthetic-azure-credential'), false);
  assert.equal(stored.includes('synthetic-deepl-credential'), false);
  globalThis.fetch = async () => json({}, 403);
  await assert.rejects(translationSave({ service: 'azure', apiKey: 'synthetic-rejected-credential', region: 'eastus' }), { code: 'translation_access' });
  assert.deepEqual(await translationStatus('azure'), { configured: true, region: 'westeurope' });
  await translationRemove('azure');
  assert.equal((await translationStatus('azure')).configured, false);
  assert.equal((await translationStatus('deepl')).configured, true);
  await translationRemove('deepl');
});
