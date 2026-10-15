const summarySource = await readFile(new URL('../extension/summary-instructions.js', import.meta.url), 'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../extension/auto-summary.js', import.meta.url), 'utf8');
function fixture(saved = {}) {
  const state = { now: new Date(2026, 9, 13, 12).getTime(), saved: { provider: 'chatgpt', model_chatgpt: 'test-model', ...saved }, calls: [], applied: [], pages: {}, headers: {}, loaded: [], listeners: [] };
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
    messages: { onNewMailReceived: { addListener(fn) { state.receive = fn; } }, get: async id => state.headers[id] || header(id), continueList: async id => state.pages[id] },
    runtime: { connectNative() {
      let response, disconnect;
      return {
        onMessage: { addListener(fn) { response = fn; } }, onDisconnect: { addListener(fn) { disconnect = fn; } }, disconnect() { disconnect(); },
        postMessage(message) {
          state.calls.push(message);
          const reply = () => response({ id: message.id, ok: !(state.fail && message.action === 'rewrite'), error: { code: 'api_quota_exceeded' }, result: message.action === 'cacheGet' ? { generation: 'test', text: state.cacheHit ? 'Cached' : undefined } : message.action === 'cachePut' ? { stored: true } : message.action === 'status' ? { sharing: true, provider: message.provider } : { text: '["Product"]' } });
          state.beforeReply?.(message);
          if (message.action === 'rewrite' && state.hold) state.release = reply; else queueMicrotask(reply);
        }
      };
    } }
  };
  function boot() {
    class Clock extends Date { constructor(...args) { super(...(args.length ? args : [state.now])); } static now() { return state.now; } }
    const context = vm.createContext({ Date: Clock, messenger, crypto: webcrypto, TextEncoder, setTimeout, clearTimeout, MailUiLocale: 'en', MailSummaryInstructions: 'product first', loadMail: async session => { state.loaded.push(session.messageId); return 'Body'; }, applyMailTags: async session => { state.applied.push(session.messageId); } });
    vm.runInContext('let tagQueue = Promise.resolve();', context); vm.runInContext(summarySource, context); vm.runInContext(source, context);
  }
  boot();
  return { state, set, boot, folder, header, receive: (ids, where = folder) => state.receive(where, { messages: ids.map(header) }) };
}

test('automatic summaries default off and only process enabled inbox accounts', async () => {
 const h = fixture(); await h.receive([1]); assert.equal(h.state.calls.length, 0);
 await h.set({ autoSummaryAccounts: { a: 1 } });
 await h.receive([2], { accountId: 'b', type: 'inbox' });
 await h.receive([3], { accountId: 'a', type: 'sent' });
 assert.equal(h.state.calls.length, 0);
 await h.receive([4]);
 assert.equal(h.state.calls.filter(call => call.action === 'rewrite').length, 1);
 assert.equal(h.state.calls.find(call => call.action === 'cachePut').descriptor.task, 'summary');
 assert.equal(h.state.applied.length, 0);
 await h.receive([4]); assert.equal(h.state.calls.filter(call => call.action === 'rewrite').length, 1);
 await h.state.created('a'); assert.equal(h.state.saved.autoSummaryAccounts.a, undefined);
});

test('daily limits survive restart, count failed requests, reset on a new day and do not charge cache hits', async () => {
  const h = fixture({ autoSummaryAccounts: { a: 1, b: 1 }, autoSummaryDailyLimit: 2 });
  h.state.fail = true;
  await h.receive([1]);
  h.state.fail = false;
  await h.receive([2, 3]);
  assert.equal(h.state.calls.filter(call => call.action === 'rewrite').length, 2);
  assert.equal(h.state.saved.autoSummaryLast.code, 'auto_summary_limit');
  h.boot(); await h.receive([4]);
  assert.equal(h.state.calls.filter(call => call.action === 'rewrite').length, 2);
  h.state.cacheHit = true; await h.receive([5]);
  assert.equal(h.state.saved.autoSummaryLast.state, 'success');
  assert.equal(h.state.saved.autoSummaryUsage.a.count, 2);
  h.state.cacheHit = false;
  h.state.headers[6] = { ...h.header(6), folder: { accountId: 'b', type: 'inbox' } };
  await h.receive([6], h.state.headers[6].folder);
  assert.equal(h.state.saved.autoSummaryUsage.b.count, 1);
  h.state.now = new Date(2026, 9, 14, 12).getTime();
  await h.receive([7]);
  assert.equal(h.state.saved.autoSummaryUsage.a.count, 1);
  assert.equal(h.state.calls.filter(call => call.action === 'rewrite').length, 4);
});

test('junk or moved messages are excluded again just before a paid request', async () => {
  const h = fixture({ autoSummaryAccounts: { a: 1 } });
  h.state.beforeReply = message => { if (message.action === 'status') h.state.headers[1] = { ...h.header(1), junk: true }; };
  await h.receive([1]);
  assert.equal(h.state.calls.some(call => call.action === 'rewrite'), false);
  assert.equal(h.state.saved.autoSummaryUsage, undefined);
});

test('a cancelled in-flight attempt still consumes the daily allowance', async () => {
  const h = fixture({ autoSummaryAccounts: { a: 1 }, autoSummaryDailyLimit: 1 });
  h.state.hold = true;
  const pending = h.receive([1]);
  while (!h.state.release) await new Promise(resolve => setImmediate(resolve));
  await h.set({ autoSummaryAccounts: {} }); await pending;
  h.state.hold = false; await h.set({ autoSummaryAccounts: { a: 2 } }); await h.receive([2]);
  assert.equal(h.state.calls.filter(call => call.action === 'rewrite').length, 1);
  assert.equal(h.state.saved.autoSummaryLast.code, 'auto_summary_limit');
});
test('automatic summaries reuse cached results and cancel queued work when disabled', async () => {
 const h = fixture({ autoSummaryAccounts: { a: 1 } }); h.state.cacheHit = true;
 await h.receive([1]); assert.equal(h.state.calls.some(call => call.action === 'rewrite'), false);
 h.state.cacheHit = false; h.state.hold = true;
 const pending = h.receive([2, 3]);
 while (!h.state.release) await new Promise(resolve => setImmediate(resolve));
 await h.set({ autoSummaryAccounts: {} }); await pending;
 assert.equal(h.state.calls.some(call => call.action === 'cachePut'), false);
 assert.deepEqual(h.state.loaded, [1, 2]);
});
