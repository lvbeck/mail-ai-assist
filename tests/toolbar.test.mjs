import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../extension/toolbar.js', import.meta.url), 'utf8');
test('compose and reading toolbars and compose menu follow all ten UI languages', async () => {
  let change, saved = 'de', created = 0;
  const items = new Map(), values = {};
  const action = name => ({ setLabel: async value => { values[name] = value.label; }, setTitle: async value => { values[name + 'Title'] = value.title; } });
  const messenger = {
    storage: { local: { get: async () => ({ uiLanguage: saved }) }, onChanged: { addListener(fn) { change = fn; } } },
    composeAction: action('compose'), messageDisplayAction: action('reading'),
    menus: { create(value) { items.set(value.id, value); created++; }, update: async (id, value) => Object.assign(items.get(id), value) }
  };
  vm.runInNewContext(source, { messenger });
  await new Promise(resolve => setImmediate(resolve));
  for (const [locale, assistant, writing, settings] of [
    ['fr', 'Assistant IA', 'Aide à la rédaction', 'Paramètres'], ['it', 'Assistente IA', 'Assistente di scrittura', 'Impostazioni'],
    ['es', 'Asistente IA', 'Asistente de escritura', 'Configuración'], ['pt', 'Assistente IA', 'Assistente de escrita', 'Definições'],
    ['en', 'AI Assist', 'Writing Assistant', 'Settings'], ['de', 'KI-Assistent', 'Schreibhilfe', 'Einstellungen'],
    ['zh-CN', 'AI 助手', '辅助写作', '设置'], ['zh-TW', 'AI 助手', '輔助寫作', '設定'], ['ja', 'AI アシスタント', '文章作成アシスタント', '設定'], ['ko', 'AI 도우미', '글쓰기 도우미', '설정']
  ]) {
    saved = locale; await change({ uiLanguage: { newValue: locale } }, 'local');
    assert.equal(items.get('account-ai').title, assistant);
    assert.equal(items.get('message-ai').title, assistant);
    for (const task of ['summary', 'translate', 'tags']) assert.ok(items.get(`message-ai-${task}`).title);
    assert.ok(items.get('account-ai-auto-tags').title);
    assert.equal(values.compose, assistant); assert.equal(values.reading, assistant);
    assert.equal(values.composeTitle, assistant);
    assert.equal(items.get('compose-ai-write').title, writing);
    assert.equal(items.get('compose-ai-settings').title, settings);
    assert.equal(items.get('message-ai-settings').title, settings);
    assert.equal(items.get('message-ai-settings').parentId, 'message-ai');
  }
  assert.equal(created, 13);
  assert.deepEqual(Array.from(items.get('compose-ai-write').contexts), ['compose_action_menu']);
});
