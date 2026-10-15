import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const root = new URL('../extension/', import.meta.url);
for (const service of ['google', 'azure', 'deepl']) for (const [language, name] of Object.entries({ fr: 'French', it: 'Italian', es: 'Spanish', pt: 'European Portuguese (Portugal)' })) for (const task of ['translate']) {
  test(`${service} ${task} uses ${language} in reader requests`, async () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', hidden: ['undo', 'confirmTags'].includes(id), classList: { toggle() {} }, listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } });
    return elements.get(id);
  };
  const writes = [];
  let receive;
  let closed = 0, failWrite = true;
  const requests = [];
  const context = vm.createContext({
    URLSearchParams, location: { search: '?key=test' },
    document: { getElementById: element, documentElement: { lang: language } },
    window: { addEventListener() {}, close() { closed++; } },
    ComposeI18n: { t: text => text, initialize: async () => {} }, MailTagInstructions: 'Tags',
    messenger: {
      storage: { local: { get: async () => ({ translationService: service, taskModel: '', translationLanguage: language, translationSourceLanguage: language, tagLanguage: language }) } },
      runtime: {
        sendMessage: async message => {
          if (message.action === 'load') return { ok: true, task, subject: 'Test', text: 'Body' };
          writes.push(message);
          if (failWrite) return { ok: false, error: 'mail_operation_failed' };
          return { ok: true, names: message.text ? JSON.parse(message.text) : [] };
        },
        connectNative: () => ({ onMessage: { addListener: fn => { receive = fn; } }, onDisconnect: { addListener() {} }, postMessage: message => {
          requests.push(message);
          queueMicrotask(() => receive({ id: message.id, ok: true, result: message.action === 'translationStatus' ? { configured: true } : message.action === 'cacheGet' ? { generation: 'test', text: 'Cached result' } : message.action === 'cachePut' ? { stored: true } : message.action === 'status' ? { sharing: true } : { text: '["Original", "Suggested"]' } }));
        } })
      }
    }
  });
  vm.runInContext(await readFile(new URL('mail-content.js', root), 'utf8'), context);
  vm.runInContext(await readFile(new URL('summary-instructions.js', root), 'utf8'), context);
  vm.runInContext(await readFile(new URL('tag-instructions.js', root), 'utf8'), context);
  vm.runInContext(await readFile(new URL('mail-reader.js', root), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));

  if (task !== 'tags') {
    assert.equal(element('mailResult').value, 'Cached result');
    assert.equal(requests.some(item => ['rewrite', 'status'].includes(item.action)), false);
    await element('retry').listeners.click();
    assert.equal(requests.filter(item => item.action === 'translationTranslate').length, 1);
    assert.equal(requests.find(item => item.action === 'cachePut').text, '["Original", "Suggested"]');
  }
  const request = requests.find(item => item.action === 'translationTranslate');
  assert.equal(requests.some(item => ['rewrite', 'status'].includes(item.action)), false);
  assert.equal(requests.find(item => item.action === 'cachePut').descriptor.provider, service);
  assert.equal(request.outputLanguage, language);
  assert.equal(request.sourceLanguage, language);
  assert.equal(writes.length, 0);
  });
}
