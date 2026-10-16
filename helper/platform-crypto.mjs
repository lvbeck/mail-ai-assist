import { AppError } from './core.mjs';

async function implementation() {
  if (process.platform === 'win32') return import('./windows.mjs');
  if (process.platform === 'darwin') return import('./macos.mjs');
  throw new AppError('storage_unavailable');
}
export async function protect(text) { return (await implementation()).protect(text); }
export async function unprotect(text) { return (await implementation()).unprotect(text); }
export async function openBrowser(url) { return (await implementation()).openBrowser(url); }
