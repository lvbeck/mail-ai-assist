import { authorizationMessage } from './auth-messages.mjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { AppError, AUTH_ORIGIN, API_ORIGIN, APP_NAME, challenge, validateCallback, verifyIdToken } from './core.mjs';
import { protect, unprotect, openBrowser } from './windows.mjs';

function stateDirectory() {
  if (!process.env.LOCALAPPDATA) throw new AppError('storage_unavailable');
  return join(process.env.LOCALAPPDATA, 'MailAiAssist');
}
async function loadState() {
  let raw;
  try { raw = await readFile(join(stateDirectory(), 'state.json'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw new AppError('storage_unavailable'); }
  try { return JSON.parse(await unprotect(raw)); }
  catch { throw new AppError('credential_storage_unavailable', 'The saved sign-in cannot be decrypted by this Windows account.'); }
}
async function saveState(state) {
  const root = stateDirectory();
  await mkdir(root, { recursive: true });
  const temp = join(root, `state-${randomUUID()}.tmp`);
  try {
    await writeFile(temp, await protect(JSON.stringify(state)), { flag: 'wx' });
    await rename(temp, join(root, 'state.json'));
  } finally { await unlink(temp).catch(() => {}); }
}
async function withLoginLock(operation) {
  const root = stateDirectory();
  await mkdir(root, { recursive: true });
  const path = join(root, 'login.lock');
  let handle;
  try { handle = await open(path, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw new AppError('storage_unavailable');
    // Only remove a lock when its owning process no longer exists.
    let pid;
    try { pid = Number(await readFile(path, 'utf8')); } catch { throw new AppError('login_busy'); }
    if (!Number.isInteger(pid) || pid <= 0) throw new AppError('login_busy');
    try { process.kill(pid, 0); throw new AppError('login_busy'); }
    catch (probe) { if (probe.code !== 'ESRCH') throw new AppError('login_busy'); }
    await unlink(path).catch(() => {});
    try { handle = await open(path, 'wx'); } catch { throw new AppError('login_busy'); }
  }
  try { await handle.writeFile(String(process.pid)); return await operation(); }
  finally { await handle.close(); await unlink(path).catch(() => {}); }
}
export async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error' });
  let result;
  try { result = await response.json(); } catch { throw new AppError('invalid_server_response'); }
  if (!response.ok) {
    const code = result.error?.code || (typeof result.error === 'string' ? result.error : null);
    throw new AppError(typeof code === 'string' && /^[a-z0-9_]{1,100}$/.test(code) ? code : `http_${response.status}`);
  }
  return result;
}
export function publicSession(state) {
  const connected = Boolean(state?.accessToken && Number.isFinite(state.expiresAt) && state.expiresAt > Date.now() + 30000);
  return { connected, sharing: connected && state.scopes?.includes('chatgpt.tokens.use.direct') === true,
    email: state?.email || '', renewable: Boolean(state?.refreshToken), expiresAt: state?.expiresAt || 0 };
}
function registrationOnly(state) {
  return { version: 1, hostId: state.hostId, clientId: state.clientId, subject: state.subject };
}
function tokenFields(tokens, previous = {}) {
  if (!tokens || typeof tokens.access_token !== 'string' || !tokens.access_token ||
      String(tokens.token_type).toLowerCase() !== 'bearer' || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 ||
      (tokens.refresh_token !== undefined && (typeof tokens.refresh_token !== 'string' || !tokens.refresh_token))) {
    throw new AppError('invalid_token_response');
  }
  const earliest = typeof tokens.earliest_refresh_at === 'number' ? tokens.earliest_refresh_at * 1000 : Date.parse(tokens.earliest_refresh_at);
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000, earliestRefreshAt: Number.isFinite(earliest) ? earliest : 0,
    scopes: typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/) : previous.scopes || [] };
}
export async function withSessionLock(operation, signal) {
  // Re-read state under the same cross-process lock used by sign-in/sign-out.
  const deadline = Date.now() + 25000;
  for (;;) {
    signal?.throwIfAborted();
    try { return await withLoginLock(operation); }
    catch (error) {
      if (error.code !== 'login_busy' || Date.now() >= deadline) throw error;
      await delay(200, undefined, { signal });
    }
  }
}
async function currentState(signal) {
  const state = await loadState();
  if (!state?.refreshToken || state.expiresAt > Date.now() + 120000) return state;
  return withSessionLock(async () => {
    const latest = await loadState();
    if (!latest?.refreshToken || latest.expiresAt > Date.now() + 120000) return latest;
    if (latest.refreshRetryAt > Date.now() || latest.earliestRefreshAt > Date.now()) {
      if (publicSession(latest).connected) return latest;
      throw new AppError('refresh_unavailable');
    }
    let tokens;
    try {
      tokens = await fetchJson(`${AUTH_ORIGIN}/api/accounts/oauth/token`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', client_id: latest.clientId,
          refresh_token: latest.refreshToken, resource: API_ORIGIN })
      });
    } catch (error) {
      if (['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired',
        'refresh_token_invalidated', 'refresh_token_reused'].includes(error.code)) {
        const cleared = registrationOnly(latest);
        await saveState(cleared);
        return cleared;
      }
      // Temporary failures never discard credentials. Persist backoff across windows.
      await saveState({ ...latest, refreshRetryAt: Date.now() + 60000 });
      if (publicSession(latest).connected) return latest;
      throw new AppError(error.code === 'invalid_client' ? 'invalid_client' : 'refresh_unavailable');
    }
    if (!tokens || typeof tokens.refresh_token !== 'string' || !tokens.refresh_token) throw new AppError('invalid_token_response');
    const renewed = { ...latest, ...tokenFields(tokens, latest), refreshRetryAt: 0 };
    // Finish persistence even if the caller cancels after the server rotates the token.
    await saveState(renewed);
    return renewed;
  }, signal);
}
export async function getSession(signal) { return publicSession(await currentState(signal)); }
export async function getAccessToken(signal) {
  const state = await currentState(signal);
  const session = publicSession(state);
  if (!session.connected) throw new AppError('sign_in_required');
  if (!session.sharing) throw new AppError('sharing_not_enabled');
  return state.accessToken;
}

