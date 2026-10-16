import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { getInstallation } from './installation.mjs';
import { verifyRelease, verifyPackage, newerVersion } from './update-core.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cache = () => join(process.env.LOCALAPPDATA, 'MailAiAssist', 'updates');
export async function helperUpdateStatus() {
  if (process.platform === 'darwin') return (await import('./mac-update.mjs')).macUpdateStatus();
  try {
    if ((await getInstallation(root))?.scope !== 'machine') return { available: false, waiting: false };
    const status = JSON.parse((await readFile(join(cache(), 'status.json'), 'utf8')).replace(/^\uFEFF/, ''));
    const config = JSON.parse(await readFile(join(root, 'msi-install.json'), 'utf8'));
    if (!newerVersion(status.version, config.version)) return { available: false, waiting: false };
    return { available: status.state === 'awaiting_admin', waiting: status.state === 'waiting_for_admin_install' };
  } catch { return { available: false, waiting: false }; }
}
export async function installHelperUpdate() {
  if (process.platform === 'darwin') return (await import('./mac-update.mjs')).installMacUpdate();
  const installation = await getInstallation(root);
  if (installation?.scope !== 'machine') throw new Error('No machine update is available.');
  const config = JSON.parse(await readFile(join(root, 'msi-install.json'), 'utf8'));
  const release = verifyRelease(JSON.parse(await readFile(join(cache(), 'pending-release.json'), 'utf8')), config);
  if (!newerVersion(release.version, config.version)) throw new Error('The helper is already up to date.');
  const packagePath = join(cache(), `Mail-AI-Assist-${release.version}-x64.msi`);
  verifyPackage(await readFile(packagePath), release);
  const shell = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  await new Promise((resolve, reject) => {
    const child = spawn(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'helper', 'install-update.ps1'), '-PackagePath', packagePath, '-ExpectedHash', release.sha256, '-ExpectedVersion', release.version, '-MachineApproved'], { windowsHide: true, detached: true, stdio: 'ignore' });
    child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(); });
  });
  await writeFile(join(cache(), 'status.json'), JSON.stringify({ checkedAt: Date.now(), state: 'waiting_for_admin_install', version: release.version }));
  return { waiting: true };
}
