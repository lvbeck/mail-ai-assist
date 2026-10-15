import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from './core.mjs';
const directory = dirname(fileURLToPath(import.meta.url));
const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
function run(args, input = '', extraEnvironment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', ...args], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, ...extraEnvironment }
    });
    let output = ''; let settled = false;
    const finish = (error) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(output);
    };
    const timer = setTimeout(() => { child.kill(); finish(new AppError('local_operation_failed')); }, 20000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { output += chunk; if (output.length > 1048576) { child.kill(); finish(new AppError('local_operation_failed')); } });
    child.on('error', () => finish(new AppError('local_operation_failed')));
    child.stdin.on('error', () => {});
    child.on('close', (code) => finish(code === 0 ? null : new AppError('local_operation_failed')));
    child.stdin.end(input);
  });
}
export async function protect(text) {
  return (await run(['-File', join(directory, 'protect.ps1'), '-Mode', 'Protect'], Buffer.from(text).toString('base64'))).trim();
}
export async function unprotect(text) {
  return Buffer.from((await run(['-File', join(directory, 'protect.ps1'), '-Mode', 'Unprotect'], text)).trim(), 'base64').toString('utf8');
}
export async function openBrowser(url) {
  if (new URL(url).origin !== 'https://auth.openai.com') throw new AppError('invalid_authorization_url');
  await run(['-Command', 'Start-Process -FilePath $env:COMPOSE_AI_LOGIN_URL'], '', { COMPOSE_AI_LOGIN_URL: url });
}
