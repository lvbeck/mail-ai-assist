import { mkdir, readFile, writeFile, rename, readdir, unlink, stat, link } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { openDesktopFolder } from './desktop-export.mjs';
import { validateResultText } from './core.mjs';
import { dataDirectory } from './platform.mjs';
const root = () => join(dataDirectory(), 'Cache');
const validGeneration = value => /^[0-9a-f-]{36}$/.test(value);
async function generation() {
  await mkdir(root(), { recursive: true });
  const path = join(root(), '.generation');
  let value;
  try { value = await readFile(path, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const temporary = join(root(), '.generation-' + randomUUID());
    try {
      await writeFile(temporary, randomUUID(), { flag: 'wx' });
      // Publish a fully written marker without replacing another process's marker.
      try { await link(temporary, path); } catch (failure) { if (failure.code !== 'EEXIST') throw failure; }
    } finally { await unlink(temporary).catch(failure => { if (failure.code !== 'ENOENT') throw failure; }); }
    value = await readFile(path, 'utf8');
  }
  if (!validGeneration(value)) throw new Error('Invalid cache generation');
  return value;
}
function key(descriptor) {
  if (!descriptor || !['summary', 'translate'].includes(descriptor.task)) throw new Error('Invalid cache task');
  return createHash('sha256').update('mail-content-safety-v2\n' + JSON.stringify(descriptor)).digest('hex');
}
export async function cacheGet({ descriptor }) {
  const current = await generation();
  const path = join(root(), `${current}-${key(descriptor)}.json`);
  let entry;
  try { if ((await stat(path)).size <= 800000) entry = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
  let text;
  try { text = validateResultText(entry?.text); } catch {}
  return { generation: current, text };
}
export async function cachePut({ descriptor, generation: expected, text }) {
  if (!validGeneration(expected) || typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 800000) throw new Error('Invalid cache entry');
  validateResultText(text);
  if (await generation() !== expected) return { stored: false };
  const path = join(root(), `${expected}-${key(descriptor)}.json`);
  const temporary = path + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, JSON.stringify({ text, createdAt: new Date().toISOString() }), { flag: 'wx' });
    await rename(temporary, path);
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  if (await generation() !== expected) { await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; }); return { stored: false }; }
  return { stored: true };
}
const entryName = /^[0-9a-f-]{36}-[0-9a-f]{64}\.json$/;
export async function cacheStats() {
  const current = await generation();
  let count = 0, bytes = 0;
  for (const entry of await readdir(root(), { withFileTypes: true })) {
    if (!entry.isFile() || !entryName.test(entry.name) || !entry.name.startsWith(current)) continue;
    try { const info = await stat(join(root(), entry.name)); count++; bytes += info.size; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { count, bytes, path: root() };
}
export async function cacheClear() {
  const previous = await generation();
  const temporary = join(root(), '.generation-' + randomUUID());
  await writeFile(temporary, randomUUID(), { flag: 'wx' });
  await rename(temporary, join(root(), '.generation'));
  for (const entry of await readdir(root(), { withFileTypes: true })) {
    if (entry.isFile() && entryName.test(entry.name) && entry.name.startsWith(previous)) await unlink(join(root(), entry.name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return cacheStats();
}
export async function cacheOpen(signal) { await mkdir(root(), { recursive: true }); return openDesktopFolder(root(), signal); }