export async function signIn(signal, language) {
  return withLoginLock(async () => {
    const saved = (await loadState()) || { version: 1, hostId: `urn:uuid:${randomUUID()}` };
    // Persist the host before opening authorization; a retry uses the same identity.
    await saveState(saved);
    signal.throwIfAborted();
    const attempt = {
      state: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'),
      verifier: randomBytes(48).toString('base64url'), clientId: saved.clientId
    };
    let consumed = false;
    let complete;
    let fail;
    const returned = new Promise((resolve, reject) => { complete = resolve; fail = reject; });
    // Attach a rejection handler before asynchronous browser startup.
    returned.catch(() => {});
    const server = createServer((req, res) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      if (req.method !== 'GET' || req.headers.host !== `127.0.0.1:${server.address()?.port}` || consumed) {
        res.writeHead(400); res.end(authorizationMessage(0, language, req.headers['accept-language'])); return;
      }
      const url = new URL(req.url, 'http://127.0.0.1');
      let callback;
      try { callback = validateCallback(url, attempt); }
      catch (error) {
        res.writeHead(400); res.end(authorizationMessage(1, language, req.headers['accept-language']));
        if (error.code !== 'invalid_state') { consumed = true; fail(error); }
        return;
      }
      consumed = true;
      res.end(authorizationMessage(2, language, req.headers['accept-language']));
      complete(callback);
    });
    server.requestTimeout = 10000;
    server.headersTimeout = 10000;
    const abort = () => fail(signal.reason || new AppError('cancelled'));
    signal.addEventListener('abort', abort, { once: true });
    try {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      signal.throwIfAborted();
      const redirectUri = `http://127.0.0.1:${server.address().port}/auth/callback`;
      const url = new URL(`${AUTH_ORIGIN}/api/accounts/authorize`);
      url.search = new URLSearchParams({
        client_id: saved.clientId || 'dynamic_agent_client', ext_agent_host_id: saved.hostId,
        response_type: 'code', redirect_uri: redirectUri, scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',
        resource: API_ORIGIN, state: attempt.state, nonce: attempt.nonce,
        code_challenge_method: 'S256', code_challenge: challenge(attempt.verifier),
        ...(!saved.clientId ? { agent_name_hint: APP_NAME } : {})
      }).toString();
      await openBrowser(url.href);
      const callback = await returned;
      signal.throwIfAborted();
      // Preserve an issued registration even if the token exchange later fails.
      saved.clientId = callback.clientId;
      await saveState(saved);
      const tokens = await fetchJson(`${AUTH_ORIGIN}/api/accounts/oauth/token`, {
        method: 'POST', signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: callback.clientId,
          code: callback.code, code_verifier: attempt.verifier, redirect_uri: redirectUri, resource: API_ORIGIN })
      });
      if (typeof tokens.id_token !== 'string' || typeof tokens.access_token !== 'string' || !tokens.access_token ||
          String(tokens.token_type).toLowerCase() !== 'bearer' || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) {
        throw new AppError('invalid_token_response');
      }
      const jwks = await fetchJson(`${AUTH_ORIGIN}/.well-known/jwks.json`, { signal });
      const identity = verifyIdToken(tokens.id_token, jwks.keys || [], { clientId: callback.clientId, nonce: attempt.nonce, subject: saved.subject });
      signal.throwIfAborted();
      const state = {
        version: 1, hostId: saved.hostId, clientId: callback.clientId, subject: identity.sub,
        email: typeof identity.email === 'string' ? identity.email : '',
        ...tokenFields(tokens)
      };
      await saveState(state);
      return publicSession(state);
    } finally {
      signal.removeEventListener('abort', abort);
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}
export async function signOut(signal) {
  return withSessionLock(async () => {
    const state = await loadState();
    let revoked = !state?.refreshToken;
    if (state?.refreshToken) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const metadata = await fetchJson(`${AUTH_ORIGIN}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) });
          const endpoint = new URL(metadata.revocation_endpoint);
          if (endpoint.origin !== AUTH_ORIGIN) throw new AppError('invalid_revocation_endpoint');
          const response = await fetch(endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: state.refreshToken, token_type_hint: 'refresh_token', client_id: state.clientId }) });
          if (response.status === 200) { revoked = true; break; }
          if (response.status < 500) break;
        } catch { /* Clear locally even when remote revocation is unavailable. */ }
        if (attempt === 0) await delay(500);
      }
    }
    if (state) await saveState(registrationOnly(state));
    return { connected: false, sharing: false, revoked };
  }, signal);
}
export async function listModels(signal) {
  const token = await getAccessToken(signal);
  const result = await fetchJson(`${API_ORIGIN}/models`, { signal, headers: { Authorization: `Bearer ${token}` } });
  if (!Array.isArray(result.models)) throw new AppError('invalid_model_catalog');
  return result.models.filter((model) => model.visibility === 'list' && typeof model.slug === 'string' && typeof model.display_name === 'string')
    .map((model) => ({ slug: model.slug, displayName: model.display_name }));
}
