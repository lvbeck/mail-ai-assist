import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { Readable } from 'node:stream';
import { buildRequest, challenge, equalSecret, validateCallback, verifyIdToken, consumeResponse, consumeHttpResponse } from '../helper/core.mjs';
import { publicSession } from '../helper/auth.mjs';

test('PKCE matches RFC 7636 example', () => {
  assert.equal(challenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('state comparison rejects missing and unequal values', () => {
  assert.equal(equalSecret('abc', 'abc'), true);
  assert.equal(equalSecret('abc', 'abcd'), false);
  assert.equal(equalSecret(null, 'abc'), false);
});
test('callback validates state before handling denial', () => {
  assert.throws(() => validateCallback(new URL('http://127.0.0.1/auth/callback?state=bad&error=access_denied'), { state: 'good' }), { code: 'invalid_state' });
  assert.throws(() => validateCallback(new URL('http://127.0.0.1/auth/callback?state=good&error=access_denied'), { state: 'good' }), { code: 'access_denied' });
});
test('callback retains issued client and rejects client changes', () => {
  const url = new URL('http://127.0.0.1/auth/callback?state=good&code=code');
  assert.deepEqual(validateCallback(url, { state: 'good', clientId: 'issued-1' }), { code: 'code', clientId: 'issued-1' });
  assert.throws(() => validateCallback(url, { state: 'good' }), { code: 'invalid_registration' });
  url.searchParams.set('client_id', 'issued-2');
  assert.throws(() => validateCallback(url, { state: 'good', clientId: 'issued-1' }), { code: 'invalid_registration' });
});
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
const expected = { clientId: 'client-test', nonce: 'nonce-test' };
function token(overrides = {}, headerOverrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key', ...headerOverrides })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: 'https://auth.openai.com', aud: expected.clientId, sub: 'test-user', nonce: expected.nonce, iat: now, exp: now + 300, ...overrides })).toString('base64url');
  return `${header}.${payload}.${sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey).toString('base64url')}`;
}
test('ID token validates RSA signature and identity', () => assert.equal(verifyIdToken(token(), [key], expected).sub, 'test-user'));
for (const [name, change] of Object.entries({ issuer: { iss: 'https://evil.invalid' }, audience: { aud: 'other' }, nonce: { nonce: 'other' }, expiry: { exp: 1 }, subject: { sub: '' }, future: { iat: 9999999999 }, authorizedParty: { aud: ['client-test', 'other'] } })) {
  test(`ID token rejects invalid ${name}`, () => assert.throws(() => verifyIdToken(token(change), [key], expected), { code: 'invalid_id_token' }));
}
test('ID token rejects changed account and unsupported algorithm', () => {
  assert.throws(() => verifyIdToken(token(), [key], { ...expected, subject: 'someone-else' }), { code: 'invalid_id_token' });
  assert.throws(() => verifyIdToken(token({}, { alg: 'none' }), [key], expected), { code: 'invalid_id_token' });
  assert.throws(() => verifyIdToken(token().slice(0, -5), [key], expected), { code: 'invalid_id_token' });
});
test('request contains only selected text and supported subscription fields', () => {
  const request = buildRequest({ text: 'Hallo 123', model: 'account-model', recipe: 'formal' });
  assert.equal(request.store, false); assert.equal(request.stream, true);
  assert.deepEqual(JSON.parse(request.input[1].content), { source_text: 'Hallo 123' });
  assert.equal(request.model, 'account-model');
  assert.equal('max_output_tokens' in request, false);
  assert.equal('tools' in request, false);
});
test('request rejects empty, oversized and invalid instructions', () => {
  for (const data of [{ text: ' ' }, { text: 'x'.repeat(20001) }, { text: 'hi', recipe: 'unknown' }, { text: 'hi', recipe: 'custom', custom: '' }]) {
    assert.throws(() => buildRequest({ recipe: 'polish', model: 'm', ...data }));
  }
});
test('translation and custom requests are supported', () => {
  assert.match(buildRequest({ text: 'Hi', recipe: 'translate', language: 'German', model: 'm' }).input[0].content, /German/);
  assert.equal(buildRequest({ text: 'Hi', recipe: 'custom', custom: ' Keep terms ', model: 'm' }).input[0].content, 'Keep terms');
});
function event(type, extra = {}) { return `data: ${JSON.stringify({ type, ...extra })}\r\n\r\n`; }
test('SSE handles byte-split UTF-8 and CRLF and requires completion', async () => {
  const bytes = Buffer.from(event('response.output_text.delta', { delta: '中文ä' }) + event('response.completed'));
  const deltas = [];
  const result = await consumeResponse(Readable.from([...bytes].map((byte) => Buffer.from([byte]))), (delta) => deltas.push(delta));
  assert.equal(result.text, '中文ä'); assert.equal(deltas.join(''), '中文ä');
});
test('SSE rejects late subscription failure after partial output', async () => {
  const stream = event('response.output_text.delta', { delta: 'partial' }) + event('response.failed', { response: { error: { code: 'subscription_sharing_usage_limit_exceeded' } } });
  await assert.rejects(consumeResponse(Readable.from([Buffer.from(stream)])), { code: 'subscription_sharing_usage_limit_exceeded' });
});
test('SSE rejects truncated, incomplete, malformed, refused and empty output', async () => {
  const cases = [event('response.output_text.delta', { delta: 'partial' }), event('response.incomplete'), 'data: invalid\n\n', event('response.refusal.delta'), event('response.completed')];
  for (const stream of cases) await assert.rejects(consumeResponse(Readable.from([Buffer.from(stream)])));
});
test('SSE limits output size', async () => {
  await assert.rejects(consumeResponse(Readable.from([Buffer.from(event('response.output_text.delta', { delta: 'x'.repeat(40001) }))])), { code: 'output_too_long' });
});
test('HTTP stream accepts omitted Content-Type while validating completed SSE', async () => {
  const response = new Response(Buffer.from(event('response.output_text.delta', { delta: 'Rewritten.' }) + event('response.completed')));
  assert.equal(response.headers.get('content-type'), null);
  assert.equal((await consumeHttpResponse(response)).text, 'Rewritten.');
});
test('HTTP stream accepts case-insensitive SSE media type with charset', async () => {
  const response = new Response(Buffer.from(event('response.output_text.delta', { delta: 'Done.' }) + event('response.completed')), { headers: { 'Content-Type': 'Text/Event-Stream; charset=utf-8' } });
  assert.equal((await consumeHttpResponse(response)).text, 'Done.');
});
test('missing Content-Type does not permit JSON, HTML or partial SSE', async () => {
  for (const body of ['{"ok":true}', '<html>gateway error</html>', event('response.output_text.delta', { delta: 'Partial' })]) {
    await assert.rejects(consumeHttpResponse(new Response(Buffer.from(body))), { code: 'incomplete_response' });
  }
});
test('HTTP stream rejects declared unexpected types and missing body', async () => {
  await assert.rejects(consumeHttpResponse(new Response('{}', { headers: { 'Content-Type': 'application/json' } })), { code: 'unexpected_response_type' });
  await assert.rejects(consumeHttpResponse(new Response(null)), { code: 'empty_response' });
});
test('session requires both unexpired credentials and granted plan permission', () => {
  const state = { accessToken: 'not-a-real-token', expiresAt: Date.now() + 60000, scopes: ['chatgpt.tokens.use.direct'], email: 'test@example.invalid' };
  assert.equal(publicSession(state).sharing, true);
  assert.equal(publicSession({ ...state, scopes: [] }).sharing, false);
  assert.equal(publicSession({ ...state, expiresAt: 1 }).sharing, false);
  assert.equal(JSON.stringify(publicSession(state)).includes(state.accessToken), false);
});
