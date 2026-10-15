import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { verifyRelease, verifyPackage, newerVersion, limitedDownload } from '../helper/update-core.mjs';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const config = { baseUrl: 'https://example.invalid/downloads/', publicKey };
const bytes = Buffer.from('Synthetic installer bytes');
const release = { schema: 1, product: 'mail-ai-assist-helper', platform: 'windows-x64', version: '0.9.1', url: config.baseUrl + 'releases/0.9.1/Mail-AI-Assist-0.9.1-x64.msi', size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
function envelope(value) { const data = Buffer.from(JSON.stringify(value)); return { algorithm: 'RSA-SHA256', payload: data.toString('base64'), signature: sign('RSA-SHA256', data, privateKey).toString('base64') }; }
test('signed release and exact package accepted', () => {
  assert.deepEqual(verifyRelease(envelope(release), config), release);
  verifyPackage(bytes, release);
});
test('tampered payload and foreign signing key rejected', () => {
  const value = envelope(release); value.payload = Buffer.from(JSON.stringify({ ...release, version: '0.9.2' })).toString('base64');
  assert.throws(() => verifyRelease(value, config), /signature/);
  const foreign = generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.throws(() => verifyRelease(envelope(release), { ...config, publicKey: foreign.publicKey }), /signature/);
});
test('signed but wrong product, origin, version, size or schema rejected', () => {
  for (const change of [{ product: 'other' }, { platform: 'linux' }, { schema: 2 }, { url: 'https://evil.invalid/setup.msi' }, { url: config.baseUrl + 'releases/../evil.msi' }, { version: '0.9.1 & cmd' }, { size: 250000000 }, { sha256: 'invalid' }]) {
    assert.throws(() => verifyRelease(envelope({ ...release, ...change }), config));
  }
});
test('modified or truncated package rejected', () => {
  assert.throws(() => verifyPackage(Buffer.from('changed'), release), /hash/);
  const changed = Buffer.from(bytes); changed[0] ^= 1;
  assert.throws(() => verifyPackage(changed, release), /hash/);
});
test('numeric versions prevent same-version reinstall and downgrade', () => {
  assert.equal(newerVersion('0.10.0', '0.9.9'), true);
  assert.equal(newerVersion('0.9.0', '0.9.0'), false);
  assert.equal(newerVersion('0.8.3', '0.9.0'), false);
  for (const value of ['1.2', '1.2.3.4', '256.1.1', '1.0.65536', '01.2.3']) assert.throws(() => newerVersion(value, '0.9.0'));
});
test('download rejects oversized responses and disables redirects', async () => {
  const fake = async (url, options) => { assert.equal(options.redirect, 'error'); return new Response(bytes); };
  assert.deepEqual(await limitedDownload('https://example.invalid/file', bytes.length, fake), bytes);
  await assert.rejects(limitedDownload('https://example.invalid/file', 2, fake), /too_large/);
  await assert.rejects(limitedDownload('https://example.invalid/file', 32, async () => new Response('missing', { status: 404 })), /failed/);
});

for (const language of ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko']) test(`localized update verifies ${language} and rejects a different package language`, () => {
  const suffix = language === 'en' ? '' : '-' + language;
  const localized = { ...release, url: release.url.replace('-x64.msi', `-x64${suffix}.msi`) };
  assert.deepEqual(verifyRelease(envelope(localized), { ...config, installerLanguage: language }), localized);
  const other = language === 'de' ? 'fr' : 'de';
  assert.throws(() => verifyRelease(envelope(localized), { ...config, installerLanguage: other }), /invalid_download_url/);
});

const githubConfig = { ...config, githubRepository: 'lvbeck/mail-ai-assist' };
const githubUrl = 'https://github.com/lvbeck/mail-ai-assist/releases/download/v0.9.1/Mail-AI-Assist-0.9.1-x64.msi';
test('GitHub signatures pin the repository and versioned asset', () => {
  assert.equal(verifyRelease(envelope({ ...release, url: githubUrl }), githubConfig).url, githubUrl);
  assert.throws(() => verifyRelease(envelope(release), githubConfig), /download_url/);
  assert.throws(() => verifyRelease(envelope({ ...release, url: githubUrl.replace('mail-ai-assist', 'other') }), githubConfig), /download_url/);
});
test('GitHub downloads follow bounded repository and asset CDN redirects', async () => {
  let count = 0;
  const fake = async (url, options) => {
    assert.equal(options.redirect, 'manual'); count++;
    return count === 1 ? new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/example?token=synthetic' } }) : new Response(bytes);
  };
  assert.deepEqual(await limitedDownload(githubUrl, bytes.length, fake), bytes);
  assert.equal(count, 2);
});
test('GitHub rejects foreign hosts, repositories, credentials, insecure URLs and redirect loops', async () => {
  for (const location of ['https://evil.invalid/x', 'http://release-assets.githubusercontent.com/x', 'https://github.com/other/repo/releases/a', 'https://user@release-assets.githubusercontent.com/x', 'https://release-assets.githubusercontent.com:444/x']) {
    let calls = 0;
    await assert.rejects(limitedDownload(githubUrl, 32, async () => { calls++; return new Response(null, { status: 302, headers: { location } }); }), /invalid_redirect/);
    assert.equal(calls, 1);
  }
  await assert.rejects(limitedDownload(githubUrl, 32, async () => new Response(null, { status: 302, headers: { location: githubUrl } })), /invalid_redirect/);
});
