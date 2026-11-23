import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { listOllamaModels, ollamaServer, rewriteOllama } from '../helper/ollama.mjs';

test('Ollama discovers tagged models on loopback without credentials', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://localhost:11434/api/tags');
    assert.equal(options.headers, undefined);
    assert.equal(options.redirect, 'error');
    return Response.json({ models: [{ name: 'team/demo:8b' }, { name: 'team/demo:8b' }, null] });
  });
  assert.deepEqual(await listOllamaModels(), [{ slug: 'team/demo:8b', displayName: 'team/demo:8b' }]);
});

test('Ollama sends the mail envelope only to the configured chat endpoint', async t => {
  const input = { text: 'Example', model: 'team/demo:8b', recipe: 'formal', ollamaServer: 'https://example.test/prefix/' };
  let reason = 'stop';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.test/prefix/api/chat');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(options.headers, { 'Content-Type': 'application/json' });
    const body = JSON.parse(options.body);
    assert.equal(body.model, input.model);
    assert.deepEqual(JSON.parse(body.messages[1].content), { source_text: input.text });
    return Response.json({ done: true, done_reason: reason, message: { role: 'assistant', content: 'Result' } });
  });
  assert.deepEqual(await rewriteOllama(input), { text: 'Result' });
  reason = 'length';
  await assert.rejects(rewriteOllama(input), { code: 'incomplete_response' });
});

test('Ollama rejects ambiguous or credential-bearing server addresses', () => {
  for (const value of [null, 'invalid', 'file:///tmp', 'https://user@host', 'https://host/?key=x', 'https://host/#x', 'https://host/?', 'https://host/#']) {
    assert.throws(() => ollamaServer(value), { code: 'invalid_ollama_server' });
  }
});

test('extension and native helper enforce the same saved server policy', async () => {
  const source = await readFile(new URL('../extension/ollama-server.js', import.meta.url), 'utf8');
  const frontend = vm.runInNewContext(source + '\nollamaServer', { URL });
  for (const normalize of [frontend, ollamaServer]) {
    assert.equal(normalize('https://example.test/AI Models'), 'https://example.test/AI%20Models');
    for (const address of ['http://localhost:11434', 'http://127.0.0.1:80', 'http://127.12.34.56:9000/base', 'http://[::1]:11434', 'https://mac.example.test', 'https://192.168.0.10:8443']) {
      assert.equal(normalize(normalize(address)), address);
    }
    for (const address of ['http://localhost', 'http://[::1]/api:80', 'http://127.example.test:11434', 'http://192.168.0.2:11434', 'http://10.0.0.1', 'http://mac.example.test:443', 'http://localhost:123@other.example', 'ftp://localhost:21']) {
      assert.throws(() => normalize(address), { code: 'invalid_ollama_server' });
    }
  }
});

test('legacy remote HTTP is rejected before either native network call', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected network request'));
  const server = 'http://192.168.0.2:11434';
  await assert.rejects(listOllamaModels(server), { code: 'invalid_ollama_server' });
  await assert.rejects(rewriteOllama({ ollamaServer: server, text: 'Example', recipe: 'formal', model: 'example' }), { code: 'invalid_ollama_server' });
  assert.equal(fetch.mock.callCount(), 0);
});
