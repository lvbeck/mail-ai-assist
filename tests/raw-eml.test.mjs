import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beginEml, appendEml, finishEml, cleanupDesktop, cleanupAllDesktop } from '../helper/desktop-export.mjs';
import { storageFixture, nativeLockOptions } from './storage-fixture.mjs';
test('raw EML chunks preserve every byte including binary attachment data', nativeLockOptions, async t => {
  await storageFixture(t, 'mail-raw-eml-test-', cleanupAllDesktop);
  let session;
  try {
    const bytes = Buffer.concat([Buffer.from('Subject: Original\r\nContent-Type: multipart/mixed; boundary=x\r\n\r\n--x\r\n'), Buffer.from(Array.from({length: 200000}, (_, i) => i % 256))]);
    session = await beginEml({ target: 'chatgpt', size: bytes.length });
    await assert.rejects(finishEml({ token: session.token }), /desktop_invalid/);
    await assert.rejects(appendEml({ token: session.token, offset: 10, base64: 'YQ==' }), /desktop_invalid/);
    for (let offset = 0; offset < bytes.length; offset += 65536) await appendEml({ token: session.token, offset, base64: bytes.subarray(offset, offset + 65536).toString('base64') });
    await finishEml({ token: session.token }, AbortSignal.abort());
    assert.deepEqual(await readFile(session.path), bytes);
    await assert.rejects(appendEml({ token: session.token, offset: bytes.length, base64: 'YQ==' }), /desktop_invalid/);
  } finally {
    if (session) await cleanupDesktop({ token: session.token });
  }
});
