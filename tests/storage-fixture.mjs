import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { dataDirectory } from '../helper/platform.mjs';

const nativeAvailable = process.platform === 'win32' ||
  (process.platform === 'darwin' && existsSync(new URL('../native/mail-ai-assist-macos', import.meta.url)));
export const nativeLockOptions = {
  skip: nativeAvailable ? false : 'Requires Windows or a built macOS native bridge', timeout: 10000
};

export async function storageFixture(t, prefix, cleanup = async () => {}) {
  const path = join(tmpdir(), prefix), root = await mkdtemp(path);
  const original = { LOCALAPPDATA: process.env.LOCALAPPDATA, HOME: process.env.HOME };
  process.env.LOCALAPPDATA = root;
  if (process.platform === 'darwin') process.env.HOME = root;
  const dataRoot = dataDirectory();
  assert.ok(dataRoot.startsWith(root + sep));
  t.after(async () => {
    try { await cleanup(); }
    finally {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      assert.ok(root.startsWith(path));
      await rm(root, { recursive: true, force: true });
    }
  });
  return { root, dataRoot };
}
