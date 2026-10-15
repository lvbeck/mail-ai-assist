import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const root = new URL('../extension/', import.meta.url);
test('manual tags close only after successfully applying edited names', async () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', hidden: ['undo', 'confirmTags'].includes(id), classList: { toggle() {} }, listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } });
    return elements.get(id);
  };
  const writes = [];
  let receive;
  let closed = 0, failWrite = true;
  const context = vm.createContext({
    URLSearchParams, location: { search: '?key=test' },
    document: { getElementById: element, documentElement: { lang: 'en' } },
    window: { addEventListener() {}, close() { closed++; } },
    ComposeI18n: { t: text => text, initialize: async () => {} }, MailTagInstructions: 'Tags',
    messenger: {
      storage: { local: { get: async () => ({ taskModel: 'test' }) } },
      runtime: {
        sendMessage: async message => {
          if (message.action === 'load') return { ok: true, task: 'tags', subject: 'Test', text: 'Body', existingTags: [{key:'tc',tag:'TechCalc'}, {key:'h',tag:'Helena'}], tagAliases: [{tagKey:'h',aliases:['Suggested','Edited product']}] };
          writes.push(message);
          if (failWrite) return { ok: false, error: 'mail_operation_failed' };
          return { ok: true, names: message.text ? JSON.parse(message.text) : [] };
        },
        connectNative: () => ({ onMessage: { addListener: fn => { receive = fn; } }, onDisconnect: { addListener() {} }, postMessage: message => {
          queueMicrotask(() => receive({ id: message.id, ok: true, result: message.action === 'status' ? { sharing: true } : { text: '["TechCalc 3.0", "Suggested"]' } }));
        } })
      }
    }
  });
  vm.runInContext(await readFile(new URL('mail-content.js', root), 'utf8'), context);
  vm.runInContext(await readFile(new URL('summary-instructions.js', root), 'utf8'), context);
  vm.runInContext(await readFile(new URL('tag-instructions.js', root), 'utf8'), context);
  vm.runInContext(await readFile(new URL('mail-reader.js', root), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes.length, 0);
  assert.equal(element('mailResult').readOnly, false);
  assert.equal(element('mailResult').value, 'TechCalc\nHelena');
  element('mailResult').value = 'Edited product\n\n Support ';
  await element('confirmTags').listeners.click();
  assert.equal(closed, 0);
  assert.equal(element('mailResult').value, 'Edited product\n\n Support ');
  assert.equal(element('mailResult').readOnly, false);
  failWrite = false;
  await element('confirmTags').listeners.click();
  assert.equal(closed, 1);
  assert.deepEqual(JSON.parse(writes[0].text), ['Edited product', 'Support']);
  assert.equal(element('mailResult').readOnly, true);
  await element('confirmTags').listeners.click();
  assert.equal(writes.length, 2);
  await element('undo').listeners.click();
  assert.equal(element('mailResult').readOnly, false);
  element('mailResult').value = 'x'.repeat(33);
  await element('confirmTags').listeners.click();
  assert.equal(writes.length, 3);
  assert.equal(closed, 1);
  assert.equal(element('status').textContent, 'invalid_tags');
  element('mailResult').value = '';
  element('mailResult').listeners.input();
  assert.equal(element('confirmTags').disabled, true);
});
