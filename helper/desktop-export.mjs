import { randomUUID, createHash } from 'node:crypto';
import { readdir, mkdir, writeFile, appendFile, stat, unlink, rmdir, lstat, realpath, readFile, rename } from 'node:fs/promises';
import { join, dirname, isAbsolute, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { AppError } from './core.mjs';
const sessions = new Map();
const directory = dirname(fileURLToPath(import.meta.url));
function exportSettingsFile() { return join(process.env.LOCALAPPDATA, 'MailAiAssist', 'export-settings.json'); }
export async function desktopExportDirectory() {
  try {
    const saved = JSON.parse(await readFile(exportSettingsFile(), 'utf8'));
    if (typeof saved.path !== 'string' || !isAbsolute(saved.path)) throw new Error('Invalid export directory');
    return saved.path;
  } catch (error) {
    if (error.code !== 'ENOENT') throw new AppError('desktop_failed');
    return join(process.env.LOCALAPPDATA, 'MailAiAssist', 'Exports');
  }
}
export async function saveDesktopExportDirectory(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || !(await stat(path)).isDirectory()) throw new AppError('desktop_invalid');
  const selected = resolve(path);
  // Probe only a uniquely named file, never alter existing directory contents.
  const probe = join(selected, `.mail-ai-write-${randomUUID()}.tmp`);
  await writeFile(probe, '', { flag: 'wx' });
  await unlink(probe);
  const file = exportSettingsFile(), temporary = `${file}.${randomUUID()}.tmp`;
  await mkdir(dirname(file), { recursive: true });
  try {
    await writeFile(temporary, JSON.stringify({ path: selected }), { flag: 'wx' });
    await rename(temporary, file);
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  return selected;
}
export async function chooseDesktopExportDirectory(signal) {
  const current = await desktopExportDirectory();
  const result = await runDesktop({ action: 'chooseFolder', path: current }, signal);
  if (result.cancelled) return { path: current, cancelled: true };
  signal?.throwIfAborted();
  return { path: await saveDesktopExportDirectory(result.path), cancelled: false };
}
function header(value) { return String(value || '').replace(/[\r\n\x00-\x1f\x7f]/g, ' ').slice(0, 2000); }
export function serializeMail(mail, format) {
  if (!mail || typeof mail.body !== 'string' || !mail.body.trim() || format !== 'txt') throw new AppError('desktop_invalid');
  const text = `Subject: ${header(mail.subject)}\nFrom: ${header(mail.from)}\nTo: ${header(mail.to)}\nDate: ${header(mail.date)}\n\n${mail.body}`;
  if (Buffer.byteLength(text) > 180000) throw new AppError('desktop_too_large');
  return text.replace(/\r\n?|\n/g, '\r\n');
}
export function parseDesktopResult(output, exitCode) {
  let result;
  try { result = JSON.parse(output.trim()); } catch { throw new AppError('desktop_failed'); }
  if (exitCode || !result?.ok) {
    const allowed = ['desktop_window', 'desktop_control', 'desktop_picker', 'desktop_file_input', 'desktop_verify'];
    throw new AppError(allowed.includes(result?.code) ? result.code : 'desktop_failed');
  }
  return result;
}
async function runDesktop(input, signal) {
  signal?.throwIfAborted();
  const shell = join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  return new Promise((resolve, reject) => {
    const child = spawn(shell, ['-NoLogo', '-NoProfile', '-STA', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(directory, 'desktop-attach.ps1')], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    let output = ''; let finished = false;
    const finish = (error, result) => { if (finished) return; finished = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel); error ? reject(error) : resolve(result); };
    const cancel = () => { child.kill(); finish(new AppError('desktop_failed')); };
    const timer = setTimeout(cancel, input.action === 'chooseFolder' ? 300000 : 45000);
    signal?.addEventListener('abort', cancel, { once: true });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', data => { output += data; if (output.length > 16000) cancel(); });
    child.stdin.on('error', () => {});
    child.on('error', cancel);
    child.on('close', code => { try { finish(null, parseDesktopResult(output, code)); } catch (error) { finish(error); } });
    child.stdin.end(JSON.stringify(input));
  });
}
function folderKey(message) {
  if (typeof message.identity !== 'string' || !message.identity) return randomUUID();
  const hash = createHash('sha256').update(message.identity).digest('hex').slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
}
async function startExport(message, extension) {
  const token = randomUUID(), key = folderKey(message);
  const root = await desktopExportDirectory(), folder = join(root, key);
  await mkdir(folder, { recursive: true });
  if ((await lstat(folder)).isSymbolicLink() || await realpath(folder) !== join(await realpath(root), key)) throw new AppError('desktop_invalid');
  const suffix = extension === 'txt' ? (message.includeQuotes === true ? '-with-quotes' : '-without-quotes') : '';
  const path = join(folder, `mail-${key.slice(0, 8)}${suffix}.${extension}`);
  const lock = join(folder, '.exporting'), temporary = join(folder, `.${token}.tmp`);
  await writeFile(lock, '', { flag: 'wx' });
  return { token, key, root, path, lock, temporary, target: message.target, executable: message.executable };
}
export async function prepareDesktop(message, signal) {
  if (!['chatgpt', 'codex', 'custom'].includes(message.target)) throw new AppError('desktop_invalid');
  if (message.target === 'custom' && (typeof message.executable !== 'string' || !isAbsolute(message.executable) || !/\.exe$/i.test(message.executable) || !(await stat(message.executable)).isFile())) throw new AppError('desktop_invalid');
  const content = serializeMail(message.mail, message.format);
  const session = await startExport(message, 'txt');
  const { token } = session;
  try {
    await writeFile(session.temporary, content, { encoding: 'utf8', flag: 'wx' });
    await rename(session.temporary, session.path);
  } finally {
    await unlink(session.temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await unlink(session.lock);
  }
  sessions.set(token, session);
  return openExport(session, token, signal);
}
async function openExport(session, token, signal) {
  const path = session.path;
  // Return the export even if application launch fails, for manual attachment.
  let opened = false;
  try { await runDesktop({ action: 'open', target: session.target, executable: session.executable }, signal); opened = true; } catch { /* The user can open the application manually. */ }
  let revealed = false;
  try { await revealDesktop({ token }, signal); revealed = true; } catch { /* Keep the path available for manual selection. */ }
  return { token, path, opened, revealed };
}
export async function revealDesktop(message, signal) {
  const session = sessions.get(message.token);
  if (!session) throw new AppError('desktop_invalid');
  return runDesktop({ action: 'reveal', path: session.path }, signal);
}

export async function removeExportFile(root, token, path) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token)) throw new AppError('desktop_cleanup_failed');
  const folder = resolve(root, token);
  if (dirname(resolve(path)) !== folder || !['.txt', '.eml', '-with-quotes.txt', '-without-quotes.txt'].some(ext => basename(path) === `mail-${token.slice(0, 8)}${ext}`)) throw new AppError('desktop_cleanup_failed');
  try {
    const info = await lstat(folder);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(folder) !== join(await realpath(root), token)) throw new AppError('desktop_cleanup_failed');
    await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
    // Never recurse: unexpected files must remain untouched.
    await rmdir(folder);
  } catch (error) { if (error.code !== 'ENOENT') throw new AppError('desktop_cleanup_failed'); }
}
export async function cleanupDesktop(message) {
  const session = sessions.get(message.token);
  if (!session) throw new AppError('desktop_cleanup_failed');
  await removeExportFile(session.root, session.key || message.token, session.path);
  sessions.delete(message.token);
  return { removed: true };
}

