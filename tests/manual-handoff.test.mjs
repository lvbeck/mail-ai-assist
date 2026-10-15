import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
test('manual handoff copies only the path and retains exports when closing', async () => {
  const source = await readFile(new URL('../extension/send-ai.js', import.meta.url), 'utf8');
  const nodes = new Map(); const actions = []; let receive, copied, closed = false, selectedFormat = 'txt';
  const node = id => { if (!nodes.has(id)) nodes.set(id, { value: '', checked: false, addEventListener(name, fn) { this[name] = fn; }, setAttribute() {}, focus() {}, select() {} }); return nodes.get(id); };
  const port = { onMessage: { addListener(fn) { receive = fn; } }, onDisconnect: { addListener() {} }, disconnect() {}, postMessage(message) {
    actions.push(message.action);
    queueMicrotask(() => receive({ id: message.id, ok: true, result: message.action === 'prepareDesktop' ? { token: 'session', path: 'C:\\Export\\mail.txt', opened: true, revealed: true } : { removed: true } }));
  } };
  await vm.runInNewContext(source, {
    ComposeI18n: { initialize: async () => {}, t: key => key }, ComposeTranslations: { en: {} }, URL, location: { href: 'https://local/send-ai.html?key=key' },
    document: { getElementById: node, querySelector: () => ({ value: selectedFormat }), querySelectorAll: () => [node('txtRadio'), node('emlRadio')] },
    navigator: { clipboard: { writeText: async value => { copied = value; } } },
    window: { addEventListener() {}, close() { assert.ok(!actions.includes('cleanupDesktop')); closed = true; } },
    messenger: { storage: { local: { get: async () => ({ desktopTarget: 'codex' }) } }, runtime: { connectNative: () => port, sendMessage: async () => ({ ok: true, mail: { body: 'body' } }) } },
    setTimeout, clearTimeout
  });
  selectedFormat = 'eml'; await node('emlRadio').change();
  assert.equal(node('quotes').checked, true); assert.equal(node('quotes').disabled, true);
  selectedFormat = 'txt'; await node('txtRadio').change();
  assert.equal(node('quotes').checked, false); assert.equal(node('quotes').disabled, false);
  node('quotes').checked = true; await node('quotes').change();
  selectedFormat = 'eml'; await node('emlRadio').change();
  selectedFormat = 'txt'; await node('txtRadio').change();
  assert.equal(node('quotes').checked, true);
  await node('prepare').click();
  assert.equal(node('copyPath').hidden, false);
  assert.equal(node('close').disabled, false);
  await node('copyPath').click(); assert.equal(copied, 'C:\\Export\\mail.txt');
  await node('reveal').click(); assert.equal(actions.at(-1), 'revealDesktop');
  await node('close').click(); assert.equal(closed, true);
  assert.deepEqual(actions, ['prepareDesktop', 'revealDesktop']);
});
