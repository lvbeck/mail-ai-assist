import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const root = new URL('../extension/', import.meta.url);
const source = await readFile(new URL('rewrite.js', root), 'utf8');
const html = await readFile(new URL('settings.html', root), 'utf8');
test('OpenAI settings isolate model selection, key controls and subscription state', async () => {
  assert.match(html, /<option value="openai">OpenAI API<\/option>/);
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
    value: '', options: [], listeners: {}, classList: { toggle() {} },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    replaceChildren(...items) { this.options = items; }, add(item) { this.options.push(item); }
  }]));
  const saved = { provider: 'openai', model_openai: 'gpt-test', model_chatgpt: 'subscription-test', taskModel: 'legacy-subscription' };
  const requests = [];
  let receive;
  const context = vm.createContext({
    URL, URLSearchParams, location: { search: '' }, setInterval() {},
    document: { body: { dataset: { page: 'settings' } }, documentElement: { lang: 'zh-CN' }, getElementById: id => elements.get(id) },
    window: { addEventListener() {} }, Option: class { constructor(text, value) { this.textContent = text; this.value = value; } },
    ComposeI18n: { t: text => text, initialize: () => new Promise(() => {}) },
    messenger: {
      storage: { onChanged: { addListener() {} }, local: {
        get: async keys => Object.fromEntries(keys.filter(key => Object.hasOwn(saved, key)).map(key => [key, saved[key]])),
        set: async values => Object.assign(saved, values)
      } },
      runtime: { connectNative: () => ({ onMessage: { addListener: fn => { receive = fn; } }, onDisconnect: { addListener() {} }, postMessage(message) {
        requests.push(message);
        const result = message.action === 'models' ? [{ slug: message.provider === 'openai' ? 'gpt-test' : 'subscription-test', displayName: 'Test' }] : { provider: message.provider, sharing: true };
        queueMicrotask(() => receive({ id: message.id, ok: true, result }));
      } }) }
    }
  });
  vm.runInContext(source, context);
  vm.runInContext('busy = false;', context);
  await vm.runInContext('connect(); loadAccount()', context);
  assert.equal(elements.get('model').value, 'gpt-test');
  assert.equal(elements.get('apiControls').hidden, false); assert.equal(elements.get('chatgptControls').hidden, true);
  assert.equal(elements.get('apiConsole').href, 'https://platform.openai.com/api-keys');
  assert.match(elements.get('providerNote').textContent, /OpenAI API/);
  elements.get('apiKey').value = 'synthetic-openai-key';
  await elements.get('saveKey').listeners.click();
  assert.equal(elements.get('apiKey').value, '');
  assert.equal(requests.find(item => item.action === 'saveApiKey').provider, 'openai');
  assert.equal(JSON.stringify(saved).includes('synthetic-openai-key'), false);
  saved.provider = 'chatgpt'; await vm.runInContext('loadAccount()', context);
  assert.equal(elements.get('model').value, 'subscription-test');
  assert.equal(elements.get('apiControls').hidden, true); assert.equal(elements.get('chatgptControls').hidden, false);
  saved.provider = 'openai'; await vm.runInContext('loadAccount()', context);
  assert.equal(elements.get('model').value, 'gpt-test');
  delete saved.model_openai; await vm.runInContext('loadAccount()', context);
  assert.equal(elements.get('model').value, '');
  assert.equal(saved.model_chatgpt, 'subscription-test');
  saved.provider = 'ollama';
  await vm.runInContext('loadAccount()', context);
  assert.equal(elements.get('apiControls').hidden, true);
  assert.equal(elements.get('ollamaControls').hidden, false);
  assert.equal(requests.at(-1).ollamaServer, 'http://localhost:11434');
  elements.get('ollamaServer').value = 'https://mail.example.test/';
  await elements.get('ollamaSave').listeners.click();
  assert.equal(saved.ollamaServer, 'https://mail.example.test');
  assert.equal(saved.model_ollama, '');
  assert.equal(elements.get('model').options.at(-1).value, 'subscription-test');
  context.window.confirm = () => false;
  elements.get('ollamaServer').value = 'http://other.example.test';
  await elements.get('ollamaSave').listeners.click();
  assert.equal(saved.ollamaServer, 'https://mail.example.test');
  assert.ok(!requests.some(item => item.ollamaServer === 'http://other.example.test'));
  assert.equal(requests.filter(item => item.action === 'helperUpdateStatus').at(-1).provider, 'chatgpt');

});
