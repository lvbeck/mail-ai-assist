import { homedir } from 'node:os';
import { join, posix, isAbsolute } from 'node:path';
import { stat } from 'node:fs/promises';
import { AppError } from './core.mjs';

export function dataDirectory(platform = process.platform, environment = process.env, home = homedir()) {
  if (platform === 'win32' && environment.LOCALAPPDATA) return join(environment.LOCALAPPDATA, 'MailAiAssist');
  if (platform === 'darwin' && home && posix.isAbsolute(home)) return posix.join(home, 'Library', 'Application Support', 'MailAiAssist');
  throw new AppError('storage_unavailable');
}

export async function validateDesktopApplication(path, platform = process.platform) {
  if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0')) throw new AppError('desktop_invalid');
  const info = await stat(path).catch(() => null);
  const valid = platform === 'darwin' ? /\.app$/i.test(path) && info?.isDirectory() : platform === 'win32' && /\.exe$/i.test(path) && info?.isFile();
  if (!valid) throw new AppError('desktop_invalid');
}
