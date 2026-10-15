import test, { before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { protect, unprotect } from '../helper/windows.mjs';
import { getSession, getAccessToken, signOut } from '../helper/auth.mjs';
import { AUTH_ORIGIN, API_ORIGIN } from '../helper/core.mjs';

// All credentials are synthetic; never read the installed user's state.
let directory, statePath;
const originalAppData = process.env.LOCALAPPDATA;
const originalFetch = globalThis.fetch;
const state = () => ({ version: 1, hostId: 'test-host', clientId: 'oaiapp_test', subject: 'test-subject',
  email: 'test@example.invalid', accessToken: 'fake-access', refreshToken: 'fake-refresh',
  expiresAt: Date.now() + 60000, scopes: ['offline_access', 'chatgpt.tokens.use.direct'] });
const response = (extra = {}) => new Response(JSON.stringify({ access_token: 'new-fake-access',
  refresh_token: 'new-fake-refresh', token_type: 'Bearer', expires_in: 3600, ...extra }));
async function save(value) { await writeFile(statePath, await protect(JSON.stringify(value))); }
async function read() { return JSON.parse(await unprotect(await readFile(statePath, 'utf8'))); }
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'compose-ai-renewal-'));
  process.env.LOCALAPPDATA = directory;
  await mkdir(join(directory, 'MailAiAssist'));
  statePath = join(directory, 'MailAiAssist', 'state.json');
});
beforeEach(() => { globalThis.fetch = async () => { throw new Error('Unexpected network call'); }; });
afterEach(() => { globalThis.fetch = originalFetch; });
after(async () => {
  if (originalAppData === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = originalAppData;
  await rm(directory, { recursive: true, force: true });
});
test('near expiry rotates encrypted credentials and keeps grant and registration', async () => {
  await save(state());
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, `${AUTH_ORIGIN}/api/accounts/oauth/token`);
    assert.equal(options.body.get('grant_type'), 'refresh_token');
    assert.equal(options.body.get('client_id'), 'oaiapp_test');
    assert.equal(options.body.get('resource'), API_ORIGIN);
    assert.equal(options.body.has('scope'), false);
    return response();
  };
  const session = await getSession();
  assert.equal(session.connected, true); assert.equal(session.renewable, true);
  assert.equal(session.sharing, true); assert.equal(session.accessToken, undefined);
  assert.equal(await getAccessToken(), 'new-fake-access');
  const saved = await read();
  assert.equal(saved.refreshToken, 'new-fake-refresh'); assert.equal(saved.subject, 'test-subject');
  assert.equal((await readFile(statePath, 'utf8')).includes('new-fake-refresh'), false);
  assert.equal(calls, 1);
});
test('simultaneous callers serialize refresh and use the replacement', async () => {
  await save(state()); let calls = 0;
  globalThis.fetch = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 150)); return response(); };
  const other = await import('../helper/auth.mjs?second-helper');
  const values = await Promise.all([getAccessToken(), other.getAccessToken()]);
  assert.deepEqual(values, ['new-fake-access', 'new-fake-access']); assert.equal(calls, 1);
});
test('old clients remain usable until expiry and require one new sign-in afterward', async () => {
  const old = state(); delete old.refreshToken;
  await save(old); assert.equal((await getSession()).renewable, false);
  await save({ ...old, expiresAt: 1 });
  assert.equal((await getSession()).connected, false);
  await assert.rejects(getAccessToken(), { code: 'sign_in_required' });
});
test('terminal refresh errors clear credentials but preserve client mapping', async () => {
  for (const code of ['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused']) {
    await save(state());
    globalThis.fetch = async () => new Response(JSON.stringify({ error: code }), { status: 400 });
    assert.equal((await getSession()).connected, false);
    const saved = await read(); assert.equal(saved.clientId, 'oaiapp_test');
    assert.equal(saved.refreshToken, undefined); assert.equal(saved.accessToken, undefined);
  }
});
test('network failure preserves credentials and shares retry backoff', async () => {
  await save({ ...state(), expiresAt: 1 }); let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError('offline'); };
  await assert.rejects(getAccessToken(), { code: 'refresh_unavailable' });
  await assert.rejects(getAccessToken(), { code: 'refresh_unavailable' });
  assert.equal(calls, 1); assert.equal((await read()).refreshToken, 'fake-refresh');
  await save({ ...(await read()), refreshRetryAt: 0 });
  globalThis.fetch = async () => response();
  assert.equal(await getAccessToken(), 'new-fake-access');
});
test('temporary outage still allows an unexpired access token', async () => {
  await save(state());
  assert.equal(await getAccessToken(), 'fake-access');
  assert.equal((await read()).refreshToken, 'fake-refresh');
});
test('server earliest refresh time prevents premature renewal', async () => {
  await save({ ...state(), earliestRefreshAt: Date.now() + 10000 });
  assert.equal(await getAccessToken(), 'fake-access');
});
test('updated scopes can disable inference after refresh', async () => {
  await save(state()); globalThis.fetch = async () => response({ scope: 'openid offline_access' });
  await assert.rejects(getAccessToken(), { code: 'sharing_not_enabled' });
});
test('malformed renewal responses are not persisted', async () => {
  await save(state()); globalThis.fetch = async () => response({ refresh_token: null });
  await assert.rejects(getAccessToken(), { code: 'invalid_token_response' });
  assert.equal((await read()).refreshToken, 'fake-refresh');
});
test('sign-out revokes renewable session and clears local credentials', async () => {
  await save(state());
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('openid-configuration')) return new Response(JSON.stringify({ revocation_endpoint: `${AUTH_ORIGIN}/test-revoke` }));
    assert.equal(String(url), `${AUTH_ORIGIN}/test-revoke`);
    assert.equal(options.body.get('token'), 'fake-refresh');
    assert.equal(options.body.get('client_id'), 'oaiapp_test');
    return new Response('', { status: 200 });
  };
  assert.equal((await signOut()).revoked, true);
  assert.equal((await read()).refreshToken, undefined);
});
test('offline sign-out reports unconfirmed revocation and clears locally', async () => {
  await save(state()); assert.equal((await signOut()).revoked, false);
  assert.equal((await read()).accessToken, undefined);
});
test('cancelling after rotation does not lose the replacement credentials', async () => {
  await save(state()); const controller = new AbortController();
  globalThis.fetch = async () => { controller.abort(); return response(); };
  assert.equal(await getAccessToken(controller.signal), 'new-fake-access');
  assert.equal((await read()).refreshToken, 'new-fake-refresh');
});
test('sign-out waits for renewal and revokes the latest token without restoring a session', async () => {
  await save(state());
  let start;
  const started = new Promise(resolve => { start = resolve; });
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('oauth/token')) {
      start(); await new Promise(resolve => setTimeout(resolve, 150)); return response();
    }
    if (String(url).endsWith('openid-configuration')) return new Response(JSON.stringify({ revocation_endpoint: `${AUTH_ORIGIN}/test-revoke` }));
    assert.equal(options.body.get('token'), 'new-fake-refresh');
    return new Response('', { status: 200 });
  };
  const renewal = getAccessToken(); await started;
  await Promise.all([renewal, signOut()]);
  assert.equal((await getSession()).connected, false);
  assert.equal((await read()).refreshToken, undefined);
});
