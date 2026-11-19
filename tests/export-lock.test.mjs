import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { mkdir, writeFile, readFile, unlink, rmdir, lstat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { prepareDesktop, beginEml, cleanupDesktop, cleanupAllDesktop, desktopExportInfo, clearDesktopExports } from '../helper/desktop-export.mjs';
import { storageFixture, nativeLockOptions as options } from './storage-fixture.mjs';

const message = { identity: 'synthetic-export', target: 'chatgpt', format: 'txt', mail: { body: 'Keep this export' } };
async function fixture(t) {
  return storageFixture(t, 'mail-export-lock-', cleanupAllDesktop);
}
async function writeMarker(path, marker) {
  await mkdir(path);
  await writeFile(join(path, 'owner.json'), marker);
}

test('stale export markers are recovered without deleting previous exports', options, async t => {
  await fixture(t);
  const first = await prepareDesktop(message, AbortSignal.abort());
  await beginEml({ ...message, size: 3 });
  const markerPath = join(dirname(first.path), '.exporting');
  const marker = await readFile(join(markerPath, 'owner.json'), 'utf8');
  await cleanupAllDesktop();
  await writeMarker(markerPath, marker);
  assert.equal((await desktopExportInfo()).count, 1);
  await writeMarker(markerPath, marker);
  await beginEml({ ...message, size: 3 });
  assert.match(await readFile(first.path, 'utf8'), /Keep this export/);
});

test('failed TXT and EML initialization releases its marker and preserves a colliding temporary file', options, async t => {
  await fixture(t);
  const first = await prepareDesktop(message, AbortSignal.abort());
  const token = '12345678-1234-1234-1234-123456789abc';
  const temporary = join(dirname(first.path), `.${token}.tmp`);
  await writeFile(temporary, 'unrelated temporary content');
  t.mock.method(crypto, 'randomUUID', () => token);
  syncBuiltinESMExports();
  try {
    for (const format of ['txt', 'eml']) {
      const attempt = format === 'txt' ? prepareDesktop(message, AbortSignal.abort()) : beginEml({ ...message, size: 3 });
      await assert.rejects(attempt, { code: 'EEXIST' });
      assert.equal(await readFile(temporary, 'utf8'), 'unrelated temporary content');
    }
  }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(await readFile(temporary, 'utf8'), 'unrelated temporary content');
  await unlink(temporary);
  await beginEml({ ...message, size: 3 });
  assert.match(await readFile(first.path, 'utf8'), /Keep this export/);
});

test('an earlier export session cannot delete files while the same message is exporting again', options, async t => {
  await fixture(t);
  const first = await prepareDesktop(message, AbortSignal.abort());
  await beginEml({ ...message, size: 3 });
  await assert.rejects(cleanupDesktop({ token: first.token }), /desktop_cleanup_failed/);
  assert.match(await readFile(first.path, 'utf8'), /Keep this export/);
});

test('foreign and legacy export markers remain untouched', options, async t => {
  await fixture(t);
  const first = await prepareDesktop(message, AbortSignal.abort());
  const path = join(dirname(first.path), '.exporting');
  for (const marker of ['', JSON.stringify({ version: 1, owner: 'foreign', resource: 'foreign' })]) {
    if (marker) await writeMarker(path, marker); else await writeFile(path, marker);
    await assert.rejects(beginEml({ ...message, size: 3 }), { code: 'operation_busy' });
    assert.equal((await desktopExportInfo()).count, 0);
    assert.equal(await readFile(marker ? join(path, 'owner.json') : path, 'utf8'), marker);
    assert.match(await readFile(first.path, 'utf8'), /Keep this export/);
    if (marker) { await unlink(join(path, 'owner.json')); await rmdir(path); } else await unlink(path);
  }
});

test('a foreign export starting during cleanup prevents deleting the captured file', options, async t => {
  await fixture(t);
  for (const action of ['session', 'clear']) {
    const first = await prepareDesktop(message, AbortSignal.abort());
    const markerPath = join(dirname(first.path), '.exporting');
    const original = fs.lstat;
    let inserted = false;
    t.mock.method(fs, 'lstat', async (path, ...args) => {
      try { return await original(path, ...args); }
      catch (error) {
        if (path === markerPath && error.code === 'ENOENT' && !inserted) {
          inserted = true;
          // Publish a foreign claim after the cleaner observed the marker as absent.
          await writeMarker(path, JSON.stringify({ owner: 'foreign' }));
        }
        throw error;
      }
    });
    syncBuiltinESMExports();
    try {
      if (action === 'session') await assert.rejects(cleanupDesktop({ token: first.token }), /desktop_cleanup_failed/);
      else await clearDesktopExports({ path: dirname(dirname(first.path)) });
      assert.equal(inserted, true);
      assert.match(await readFile(first.path, 'utf8'), /Keep this export/);
      assert.deepEqual(JSON.parse(await readFile(join(markerPath, 'owner.json'), 'utf8')), { owner: 'foreign' });
    } finally {
      t.mock.restoreAll(); syncBuiltinESMExports();
      await unlink(join(markerPath, 'owner.json')); await rmdir(markerPath);
    }
  }
});

test('an interrupted marker write cannot publish an empty lock or block a retry', options, async t => {
  await fixture(t);
  const first = await prepareDesktop(message, AbortSignal.abort());
  const original = fs.writeFile;
  t.mock.method(fs, 'writeFile', async (path, data, ...args) => {
    if (String(path).endsWith('owner.json')) {
      await original(path, '', ...args);
      throw Object.assign(new Error('synthetic write failure'), { code: 'EIO' });
    }
    return original(path, data, ...args);
  });
  syncBuiltinESMExports();
  try { await assert.rejects(beginEml({ ...message, size: 3 }), { code: 'EIO' }); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  await assert.rejects(lstat(join(dirname(first.path), '.exporting')), { code: 'ENOENT' });
  await beginEml({ ...message, size: 3 });
  assert.match(await readFile(first.path, 'utf8'), /Keep this export/);
});

test('a hard-terminated EML owner does not permanently block the next export', options, async t => {
  const { root } = await fixture(t);
  const module = new URL('../helper/desktop-export.mjs', import.meta.url).href;
  const script = `import { beginEml } from ${JSON.stringify(module)};
await beginEml({ identity: 'synthetic-export', target: 'chatgpt', size: 3 });
process.stdout.write('ready');
setInterval(() => {}, 1000);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), LOCALAPPDATA: root, HOME: root, TMPDIR: root, TEMP: root, TMP: root },
    stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true
  });
  const exited = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill(); await exited; });
  assert.equal(String((await once(child.stdout, 'data'))[0]), 'ready');
  await assert.rejects(beginEml({ ...message, size: 3 }));
  child.kill(); await exited;
  const next = await prepareDesktop(message, AbortSignal.abort());
  assert.match(await readFile(next.path, 'utf8'), /Keep this export/);
});
