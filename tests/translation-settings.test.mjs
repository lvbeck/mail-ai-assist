import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../extension/google-settings.js', import.meta.url), 'utf8');
test('translation settings default to none, persist selection and scope credential actions', async () => {
  const elements = new Map(), requests = [], saved = {};
  const credentials = { google: { configured: true }, azure: { configured: true, region: 'westeurope' }, deepl: { configured: false } };
  const el = id => {
    if (!elements.has(id)) elements.set(id, { value: '', listeners: {}, addEventListener(event, callback) { this.listeners[event] = callback; } });
    return elements.get(id);
  };
  const context = vm.createContext({ setTimeout, clearTimeout,
    document: { getElementById: el }, window: { addEventListener() {} }, ComposeI18n: { t: value => value, initialize: async () => {} },
    messenger: { storage: { local: { get: async () => ({ ...saved }), set: async value => Object.assign(saved, value) } }, runtime: { connectNative() {
      let response;
      return { onMessage: { addListener(fn) { response = fn; } }, onDisconnect: { addListener() {} }, disconnect() {}, postMessage(message) {
        requests.push(message);
        if (message.action === 'translationSave') credentials[message.service] = { configured: true };
        if (message.action === 'translationRemove') credentials[message.service] = { configured: false };
        queueMicrotask(() => response({ ok: true, result: credentials[message.service] }));
      } };
    } } }
  });
  vm.runInContext(source, context); await new Promise(resolve => setImmediate(resolve));
  assert.equal(el('translationService').value, 'none'); assert.equal(requests.length, 0);
  assert.equal(el('translationCredentials').hidden, true);
  el('translationService').value = 'azure'; await el('translationService').listeners.change();
  assert.equal(saved.translationService, 'azure'); assert.equal(el('azureRegion').value, 'westeurope');
  await el('translationRemove').listeners.click(); assert.equal(credentials.google.configured, true);
  assert.equal(credentials.azure.configured, false);
  el('translationService').value = 'deepl'; await el('translationService').listeners.change();
  el('translationKey').value = 'synthetic-deepl-key:fx'; await el('translationSave').listeners.click();
  assert.equal(requests.at(-1).service, 'deepl'); assert.equal(el('translationKey').value, '');
  const before = requests.length;
  el('translationService').value = 'none'; await el('translationService').listeners.change();
  assert.equal(saved.translationService, 'none'); assert.equal(requests.length, before);
  assert.equal(credentials.deepl.configured, true);
});
