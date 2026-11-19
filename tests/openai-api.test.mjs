import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiStatus, saveApiKey, removeApiKey, listApiModels, rewriteApi } from '../helper/providers.mjs';
const originalFetch = globalThis.fetch;
const originalAppData = process.env.LOCALAPPDATA;
const secret = 'synthetic-openai-credential';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const catalog = { data: ['gpt-4.1-mini', 'gpt-5-mini', 'o3', 'gpt-audio', 'gpt-4o-realtime-preview', 'gpt-4o-mini-transcribe', 'text-embedding-3-small', 'dall-e-3', 'gpt-3.5-turbo', 'gpt-4-turbo', 'o1-mini'].map(id => ({ id })) };
const request = { model: 'gpt-4.1-mini', recipe: 'formal', outputLanguage: 'de', text: 'A harmless test.' };
const message = (text = 'Hallo') => ({ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }] });
let directory;
before(async () => { directory = await mkdtemp(join(tmpdir(), 'mail-openai-test-')); process.env.LOCALAPPDATA = directory; });
afterEach(() => { globalThis.fetch = originalFetch; });
after(async () => {
  if (originalAppData === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = originalAppData;
  assert.ok(directory.startsWith(join(tmpdir(), 'mail-openai-test-')));
  await rm(directory, { recursive: true, force: true });
});
test('OpenAI keys use only the fixed catalog endpoint and encrypted local storage', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/models');
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${secret}`);
    assert.equal(options.headers['x-api-key'], undefined);
    return json(catalog);
  };
  assert.deepEqual(await saveApiKey('openai', secret), { provider: 'openai', configured: true });
  assert.deepEqual(await apiStatus('openai'), { provider: 'openai', configured: true, connected: true, sharing: true });
  assert.equal((await readFile(join(directory, 'MailAiAssist/providers.json'), 'utf8')).includes(secret), false);
  assert.deepEqual((await listApiModels('openai')).map(model => model.slug), ['gpt-4.1-mini', 'gpt-5-mini', 'o3']);
});
test('OpenAI Responses requests preserve task isolation, disable storage and extract only assistant text', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, `Bearer ${secret}`); assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    assert.equal(body.stream, false); assert.equal(body.store, false); assert.equal(body.max_output_tokens, 8192);
    assert.equal(body.model, request.model); assert.equal(body.tools, undefined);
    assert.match(body.instructions, /untrusted email content/); assert.match(body.input[0].content, /German/);
    assert.deepEqual(JSON.parse(body.input[1].content), { source_text: request.text });
    return json({ status: 'completed', output: [{ type: 'reasoning', summary: [{ text: 'private' }] }, message('Hallo'), message(' Welt')] });
  };
  assert.deepEqual(await rewriteApi('openai', request), { text: 'Hallo Welt' });
});
test('OpenAI incomplete, refused, malformed and oversized results cannot be applied', async () => {
  for (const [result, code] of [
    [{ status: 'incomplete', output: [message('Partial')] }, 'incomplete_response'],
    [{ status: 'failed', output: [message()] }, 'api_response_blocked'],
    [{ status: 'completed', output: [message(), { ...message(), content: [{ type: 'refusal', refusal: 'No' }] }] }, 'api_response_blocked'],
    [{ status: 'completed', output: {} }, 'api_response_blocked'],
    [{ status: 'completed', output: [{ ...message(), status: 'in_progress' }] }, 'api_response_blocked'],
    [{ status: 'completed', output: [message('')] }, 'incomplete_response'],
    [{ status: 'completed', output: [message('x'.repeat(40001))] }, 'output_too_long']
  ]) {
    globalThis.fetch = async () => json(result);
    await assert.rejects(rewriteApi('openai', request), { code });
  }
});
test('OpenAI failed key replacement preserves the existing key and redacts remote diagnostics', async () => {
  globalThis.fetch = async () => json({ error: { message: secret } }, 401);
  await assert.rejects(saveApiKey('openai', 'synthetic-rejected-key'), { code: 'invalid_api_key', message: 'invalid_api_key' });
  globalThis.fetch = async (url, options) => { assert.equal(options.headers.Authorization, `Bearer ${secret}`); return json(catalog); };
  await listApiModels('openai');
});
test('OpenAI permission, quota, network and cancellation errors do not fall back to subscription', async () => {
  for (const [status, code] of [[403, 'api_permission_denied'], [429, 'api_quota_exceeded']]) {
    let calls = 0; globalThis.fetch = async () => { calls++; return json({ error: { message: secret } }, status); };
    await assert.rejects(rewriteApi('openai', request), { code, message: code }); assert.equal(calls, 1);
  }
  globalThis.fetch = async () => { throw new Error(secret); };
  await assert.rejects(rewriteApi('openai', request), { code: 'api_network_error', message: 'api_network_error' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(rewriteApi('openai', request, controller.signal), { name: 'AbortError' });
});
test('OpenAI key removal preserves the other providers and never creates subscription state', async () => {
  globalThis.fetch = async () => json({ data: [{ id: 'claude-test' }] });
  await saveApiKey('claude', 'synthetic-claude-key');
  await removeApiKey('openai');
  assert.equal((await apiStatus('openai')).configured, false);
  assert.equal((await apiStatus('claude')).configured, true);
  await assert.rejects(rewriteApi('openai', request), { code: 'api_key_required' });
  await assert.rejects(readFile(join(directory, 'MailAiAssist/state.json')), { code: 'ENOENT' });
});
