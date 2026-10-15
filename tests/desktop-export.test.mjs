import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { serializeMail, revealDesktop, parseDesktopResult } from '../helper/desktop-export.mjs';
const context = vm.createContext({});
vm.runInContext(await readFile(new URL('../extension/mail-export.js', import.meta.url), 'utf8'), context);
const api = context.MailExport;
test('export accepts Thunderbird root and excludes attachment payloads and quoted replies', () => {
  const tree = { contentType: 'message/rfc822', parts: [{ contentType: 'multipart/mixed', parts: [
    { contentType: 'text/plain', body: 'Current body\n\nOn Monday Alice wrote:\nSecret history' },
    { contentType: 'text/plain', name: 'secret.txt', body: 'Attachment secret' },
    { contentType: 'message/rfc822', parts: [{ contentType: 'text/plain', body: 'Attached message' }] }
  ] }] };
  assert.equal(api.extract(tree, false, () => ''), 'Current body');
  assert.match(api.extract(tree, true, () => ''), /Secret history/);
  assert.doesNotMatch(api.extract(tree, true, () => ''), /Attachment secret|Attached message/);
  assert.equal(api.stripQuotes('Current\n> Old\n\nAm Montag schrieb Alice:\nHistory'), 'Current');
});
test('alternative prefers structural HTML quote filtering without duplicating text', () => {
  const tree = { contentType: 'multipart/alternative', parts: [{ contentType: 'text/plain', body: 'Plain' }, { contentType: 'text/html', body: '<p>HTML</p>' }] };
  assert.equal(api.extract(tree, false, (html, include) => { assert.equal(include, false); return 'Filtered HTML'; }), 'Filtered HTML');
});
test('TXT normalizes newlines and rejects regenerated EML', () => {
  const mail = { subject: 'Hello\r\nInjected', body: 'Grüße\r\n你好' };
  assert.match(serializeMail(mail, 'txt'), /Grüße\r\n你好/);
  assert.throws(() => serializeMail(mail, 'eml'), /desktop_invalid/);
});
test('empty or oversized input and unknown session are rejected without desktop access', async () => {
  for (const mail of [null, { body: '' }, { body: '中'.repeat(70000) }]) assert.throws(() => serializeMail(mail, 'txt'));
  assert.throws(() => serializeMail({ body: 'hello' }, 'exe'));
  await assert.rejects(revealDesktop({ token: 'foreign' }), /desktop_invalid/);
});

test('empty HTML alternative falls back to filtered plain text, never unfiltered history', () => {
  const tree = { contentType: 'multipart/alternative', parts: [
    { contentType: 'text/html', body: '<blockquote>Reply and history</blockquote>' },
    { contentType: 'text/plain', body: 'My reply\n> Old message' }
  ] };
  assert.equal(api.extract(tree, false, () => ''), 'My reply');
  tree.parts[1].body = '> Only history';
  assert.equal(api.extract(tree, false, () => ''), '');
});
test('desktop failure stage survives transport and unknown errors are sanitized', () => {
  for (const code of ['desktop_window', 'desktop_control', 'desktop_picker', 'desktop_file_input', 'desktop_verify']) {
    assert.throws(() => parseDesktopResult(JSON.stringify({ ok: false, code }), 1), error => error.code === code);
  }
  assert.throws(() => parseDesktopResult('{"ok":false,"code":"private data"}', 1), /desktop_failed/);
  assert.throws(() => parseDesktopResult('invalid', 1), /desktop_failed/);
  assert.deepEqual(parseDesktopResult('{"ok":true,"visible":true}', 0), { ok: true, visible: true });
});
