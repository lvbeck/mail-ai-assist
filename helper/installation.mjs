import { execFile } from 'node:child_process';
import { join } from 'node:path';

export function getInstallation(root) {
  if (process.platform !== 'win32') return Promise.resolve(null);
  return new Promise(resolve => {
    const shell = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    execFile(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'helper', 'installation.ps1'), '-InstallRoot', root], { windowsHide: true, timeout: 10000 }, (error, stdout) => {
      if (error) return resolve(null);
      try { const result = JSON.parse(stdout.replace(/^\uFEFF/, '')); resolve(['user', 'machine'].includes(result.scope) ? result : null); }
      catch { resolve(null); }
    });
  });
}
