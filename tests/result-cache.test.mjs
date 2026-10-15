import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { cacheGet, cachePut, cacheStats, cacheClear } from '../helper/result-cache.mjs';

test('legacy results cannot bypass new extraction rules and invalid outputs cannot enter the cache', async () => {
  const temporary = await mkdtemp(new URL('../work/cache-security-', import.meta.url));
  const previous = process.env.LOCALAPPDATA; process.env.LOCALAPPDATA = temporary;
  try {
    const descriptor = { version: 1, task: 'translate', text: 'Synthetic email', provider: 'azure' };
    const initial = await cacheGet({ descriptor });
    const directory = (await cacheStats()).path;
    const oldKey = createHash('sha256').update(JSON.stringify(descriptor)).digest('hex');
    await writeFile(join(directory, `${initial.generation}-${oldKey}.json`), JSON.stringify({ text: 'Untrusted old result' }));
    assert.equal((await cacheGet({ descriptor })).text, undefined);
    for (const text of ['x'.repeat(40001), 'Result\u0000hidden']) await assert.rejects(cachePut({ descriptor, generation: initial.generation, text }));
    await cachePut({ descriptor, generation: initial.generation, text: 'Checked new result' });
    assert.equal((await cacheGet({ descriptor })).text, 'Checked new result');
  } finally {
    if (previous === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = previous;
    assert.ok(temporary.startsWith(fileURLToPath(new URL('../work/cache-security-', import.meta.url))));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('cache persists, separates inputs, replaces results and rejects writes after clearing', async () => {
  const temporary = await mkdtemp(new URL('../work/cache-test-', import.meta.url));
  const previous = process.env.LOCALAPPDATA; process.env.LOCALAPPDATA = temporary;
  try {
    const descriptor = { task: 'summary', text: 'Mail body', model: 'test', outputLanguage: 'en' };
    const initial = await cacheGet({ descriptor }); assert.equal(initial.text, undefined);
    await cachePut({ descriptor, generation: initial.generation, text: 'First' });
    const reloaded = await import('../helper/result-cache.mjs?restart');
    assert.equal((await reloaded.cacheGet({ descriptor })).text, 'First');
    for (const change of [{ text: 'Other' }, { outputLanguage: 'de' }, { model: 'other' }, { task: 'translate' }]) assert.equal((await cacheGet({ descriptor: { ...descriptor, ...change } })).text, undefined);
    await cachePut({ descriptor, generation: initial.generation, text: 'Updated' });
    assert.equal((await cacheGet({ descriptor })).text, 'Updated');
    const stats = await cacheStats(); assert.equal(stats.count, 1);
    await writeFile(join(stats.path, 'keep.txt'), 'unrelated');
    assert.equal((await cacheClear()).count, 0);
    assert.equal((await cachePut({ descriptor, generation: initial.generation, text: 'Late result' })).stored, false);
    assert.equal(await readFile(join(stats.path, 'keep.txt'), 'utf8'), 'unrelated');
  } finally { process.env.LOCALAPPDATA = previous; await rm(temporary, { recursive: true, force: true }); }
});

test('native host disconnect cleans its unfinished export without launching any application', async () => {
  const temporary = await mkdtemp(new URL('../work/export-eof-', import.meta.url));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../helper/host.mjs', import.meta.url))], { env: { ...process.env, LOCALAPPDATA: temporary }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const exited = new Promise(resolve => child.on('exit', resolve));
  try {
    const reply = new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);
      child.on('error', reject);
      child.stdout.on('data', chunk => { buffer = Buffer.concat([buffer, chunk]); if (buffer.length >= 4 && buffer.length >= buffer.readUInt32LE(0) + 4) resolve(JSON.parse(buffer.subarray(4).toString())); });
    });
    const body = Buffer.from(JSON.stringify({ id: 1, action: 'beginEml', target: 'chatgpt', size: 4 }));
    const length = Buffer.alloc(4); length.writeUInt32LE(body.length); child.stdin.write(Buffer.concat([length, body]));
    const response = await reply; assert.equal(response.ok, true);
    const folder = dirname(response.result.path);
    await access(join(folder, `.${response.result.token}.tmp`));
    child.stdin.end(); await exited;
    await assert.rejects(access(response.result.path), { code: 'ENOENT' });
    assert.deepEqual(await readdir(folder), []);
  } finally { child.kill(); await rm(temporary, { recursive: true, force: true }); }
});
