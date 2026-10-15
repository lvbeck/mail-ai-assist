import { cacheGet, cachePut, cacheStats, cacheClear, cacheOpen } from './result-cache.mjs';
import { AppError, API_ORIGIN, buildRequest, consumeHttpResponse } from './core.mjs';
import { getSession, signIn, signOut, listModels, getAccessToken } from './auth.mjs';
import { startUpdateCheck } from './update-bootstrap.mjs';
import { helperUpdateStatus, installHelperUpdate } from './update-actions.mjs';

import { chooseDesktopExportDirectory, desktopExportInfo, clearDesktopExports, prepareDesktop, revealDesktop, cleanupDesktop, beginEml, appendEml, finishEml, cleanupAllDesktop } from './desktop-export.mjs';

startUpdateCheck();

import { validateProvider, apiStatus, saveApiKey, removeApiKey, listApiModels, rewriteApi, googleStatus, googleSave, googleRemove, googleTranslate, translationStatus, translationSave, translationRemove, translationTranslate } from './providers.mjs';

const requests = new Map();
let buffer = Buffer.alloc(0);
let activeOperation = false;
let inputClosed = false;
function send(message) {
  if (inputClosed) return;
  const body = Buffer.from(JSON.stringify(message));
  if (body.length > 1000000) throw new AppError('message_too_large');
  const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
  process.stdout.write(Buffer.concat([header, body]));
}
function safeError(error) {
  if (error.name === 'TimeoutError') return { code: 'timeout', message: 'Request timed out.' };
  if (error.name === 'AbortError') return { code: 'cancelled', message: 'Request cancelled.' };
  if (error instanceof AppError) return { code: error.code, message: error.message };
  return { code: 'operation_failed', message: 'The operation failed. Check your connection and sign in again.' };
}
async function handle(message) {
  if (!message || !Number.isSafeInteger(message.id) || message.id < 1 || typeof message.action !== 'string') {
    send({ id: message?.id, ok: false, error: { code: 'invalid_message' } }); return;
  }
  if (message.action === 'cancel') {
    requests.get(message.target)?.abort();
    send({ id: message.id, ok: true, result: {} }); return;
  }
  if (activeOperation) { send({ id: message.id, ok: false, error: { code: 'operation_busy' } }); return; }
  activeOperation = true;
  const controller = new AbortController();
  requests.set(message.id, controller);
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(['signIn', 'desktopExportChoose'].includes(message.action) ? 300000 : 120000)]);
  try {
    const provider = validateProvider(message.provider);
    let result;
    switch (message.action) {
      case 'translationStatus': result = await translationStatus(message.service); break;
      case 'translationSave': result = await translationSave(message, signal); break;
      case 'translationRemove': result = await translationRemove(message.service, signal); break;
      case 'translationTranslate': result = await translationTranslate(message, signal); break;
      case 'googleStatus': result = await googleStatus(); break;
      case 'googleSave': result = await googleSave(message.apiKey, signal); break;
      case 'googleRemove': result = await googleRemove(signal); break;
      case 'googleTranslate': result = await googleTranslate(message, signal); break;
      case 'cacheGet': result = await cacheGet(message); break;
      case 'cachePut': result = await cachePut(message); break;
      case 'cacheStats': result = await cacheStats(); break;
      case 'cacheClear': result = await cacheClear(); break;
      case 'cacheOpen': result = await cacheOpen(signal); break;
      case 'beginEml': result = await beginEml(message); break;
      case 'appendEml': result = await appendEml(message); break;
      case 'finishEml': result = await finishEml(message, signal); break;
      case 'desktopExportChoose': result = await chooseDesktopExportDirectory(signal); break;
      case 'desktopExportClear': result = await clearDesktopExports(message); break;
      case 'desktopExportInfo': result = await desktopExportInfo(); break;
      case 'prepareDesktop': result = await prepareDesktop(message, signal); break;
      case 'cleanupDesktop': result = await cleanupDesktop(message); break;
      case 'revealDesktop': result = await revealDesktop(message, signal); break;
      case 'status': result = provider === 'chatgpt' ? { ...await getSession(signal), provider } : await apiStatus(provider); break;
      case 'helperUpdateStatus': result = await helperUpdateStatus(); break;
      case 'installHelperUpdate': result = await installHelperUpdate(); break;
      case 'signIn': if (provider !== 'chatgpt') throw new AppError('invalid_provider'); result = await signIn(signal, message.uiLanguage); break;
      case 'signOut': result = provider === 'chatgpt' ? await signOut(signal) : await removeApiKey(provider, signal); break;
      case 'saveApiKey': result = await saveApiKey(provider, message.apiKey, signal); break;
      case 'models': result = provider === 'chatgpt' ? await listModels(signal) : await listApiModels(provider, signal); break;
      case 'rewrite': {
        if (provider !== 'chatgpt') { result = await rewriteApi(provider, message, signal); break; }
        const body = buildRequest(message);
        const token = await getAccessToken(signal);
        const response = await fetch(`${API_ORIGIN}/responses`, {
          method: 'POST', redirect: 'error', signal,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          const code = detail.error?.code;
          throw new AppError(typeof code === 'string' && /^[a-z0-9_]{1,100}$/.test(code) ? code : `http_${response.status}`);
        }
        result = await consumeHttpResponse(response, (text) => send({ id: message.id, event: 'delta', text }));
        break;
      }
      default: throw new AppError('unsupported_action');
    }
    signal.throwIfAborted();
    send({ id: message.id, ok: true, result });
  } catch (error) { send({ id: message.id, ok: false, error: safeError(error) }); }
  finally { controller.abort(); requests.delete(message.id); activeOperation = false; if (inputClosed) await cleanupAllDesktop(); }
}
process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const size = buffer.readUInt32LE(0);
    if (!size || size > 262144) { process.exitCode = 1; process.stdin.destroy(); return; }
    if (buffer.length < size + 4) return;
    let message;
    try { message = JSON.parse(buffer.subarray(4, 4 + size).toString('utf8')); }
    catch { process.exitCode = 1; process.stdin.destroy(); return; }
    buffer = buffer.subarray(4 + size);
    handle(message).catch(() => { process.exitCode = 1; process.stdin.destroy(); });
  }
});
function shutdown() {
  inputClosed = true;
  for (const controller of requests.values()) controller.abort();
  if (!activeOperation) cleanupAllDesktop().catch(() => {});
}
process.stdin.on('end', shutdown);
process.stdin.on('close', shutdown);
process.stdout.on('error', shutdown);
