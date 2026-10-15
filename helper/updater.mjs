import { mkdir, readFile, writeFile, open, unlink, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { verifyRelease, verifyPackage, newerVersion, limitedDownload, installerSuffix } from './update-core.mjs';
import { getInstallation } from './installation.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const stateRoot = join(process.env.LOCALAPPDATA || '', 'MailAiAssist');
const cache = join(stateRoot, 'updates');
const lockPath = join(cache, 'check.lock');
let lock;
async function main() {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return;
  const installation = await getInstallation(root);
  if (!installation) return;
  const config = JSON.parse(await readFile(join(root, 'msi-install.json'), 'utf8'));
  await mkdir(cache, { recursive: true });
  try { lock = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // Recover a lock left by a terminated checker, but never disturb a live one.
    const owner = Number(await readFile(lockPath, 'utf8').catch(() => '0'));
    if (!Number.isSafeInteger(owner) || owner < 1) {
      const info = await stat(lockPath).catch(() => null);
      if (info && Date.now() - info.mtimeMs > 600000) await unlink(lockPath).catch(() => {});
      return;
    }
    try { process.kill(owner, 0); return; } catch (failure) { if (failure.code !== 'ESRCH') return; }
    await unlink(lockPath).catch(() => {});
    return;
  }
  await lock.writeFile(String(process.pid));
  const last = JSON.parse((await readFile(join(cache, 'status.json'), 'utf8').catch(() => '{}')).replace(/^\uFEFF/, ''));
  const elapsed = Date.now() - last.checkedAt;
  if (Number.isFinite(last.checkedAt) && elapsed >= 0 && elapsed < 86400000) return;
  await writeFile(join(cache, 'status.json'), JSON.stringify({ checkedAt: Date.now(), state: 'checking' }));
  const envelope = JSON.parse((await limitedDownload(config.baseUrl + `helper-updates${installerSuffix(config)}.json`, 32768)).toString('utf8'));
  const release = verifyRelease(envelope, config);
  if (!newerVersion(release.version, config.version)) {
    await writeFile(join(cache, 'status.json'), JSON.stringify({ checkedAt: Date.now(), state: 'current', version: config.version }));
    return;
  }
  const bytes = await limitedDownload(release.url, release.size);
  verifyPackage(bytes, release);
  const packagePath = join(cache, `Mail-AI-Assist-${release.version}-x64.msi`);
  await writeFile(packagePath, bytes);
  await writeFile(join(cache, 'pending-release.json'), JSON.stringify(envelope));
  if (installation.scope === 'machine') {
    await writeFile(join(cache, 'status.json'), JSON.stringify({ checkedAt: Date.now(), state: 'awaiting_admin', version: release.version }));
    return;
  }
  await writeFile(join(cache, 'status.json'), JSON.stringify({ checkedAt: Date.now(), state: 'waiting_for_thunderbird_exit', version: release.version }));
  const powershell = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const child = spawn(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'helper', 'install-update.ps1'), '-PackagePath', packagePath, '-ExpectedHash', release.sha256, '-ExpectedVersion', release.version], { detached: true, windowsHide: true, stdio: 'ignore' });
  child.on('error', () => {}); child.unref();
}
main().catch(async () => {
  if (lock) await writeFile(join(cache, 'status.json'), JSON.stringify({ checkedAt: Date.now(), state: 'update_failed' })).catch(() => {});
}).finally(async () => { if (lock) { await lock.close(); await unlink(lockPath).catch(() => {}); } });
