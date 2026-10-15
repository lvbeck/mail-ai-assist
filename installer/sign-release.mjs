import { generateKeyPairSync, createPublicKey, sign, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { releaseAssetUrl } from '../helper/update-core.mjs';
import { protect, unprotect } from '../helper/windows.mjs';

const root = resolve('.');
const config = JSON.parse(await readFile('installer/release-config.json', 'utf8'));
const privatePath = resolve(process.env.MAIL_AI_SIGNING_KEY_FILE || join(root, 'release-private', 'update-signing-key.dpapi'));
// Existing release keys may live outside the repository; never copy them into artifacts.
let privateKey;
try { privateKey = await unprotect(await readFile(privatePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  if (!process.argv.includes('--init-key')) throw new Error('Signing key missing. Set MAIL_AI_SIGNING_KEY_FILE to your existing key, or explicitly initialize a new project key with --init-key.');
  await mkdir(dirname(privatePath), { recursive: true });
  privateKey = generateKeyPairSync('rsa', { modulusLength: 3072, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey;
  await writeFile(privatePath, await protect(privateKey), { flag: 'wx' });
}
if (process.argv.includes('--init-key')) { console.log('Signing key available; no packages were built.'); process.exit(0); }
const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
if (process.argv.includes('--prepare')) {
  await mkdir('work/msi-stage', { recursive: true });
  await writeFile('work/msi-stage/msi-install.json', JSON.stringify({ ...config, publicKey }, null, 2));
} else {
  const folder = resolve('dist/server-upload');
  const filename = `Mail-AI-Assist-${config.version}-x64.msi`;
  const bytes = await readFile(join(folder, 'releases', config.version, filename));
  const payload = Buffer.from(JSON.stringify({ schema: 1, product: 'mail-ai-assist-helper', platform: 'windows-x64', version: config.version, url: releaseAssetUrl(config, config.version, filename), size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }));
  await writeFile(join(folder, 'helper-updates.json'), JSON.stringify({ algorithm: 'RSA-SHA256', payload: payload.toString('base64'), signature: sign('RSA-SHA256', payload, privateKey).toString('base64') }, null, 2));
  console.log('Signed helper update manifest. Private key remains encrypted outside upload files.');
}
