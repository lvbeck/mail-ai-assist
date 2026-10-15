import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../extension/', import.meta.url);

test('setup opens on first install only and does not require new permissions', async () => {
  let listener, opened = 0;
  const source = await readFile(new URL('onboarding.js', root), 'utf8');
  vm.runInNewContext(source, { messenger: { runtime: {
    onInstalled: { addListener(fn) { listener = fn; } },
    openOptionsPage() { opened++; return Promise.resolve(); }
  } } });
  listener({ reason: 'update' }); listener({ reason: 'browser_update' });
  assert.equal(opened, 0);
  listener({ reason: 'install' }); assert.equal(opened, 1);
});

test('setup guidance is translated in ten languages and links to local privacy policy', async () => {
  const context = {};
  vm.runInNewContext(await readFile(new URL('translations.js', root), 'utf8'), context);
  const html = await readFile(new URL('settings.html', root), 'utf8');
  const panel = html.match(/<section class="settings-group helper-setup">([\s\S]*?)<\/section>/)[1];
  const keys = [...panel.matchAll(/>([^<>]+)</g)].map(match => match[1].trim()).filter(Boolean);
  for (const locale of ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
    for (const key of keys) assert.ok(context.ComposeTranslations[locale][key], `${locale}: ${key}`);
  }
  assert.match(panel, /github\.com\/lvbeck\/mail-ai-assist\/releases\/latest/);
  assert.match(panel, /href="privacy.html"/);
  await readFile(new URL('privacy.html', root));
  assert.doesNotMatch(JSON.stringify(context.ComposeTranslations), /Install-Helper\.ps1|Update-Helper\.cmd/);
});
