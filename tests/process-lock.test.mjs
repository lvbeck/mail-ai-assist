import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { acquireProcessLock } from '../helper/process-lock.mjs';
import { withSessionLock } from '../helper/auth.mjs';
import { storageFixture, nativeLockOptions as options } from './storage-fixture.mjs';

async function fixture(t) {
  return storageFixture(t, 'mail-process-lock-');
}

test('process locks exclude parallel owners and can be reacquired after release', options, async t => {
  await fixture(t);
  const release = await acquireProcessLock('test-exclusive');
  try { await assert.rejects(acquireProcessLock('test-exclusive'), { code: 'operation_busy' }); }
  finally { await release(); }
  const next = await acquireProcessLock('test-exclusive');
  await next();
});

test('legacy empty and stale PID files cannot block credential operations', options, async t => {
  const { dataRoot: directory } = await fixture(t);
  await mkdir(directory, { recursive: true });
  for (const value of ['', '999999999', 'invalid']) {
    await writeFile(join(directory, 'login.lock'), value);
    assert.equal(await withSessionLock(async () => 'completed'), 'completed');
  }
  await assert.rejects(withSessionLock(async () => { throw new Error('synthetic failure'); }), /synthetic failure/);
  assert.equal(await withSessionLock(async () => 'released'), 'released');
});

test('terminating a lock owner releases exclusion without stale-file recovery', options, async t => {
  const { root } = await fixture(t);
  const module = new URL('../helper/process-lock.mjs', import.meta.url).href;
  const script = `import { acquireProcessLock } from ${JSON.stringify(module)};
await acquireProcessLock('test-owner-exit');
process.stdout.write('locked');
setInterval(() => {}, 1000);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), LOCALAPPDATA: root, HOME: root, TMPDIR: root, TEMP: root, TMP: root },
    stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true
  });
  const exited = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill(); await exited; });
  assert.equal(String((await once(child.stdout, 'data'))[0]), 'locked');
  await assert.rejects(acquireProcessLock('test-owner-exit'), { code: 'operation_busy' });
  child.kill(); await exited;
  const release = await acquireProcessLock('test-owner-exit');
  await release();
});
