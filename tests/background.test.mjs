import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../extension/background.js', import.meta.url), 'utf8');

function harness() {
  const callbacks = {}; const sent = []; const opened = []; const focused = [];
  const messenger = {
    scripting: { compose: { getRegisteredScripts: async () => [], registerScripts: async () => {} }, executeScript: async () => {} },
    composeAction: { onClicked: { addListener(fn) { callbacks.click = fn; } } },
    menus: { onClicked: { addListener(fn) { callbacks.menu = fn; } } },
    tabs: { sendMessage: async (id, message) => {
      sent.push({ id, ...message });
      return message.action === 'capture' ? { ok: true, text: `Draft ${id}` } : { ok: true };
    }, get: async (id) => ({ windowId: id + 1000 }) },
    runtime: { getURL: (path) => `moz-extension://test/${path}`, onMessage: { addListener(fn) { callbacks.message = fn; } } },
    windows: {
      create: async (options) => { const window = { id: 100 + opened.length, ...options }; opened.push(window); return window; },
      update: async (id) => { focused.push(id); },
      onRemoved: { addListener(fn) { callbacks.remove = fn; } }
    }
  };
  vm.runInNewContext(source, { messenger, crypto: webcrypto, Map, Set });
  return { callbacks, sent, opened, focused };
}
test('two drafts retain independent selection tokens and source windows', async () => {
  const h = harness();
  await h.callbacks.menu({ menuItemId: 'compose-ai-write' }, { id: 1 }); await h.callbacks.menu({ menuItemId: 'compose-ai-write' }, { id: 2 });
  const keys = h.opened.map((window) => new URL(window.url).searchParams.get('key'));
  assert.notEqual(keys[0], keys[1]);
  for (let index = 0; index < 2; index++) {
    const sender = { url: h.opened[index].url };
    const load = await h.callbacks.message({ scope: 'compose-ai-dialog', action: 'load', key: keys[index] }, sender);
    assert.equal(load.text, `Draft ${index + 1}`);
    await h.callbacks.message({ scope: 'compose-ai-dialog', action: 'replace', key: keys[index], text: 'Replacement' }, sender);
  }
  assert.deepEqual(h.sent.filter((message) => message.action === 'replace').map((message) => message.id), [1, 2]);
});
test('repeat clicks focus existing dialog and cleanup releases range', async () => {
  const h = harness();
  await h.callbacks.click({ id: 3 }); await h.callbacks.click({ id: 3 });
  assert.equal(h.opened.length, 1); assert.equal(h.focused[0], 100);
  const key = new URL(h.opened[0].url).searchParams.get('key');
  h.callbacks.remove(100);
  const response = await h.callbacks.message({ scope: 'compose-ai-dialog', action: 'load', key }, { url: h.opened[0].url });
  assert.equal(response.ok, false);
  assert.equal(h.sent.at(-1).action, 'release');
});
test('content pages cannot invoke privileged dialog operations', () => {
  const h = harness();
  assert.equal(h.callbacks.message({ scope: 'compose-ai-dialog', action: 'replace', key: 'x' }, { url: 'https://evil.invalid/' }), undefined);
});
