import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../extension/auto-tags.js', import.meta.url), 'utf8');
const policy = await readFile(new URL('../extension/tag-instructions.js', import.meta.url), 'utf8');
const content = await readFile(new URL('../extension/mail-content.js', import.meta.url), 'utf8');
function fixture(saved = {}) {
  const state = { saved: { provider: 'chatgpt', model_chatgpt: 'test-model', ...saved }, calls: [], applied: [], pages: {}, headers: {}, loaded: [], listeners: [] };
  const folder = { accountId: 'a', specialUse: ['inbox'] };
  const header = id => ({ id, headerMessageId: 'message-' + id, date: '2026-10-07', size: 10, subject: 'Test', folder });
  const set = async value => {
    const changes = {};
    for (const [key, next] of Object.entries(value)) { changes[key] = { oldValue: state.saved[key], newValue: next }; state.saved[key] = next; }
    state.listeners.forEach(fn => fn(changes, 'local'));
  };
  const messenger = {
    storage: { local: { get: async () => structuredClone(state.saved), set }, onChanged: { addListener(fn) { state.listeners.push(fn); } } },
    accounts: { onCreated: { addListener(fn) { state.created = fn; } }, onDeleted: { addListener(fn) { state.deleted = fn; } } },
    messages: { listTags: async () => [{ key: 'techcalc', tag: 'TechCalc' }], onNewMailReceived: { addListener(fn) { state.receive = fn; } }, get: async id => state.headers[id] || header(id), continueList: async id => state.pages[id] },
    runtime: { connectNative() {
      let response, disconnect;
      return {
        onMessage: { addListener(fn) { response = fn; } }, onDisconnect: { addListener(fn) { disconnect = fn; } }, disconnect() { disconnect(); },
        postMessage(message) {
          state.calls.push(message);
          const reply = () => response({ id: message.id, ok: !state.fail, error: { code: 'api_quota_exceeded' }, result: message.action === 'status' ? { sharing: true, provider: message.provider } : { text: '["Product"]' } });
          if (message.action === 'rewrite' && state.hold) state.release = reply; else queueMicrotask(reply);
        }
      };
    } }
  };
  function boot() {
    const context = vm.createContext({ messenger, crypto: webcrypto, TextEncoder, setTimeout, clearTimeout, MailTagInstructions: 'product first', loadMail: async session => { state.loaded.push(session.messageId); return 'Body'; }, applyMailTags: async (session, text) => { state.applied.push(session.messageId); state.appliedNames = JSON.parse(text); } });
    vm.runInContext(policy, context); vm.runInContext(content, context); vm.runInContext('let tagQueue = Promise.resolve();', context); vm.runInContext(source, context);
  }
  boot();
  return { state, set, boot, folder, header, receive: (ids, where = folder) => state.receive(where, { messages: ids.map(header) }) };
}
test('disabled accounts and non-inbox events never read or send mail', async () => {
  const h = fixture(); await h.receive([1]);
  await h.set({ autoTagAccounts: { a: 1 } });
  await h.receive([2], { accountId: 'a', specialUse: ['sent'] });
  await h.receive([3], { accountId: 'new', specialUse: ['inbox'] });
  assert.equal(h.state.calls.length, 0); assert.equal(h.state.loaded.length, 0);
});
test('selected inbox processes pages and uses saved provider/model/tag language', async () => {
  const h = fixture({ autoTagAccounts: { a: 1 }, provider: 'gemini', model_gemini: 'gemini-test', tagLanguage: 'de' });
  h.state.pages.next = { messages: [h.header(2)] };
  await h.state.receive(h.folder, { id: 'next', messages: [h.header(1)] });
  assert.deepEqual(h.state.applied, [1, 2]);
  const request = h.state.calls.find(item => item.action === 'rewrite');
  assert.equal(request.provider, 'gemini'); assert.equal(request.model, 'gemini-test'); assert.equal(request.outputLanguage, 'de');
  assert.equal(h.state.saved.autoTagLast.state, 'success');
});
test('duplicate notifications and restart do not repeat inference', async () => {
  const h = fixture({ autoTagAccounts: { a: 1 } });
  await Promise.all([h.receive([1]), h.receive([1])]); h.boot(); await h.receive([1]);
  assert.deepEqual(h.state.applied, [1]); assert.equal(h.state.saved.autoTagSeen.length, 1);
  assert.match(h.state.saved.autoTagSeen[0], /^[a-f0-9]{64}$/);
});
test('disabling cancels active work and skips queued messages', async () => {
  const h = fixture({ autoTagAccounts: { a: 1 } }); h.state.hold = true;
  const pending = h.receive([1, 2]);
  while (!h.state.release) await new Promise(resolve => setImmediate(resolve));
  await h.set({ autoTagAccounts: {} }); await pending;
  assert.deepEqual(h.state.applied, []); assert.deepEqual(h.state.loaded, [1]);
});
test('new and deleted accounts clear eligibility; failed inference is not retried', async () => {
  const h = fixture({ autoTagAccounts: { a: 1 } });
  await h.state.created('a', { id: 'a' }); await h.receive([1]); assert.equal(h.state.calls.length, 0);
  await h.set({ autoTagAccounts: { a: 2 } }); h.state.fail = true;
  await h.receive([2]); await h.receive([2]);
  assert.equal(h.state.calls.length, 1); assert.equal(h.state.saved.autoTagLast.code, 'api_quota_exceeded');
  await h.state.deleted('a'); assert.equal(h.state.saved.autoTagAccounts.a, undefined);
});
test('moved and junk mail are skipped; old queued events stay disabled', async () => {
  const h = fixture();
  const pending = h.receive([1]); await h.set({ autoTagAccounts: { a: 1 } }); await pending;
  h.state.headers[2] = { ...h.header(2), junk: true };
  h.state.headers[3] = { ...h.header(3), folder: { accountId: 'a', specialUse: ['trash'] } };
  await h.receive([2, 3]); assert.equal(h.state.calls.length, 0);
});

for (const language of ['fr', 'it', 'es', 'pt']) test(`automatic tags honor ${language}`, async () => {
  const h = fixture({ autoTagAccounts: { a: 1 }, tagLanguage: language });
  await h.receive([1]);
  assert.equal(h.state.calls.find(call => call.action === 'rewrite').outputLanguage, language);
});

test('automatic tagging resolves configured aliases before applying tags', async () => {
 const h = fixture({ autoTagAccounts: { a: 1 }, tagAliases: [{tagKey:'techcalc', aliases:['Product']}] });
 await h.receive([1]);
 assert.deepEqual(h.state.appliedNames, ['TechCalc']);
});
