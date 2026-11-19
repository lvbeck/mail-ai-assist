import { createHash } from 'node:crypto';
import { mkdir, open, realpath } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { AppError } from './core.mjs';
import { dataDirectory } from './platform.mjs';

export async function acquireProcessLock(resource, busyCode = 'operation_busy') {
  const root = dataDirectory();
  await mkdir(root, { recursive: true });
  const identity = JSON.stringify([await realpath(root), resource]);
  const digest = createHash('sha256').update(process.platform === 'win32' ? identity.toLowerCase() : identity).digest('hex');
  let release;
  if (process.platform === 'win32') {
    // Named pipes have process-owned lifetime; no stale file needs to be deleted.
    const server = createServer(socket => socket.destroy());
    await new Promise((resolve, reject) => {
      server.once('error', error => reject(new AppError(error.code === 'EADDRINUSE' ? busyCode : 'storage_unavailable')));
      server.listen({ path: `\\\\.\\pipe\\mail-ai-assist-${digest}`, exclusive: true }, resolve);
    });
    release = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } else if (process.platform === 'darwin') {
    const locks = join(root, 'Locks');
    await mkdir(locks, { recursive: true, mode: 0o700 });
    // Keep a stable inode. Removing a flock file would allow parallel owners.
    const file = await open(join(locks, digest + '.lock'), 'a+', 0o600);
    try {
      const { runMacNative } = await import('./macos.mjs');
      await runMacNative({ action: 'fileLock' }, undefined, file.fd);
    } catch (error) {
      await file.close();
      throw new AppError(error.code === 'operation_busy' ? busyCode : 'storage_unavailable');
    }
    release = () => file.close();
  } else {
    throw new AppError('storage_unavailable');
  }
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await release();
  };
}
