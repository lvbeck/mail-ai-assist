import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AppError } from './core.mjs';
import { encryptCredential, decryptCredential } from './credential-envelope.mjs';

const executable = fileURLToPath(new URL('../native/mail-ai-assist-macos', import.meta.url));
export function runMacNative(request, signal) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [], { stdio: ['pipe', 'pipe', 'ignore'] });
    let finished = false, output = '';
    const finish = (error, result) => {
      if (finished) return;
      finished = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolve(result);
    };
    const cancel = () => { child.kill(); finish(new AppError('local_operation_failed')); };
    const timer = setTimeout(cancel, request.action === 'chooseFolder' ? 300000 : 60000);
    signal?.addEventListener('abort', cancel, { once: true });
    child.on('error', cancel);
    child.stdin.on('error', () => {});
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 65536) cancel(); });
    child.on('close', code => {
      try {
        const result = JSON.parse(output);
        if (code !== 0 || result.ok !== true) throw new Error('native_operation_failed');
        finish(null, result);
      } catch { finish(new AppError('local_operation_failed')); }
    });
    child.stdin.end(JSON.stringify(request));
    if (signal?.aborted) cancel();
  });
}
async function credentialKey(create) {
  const result = await runMacNative({ action: 'credentialKey', create });
  const key = Buffer.from(result.key || '', 'base64');
  if (key.length !== 32) throw new AppError('credential_storage_unavailable');
  return key;
}
export async function protect(text) {
  const key = await credentialKey(true);
  try { return encryptCredential(text, key); } finally { key.fill(0); }
}
export async function unprotect(text) {
  const key = await credentialKey(false);
  try { return decryptCredential(text, key); } finally { key.fill(0); }
}
export async function openBrowser(url) {
  if (new URL(url).origin !== 'https://auth.openai.com') throw new AppError('invalid_authorization_url');
  await runMacNative({ action: 'browser', url });
}
