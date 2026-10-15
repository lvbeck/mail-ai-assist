import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { AppError } from '../helper/core.mjs';
import { validateProvider } from '../helper/providers.mjs';
test('native host routes every provider explicitly and never falls back', async () => {
  const sent = [], calls = [];
  const source = (await readFile(new URL('../helper/host.mjs', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
  const context = vm.createContext({ Buffer, Map, AbortController, AbortSignal, AppError, validateProvider, startUpdateCheck() {},
    API_ORIGIN: 'https://api.openai.com/v1',
    process: { stdin: { on() {} }, stdout: { on() {}, write(buffer) { sent.push(JSON.parse(buffer.subarray(4))); } } },
    getSession: async () => { calls.push('chatgpt-status'); return { sharing: true }; },
    apiStatus: async provider => { calls.push(provider+'-status'); return { provider, sharing: true }; },
    listModels: async () => { calls.push('chatgpt-models'); return []; },
    listApiModels: async provider => { calls.push(provider+'-models'); return []; },
    getAccessToken: async () => { calls.push('chatgpt-token'); return 'synthetic-token'; },
    fetch: async url => { assert.equal(url, 'https://api.openai.com/v1/responses'); return { ok: true }; },
    buildRequest: () => ({}), consumeHttpResponse: async () => ({ text: 'ChatGPT result' }),
    rewriteApi: async provider => { calls.push(provider+'-rewrite'); return { text: provider }; },
    saveApiKey: async provider => { calls.push(provider+'-save'); return { configured: true }; },
    removeApiKey: async provider => { calls.push(provider+'-remove'); return {}; },
    signIn: async () => { calls.push('chatgpt-signIn'); return {}; }, signOut: async () => { calls.push('chatgpt-signOut'); return {}; }
  });
  vm.runInContext(source, context);
  let id = 0;
  for (const provider of ['chatgpt', 'gemini', 'claude']) {
    for (const action of ['status','models','rewrite','signOut']) {
      await context.handle({ id: ++id, action, provider }); assert.equal(sent.at(-1).ok, true);
    }
  }
  assert.equal(calls.filter(value => value === 'chatgpt-token').length, 1);
  assert.ok(calls.includes('gemini-rewrite')); assert.ok(calls.includes('claude-rewrite'));
  await context.handle({ id: ++id, action: 'rewrite', provider: 'unknown' });
  assert.equal(sent.at(-1).error.code, 'invalid_provider');
  await context.handle({ id: ++id, action: 'signIn', provider: 'claude' });
  assert.equal(sent.at(-1).error.code, 'invalid_provider');
  await context.handle({ id: ++id, action: 'status' });
  assert.equal(sent.at(-1).result.provider, 'chatgpt');
});
