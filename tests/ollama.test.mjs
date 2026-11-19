import test from 'node:test';
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