export async function beginEml(message) {
  if (!['chatgpt', 'codex', 'custom'].includes(message.target) || !Number.isSafeInteger(message.size) || message.size < 1) throw new AppError('desktop_invalid');
  if (message.target === 'custom' && (typeof message.executable !== 'string' || !isAbsolute(message.executable) || !/\.exe$/i.test(message.executable) || !(await stat(message.executable)).isFile())) throw new AppError('desktop_invalid');
  const session = await startExport(message, 'eml');
  await writeFile(session.temporary, Buffer.alloc(0), { flag: 'wx' });
  sessions.set(session.token, { ...session, size: message.size, received: 0 });
  return { token: session.token, path: session.path };
}
export async function appendEml(message) {
  const session = sessions.get(message.token);
  if (!session || session.finished || !Number.isSafeInteger(session.size) || message.offset !== session.received || typeof message.base64 !== 'string' || message.base64.length > 87384) throw new AppError('desktop_invalid');
  const bytes = Buffer.from(message.base64, 'base64');
  if (!bytes.length || bytes.toString('base64') !== message.base64 || session.received + bytes.length > session.size) throw new AppError('desktop_invalid');
  await appendFile(session.temporary, bytes);
  session.received += bytes.length;
  return { received: session.received };
}
export async function finishEml(message, signal) {
  const session = sessions.get(message.token);
  if (!session || session.finished || !Number.isSafeInteger(session.size) || session.received !== session.size) throw new AppError('desktop_invalid');
  await rename(session.temporary, session.path);
  await unlink(session.lock);
  session.finished = true;
  return openExport(session, message.token, signal);
}

export async function cleanupAllDesktop() {
  // Closing a window or native port must never delete exported files.
  for (const session of sessions.values()) {
    if (session.size && !session.finished) {
      await unlink(session.temporary).catch(() => {});
      await unlink(session.lock).catch(() => {});
    }
  }
  sessions.clear();
}

async function managedExports(root) {
  const files = [];
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return files; throw error; }
  const canonicalRoot = await realpath(root);
  for (const entry of entries) {
    const token = entry.name;
    if (!entry.isDirectory() || entry.isSymbolicLink() || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(token)) continue;
    const folder = join(root, token);
    try {
      if (await realpath(folder) !== join(canonicalRoot, token)) continue;
      const contents = await readdir(folder);
      if (contents.includes('.exporting')) continue;
      for (const ext of ['txt', 'eml', 'with-quotes.txt', 'without-quotes.txt']) {
        const path = join(folder, `mail-${token.slice(0, 8)}${ext.includes('-quotes') ? '-' : '.'}${ext}`);
        if (!contents.includes(basename(path))) continue;
        const info = await lstat(path);
        if (info.isFile() && !info.isSymbolicLink()) files.push({ token, path, size: info.size });
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return files;
}
export async function desktopExportInfo() {
  const path = await desktopExportDirectory();
  const files = await managedExports(path);
  return { path, bytes: files.reduce((sum, file) => sum + file.size, 0), count: files.length };
}
export async function clearDesktopExports(message) {
  const root = await desktopExportDirectory();
  if (message.path !== root) throw new AppError('desktop_invalid');
  for (const file of await managedExports(root)) {
    // Validate every absolute target; never recursively delete a custom folder.
    const folder = resolve(root, file.token);
    if (dirname(resolve(file.path)) !== folder || await realpath(folder) !== join(await realpath(root), file.token)) throw new AppError('desktop_cleanup_failed');
    const info = await lstat(file.path).catch(error => { if (error.code !== 'ENOENT') throw error; });
    if (!info || !info.isFile() || info.isSymbolicLink()) continue;
    await unlink(file.path);
    await rmdir(folder).catch(error => { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; });
  }
  return desktopExportInfo();
}
export function openDesktopFolder(path, signal) { return runDesktop({ action: 'folder', path }, signal); }
