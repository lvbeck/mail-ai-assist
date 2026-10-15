import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { translateGoogle } from '../helper/google-translate.mjs';
import { translateService } from '../helper/translation-services.mjs';
const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('Japanese and Korean are the final choices in every language selector', async () => {
  let selectors = 0;
  for (const name of ['extension/settings.html', 'extension/rewrite.html', 'installer/setup-guide.html']) {
    const html = await read(name);
    for (const match of html.matchAll(/<select\b[^>]*>([\s\S]*?)<\/select>/g)) {
      const values = [...match[1].matchAll(/<option\b[^>]*value="([^"]+)"/g)].map(value => value[1]);
      if (!values.includes('zh-TW')) continue;
      assert.deepEqual(values.slice(-3), ['zh-TW', 'ja', 'ko'], name);
      assert.equal(new Set(values).size, values.length);
      selectors++;
    }
  }
  assert.ok(selectors >= 6);
});

test('summary auto language follows Japanese and Korean systems', async () => {
  for (const [system, expected] of [['ja-JP', 'ja'], ['ko-KR', 'ko']]) {
    const context = { messenger: { i18n: { getPreferredSystemLanguages: async () => [system], getUILanguage: async () => 'en' } } };
    vm.runInNewContext(await read('extension/summary-instructions.js'), context);
    assert.equal(await context.MailSummaryLanguage('auto'), expected);
  }
});

for (const service of ['google', 'azure', 'deepl']) for (const target of ['ja', 'ko']) {
  test(`${service} sends valid Japanese and Korean source and target codes: ${target}`, async () => {
    const source = target === 'ja' ? 'ko' : 'ja';
    const previous = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      const body = JSON.parse(options.body);
      if (service === 'google') {
        assert.equal(body.source, source); assert.equal(body.target, target);
        return new Response(JSON.stringify({ data: { translations: [{ translatedText: 'Translated' }] } }));
      }
      if (service === 'azure') {
        const query = new URL(url).searchParams;
        assert.equal(query.get('from'), source); assert.equal(query.get('to'), target);
        return new Response(JSON.stringify([{ translations: [{ text: 'Translated' }] }]));
      }
      assert.equal(body.source_lang, source.toUpperCase()); assert.equal(body.target_lang, target.toUpperCase());
      return new Response(JSON.stringify({ translations: [{ text: 'Translated' }] }));
    };
    try {
      const input = { text: 'Sample email', sourceLanguage: source, outputLanguage: target };
      const result = service === 'google' ? await translateGoogle(input, 'synthetic') : await translateService(service, { key: 'synthetic' }, input);
      assert.equal(result.text, 'Translated'); assert.equal(calls, 1);
    } finally { globalThis.fetch = previous; }
  });
}

test('ten README language links resolve and setup guide catalogs are complete', async () => {
  const files = ['README.md', ...['de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'].map(lang => `README.${lang}.md`)];
  for (const name of files) {
    const nav = (await read(name)).split('\n')[2].trim();
    for (const file of files) assert.ok(nav.includes(`](${file})`), `${name}: ${file}`);
    assert.ok(nav.endsWith('[日本語](README.ja.md) · [한국어](README.ko.md)'));
  }
  const pages = JSON.parse(await read('installer/page-texts.json'));
  for (const section of ['texts', 'download']) for (const lang of ['ja', 'ko']) {
    assert.equal(pages[section][lang].length, pages[section].en.length);
    assert.ok(pages[section][lang].every(value => value.trim()));
  }
});
