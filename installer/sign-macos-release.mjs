// Run after PKG signing and stapling. This script never uploads anything.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, createPublicKey, sign } from 'node:crypto';
import { join, resolve } from 'node:path';
import { releaseAssetUrl, releaseFilename } from '../helper/update-core.mjs';

const arch = process.argv[2], publicPath = process.argv[3];
if (!['arm64', 'x64'].includes(arch) || !publicPath) throw new Error('Usage: node installer/sign-macos-release.mjs arm64|x64 public-key.pem');
const config = { ...JSON.parse(await readFile('installer/release-config.json', 'utf8')), platform: `macos-${arch}` };
let privateKey;
if (process.env.MAIL_AI_SIGNING_KEY_FILE && process.platform === 'win32') {
  privateKey = await (await import('../helper/windows.mjs')).unprotect(await readFile(process.env.MAIL_AI_SIGNING_KEY_FILE, 'utf8'));
} else if (process.env.MAIL_AI_MAC_SIGNING_KEY_FILE) {
  // An externally managed CI secret file; never copy it into the repository or artifacts.
  privateKey = await readFile(process.env.MAIL_AI_MAC_SIGNING_KEY_FILE, 'utf8');
} else { throw new Error('Configure the existing Windows DPAPI key or an external macOS signing-key file.'); }
const expected = createPublicKey(await readFile(publicPath, 'utf8')).export({ type: 'spki', format: 'pem' });
const actual = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
if (actual !== expected) throw new Error('The signing key does not match the supplied build public key.');
const folder = resolve('dist/macos', config.version), filename = releaseFilename(config, config.version);
const bytes = await readFile(join(folder, filename));
const sha256 = createHash('sha256').update(bytes).digest('hex');
const payload = Buffer.from(JSON.stringify({ schema: 1, product: 'mail-ai-assist-helper', platform: config.platform,
  version: config.version, url: releaseAssetUrl(config, config.version, filename), size: bytes.length, sha256 }));
const manifestName = `helper-updates-${config.platform}.json`;
const envelope = JSON.stringify({ algorithm: 'RSA-SHA256', payload: payload.toString('base64'), signature: sign('RSA-SHA256', payload, privateKey).toString('base64') }, null, 2) + '\n';
await writeFile(join(folder, manifestName), envelope);
await writeFile(join(folder, `SHA256SUMS-${config.platform}.txt`), `${sha256}  ${filename}\n${createHash('sha256').update(envelope).digest('hex')}  ${manifestName}\n`);
console.log(`Signed ${manifestName}; Windows update assets are unchanged.`);
