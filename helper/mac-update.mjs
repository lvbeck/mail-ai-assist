import { readFile, writeFile, mkdir, open, unlink, stat, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDirectory } from './platform.mjs';
import { verifyRelease, verifyPackage, newerVersion, limitedDownload, releaseFilename } from './update-core.mjs';
import { runMacNative } from './macos.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const configFile = join(root, 'mac-install.json');
const cacheDirectory = () => join(dataDirectory(), 'updates', `macos-${process.arch}`);
export function validateMacConfig(config, arch = process.arch) {
  if (!['arm64', 'x64'].includes(arch) || config.platform !== `macos-${arch}` ||
      config.githubRepository !== 'lvbeck/mail-ai-assist' ||
      config.baseUrl !== 'https://github.com/lvbeck/mail-ai-assist/releases/latest/download/') throw new Error('invalid_mac_installation');
  return config;
}
async function configuration() { return validateMacConfig(JSON.parse(await readFile(configFile, 'utf8'))); }
async function atomicWrite(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, data, { flag: 'wx', mode: 0o600 }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(() => {}); }
}
export function startMacUpdateCheck() {
  if (process.platform !== 'darwin' || !existsSync(configFile)) return;
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--check'], { detached: true, stdio: 'ignore' });
  child.on('error', () => {}); child.unref();
}
export async function checkMacUpdate(config, cache, download = limitedDownload) {
  await mkdir(cache, { recursive: true, mode: 0o700 });
  const lockPath = join(cache, 'check.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = Number(await readFile(lockPath, 'utf8').catch(() => '0'));
    if (Number.isSafeInteger(owner) && owner > 0) {
      try { process.kill(owner, 0); } catch (failure) { if (failure.code === 'ESRCH') await unlink(lockPath).catch(() => {}); }
    } else {
      const info = await stat(lockPath).catch(() => null);
      if (info && Date.now() - info.mtimeMs > 600000) await unlink(lockPath).catch(() => {});
    }
    return;
  }
  const statusPath = join(cache, 'status.json');
  try {
    await lock.writeFile(String(process.pid));
    let last = {};
    try { last = JSON.parse(await readFile(statusPath, 'utf8')); } catch { /* A missing or damaged status triggers a fresh check. */ }
    const elapsed = Date.now() - last.checkedAt;
    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 86400000) return;
    await atomicWrite(statusPath, JSON.stringify({ checkedAt: Date.now(), state: 'checking' }));
    const envelope = JSON.parse((await download(`${config.baseUrl}helper-updates-${config.platform}.json`, 32768)).toString('utf8'));
    const release = verifyRelease(envelope, config);
    if (!newerVersion(release.version, config.version)) {
      await atomicWrite(statusPath, JSON.stringify({ checkedAt: Date.now(), state: 'current', version: config.version }));
      return;
    }
    const bytes = await download(release.url, release.size);
    verifyPackage(bytes, release);
    await atomicWrite(join(cache, releaseFilename(config, release.version)), bytes);
    await atomicWrite(join(cache, 'pending-release.json'), JSON.stringify(envelope));
    // Installation is always an explicit user action through macOS Installer.
    await atomicWrite(statusPath, JSON.stringify({ checkedAt: Date.now(), state: 'ready', version: release.version }));
  } catch (error) {
    await atomicWrite(statusPath, JSON.stringify({ checkedAt: Date.now(), state: 'update_failed' })).catch(() => {});
    throw error;
  } finally { await lock.close(); await unlink(lockPath).catch(() => {}); }
}
export async function macUpdateStatus() {
  try {
    const config = await configuration();
    const status = JSON.parse(await readFile(join(cacheDirectory(), 'status.json'), 'utf8'));
    return { available: ['ready', 'installer_opened'].includes(status.state) && newerVersion(status.version, config.version), waiting: false };
  } catch { return { available: false, waiting: false }; }
}
export async function installMacUpdate() {
  return installMacUpdateFromCache(await configuration(), cacheDirectory());
}
export async function installMacUpdateFromCache(config, cache, openInstaller = runMacNative) {
  const release = verifyRelease(JSON.parse(await readFile(join(cache, 'pending-release.json'), 'utf8')), config);
  if (!newerVersion(release.version, config.version)) throw new Error('already_current');
  const path = join(cache, releaseFilename(config, release.version));
  verifyPackage(await readFile(path), release);
  await openInstaller({ action: 'install', path });
  await atomicWrite(join(cache, 'status.json'), JSON.stringify({ checkedAt: Date.now(), state: 'installer_opened', version: release.version }));
  return { waiting: true };
}
if (process.platform === 'darwin' && process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === '--check') {
  configuration().then(config => checkMacUpdate(config, cacheDirectory())).catch(() => {});
}
