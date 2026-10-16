import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { getInstallation } from './installation.mjs';

export function startUpdateCheck() {
  if (process.platform === 'darwin') {
    import('./mac-update.mjs').then(module => module.startMacUpdateCheck()).catch(() => {});
    return;
  }
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return;
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  if (!existsSync(join(root, 'msi-install.json'))) return;
  getInstallation(root).then(installation => {
    if (!installation) return;
    const child = spawn(process.execPath, [join(root, 'helper', 'updater.mjs')], { detached: true, windowsHide: true, stdio: 'ignore' });
    child.on('error', () => {}); child.unref();
  }).catch(() => {});
}
