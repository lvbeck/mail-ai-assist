import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildRequest } from '../helper/core.mjs';
const context = vm.createContext({});
for (const name of ['translations.js', 'localization.js']) vm.runInContext(await readFile(new URL(`../extension/${name}`, import.meta.url), 'utf8'), context);
const { resolveLocale, matchLocale } = context.ComposeI18n;
test('UI locale follows Thunderbird, then system, then English', () => {
  assert.equal(resolveLocale('auto', 'de-DE', ['en-US']), 'de');
  assert.equal(resolveLocale('auto', 'nl-NL', ['nl-NL', 'zh-TW']), 'zh-TW');
  assert.equal(resolveLocale('auto', undefined, ['en-GB']), 'en');
  assert.equal(resolveLocale('auto', 'ja-JP', ['ja']), 'ja');
  assert.equal(resolveLocale('zh-CN', 'de', ['en']), 'zh-CN');
});
test('Chinese script and region fallback distinguish traditional and simplified', () => {
  for (const tag of ['zh-TW', 'zh_HK', 'zh-MO', 'zh-Hant-CN']) assert.equal(matchLocale(tag), 'zh-TW');
  for (const tag of ['zh-CN', 'zh', 'zh-SG', 'zh-Hans-HK']) assert.equal(matchLocale(tag), 'zh-CN');
});
test('all interface catalogs contain the same nonempty entries', () => {
  const catalogs = context.ComposeTranslations;
  const keys = Object.keys(catalogs.en).sort();
  for (const catalog of Object.values(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), keys);
    assert.equal(Object.values(catalog).every((value) => typeof value === 'string' && value.trim()), true);
    assert.match(catalog.connected, /\{email\}/);
    assert.match(catalog.characterCount, /\{count\}/);
  }
});
for (const [language, expected] of Object.entries({ en: 'English', de: 'German', fr: 'French', it: 'Italian', es: 'Spanish', pt: 'European Portuguese (Portugal)', 'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese', ja: 'Japanese', ko: 'Korean' })) {
  test(`all rewrite styles honor ${language}`, () => {
    for (const recipe of ['polish', 'formal', 'concise', 'friendly', 'translate', 'custom']) {
      const request = buildRequest({ model: 'test-model', recipe, text: 'Hallo', custom: 'Use French.', outputLanguage: language });
      assert.ok(request.instructions.includes(expected));
      assert.ok(request.input[0].content.includes(`Required final output language: ${expected}`));
      assert.doesNotMatch(request.input[0].content, /preserv.*original language/i);
      assert.deepEqual(JSON.parse(request.input[1].content), { source_text: 'Hallo' });
    }
  });
}
test('unknown output languages are rejected and old clients remain compatible', () => {
  for (const language of ['nl', 'constructor', '', null]) assert.throws(() => buildRequest({ model: 'test', recipe: 'polish', text: 'Hi', outputLanguage: language }), { code: 'invalid_output_language' });
  assert.match(buildRequest({ model: 'test', recipe: 'polish', text: 'Hi' }).input[0].content, /original language/);
});

test('European regional locales and placeholders remain consistent', () => {
  for (const [tag, expected] of Object.entries({ 'fr-FR': 'fr', 'fr-CA': 'fr', 'it_IT': 'it', 'es-ES': 'es', 'es-MX': 'es', 'pt-PT': 'pt', 'pt-BR': 'pt', 'ja-JP': 'ja', 'ja_JP': 'ja', 'ko-KR': 'ko', 'ko_KR': 'ko' })) {
    assert.equal(matchLocale(tag), expected);
    assert.equal(resolveLocale('auto', tag, ['en']), expected);
    assert.equal(resolveLocale(expected, 'de', ['en']), expected);
  }
  for (const lang of ['fr', 'it', 'es', 'pt', 'ja', 'ko']) for (const [key, value] of Object.entries(context.ComposeTranslations.en)) {
    const tokens = text => [...text.matchAll(/\{[a-zA-Z]+\}/g)].map(item => item[0]).sort();
    assert.deepEqual(tokens(context.ComposeTranslations[lang][key]), tokens(value), `${lang}: ${key}`);
  }
});
