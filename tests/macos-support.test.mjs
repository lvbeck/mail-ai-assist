import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, generateKeyPairSync, createHash, sign } from 'node:crypto';
import vm from 'node:vm';
import { dataDirectory, validateDesktopApplication } from '../helper/platform.mjs';
import { encryptCredential, decryptCredential } from '../helper/credential-envelope.mjs';
import { verifyRelease, releaseFilename, releaseAssetUrl } from '../helper/update-core.mjs';
import { checkMacUpdate, validateMacConfig, installMacUpdateFromCache } from '../helper/mac-update.mjs';

test('platform storage preserves Windows paths and uses macOS Application Support', () => {
  assert.equal(dataDirectory('win32', { LOCALAPPDATA: 'C:/Users/Test/AppData/Local' }), join('C:/Users/Test/AppData/Local', 'MailAiAssist'));
  assert.equal(dataDirectory('darwin', {}, '/Users/测试 User'), '/Users/测试 User/Library/Application Support/MailAiAssist');
  assert.throws(() => dataDirectory('win32', {}), /storage_unavailable/);
  assert.throws(() => dataDirectory('darwin', {}, 'relative'), /storage_unavailable/);
  assert.throws(() => dataDirectory('linux', {}, '/home/user'), /storage_unavailable/);
});

test('credential encryption authenticates content, metadata and per-user key', () => {
  const key = randomBytes(32), text = '{"token":"synthetic-not-a-real-token","name":"测试"}';
  const encrypted = encryptCredential(text, key);
  assert.equal(decryptCredential(encrypted, key), text);
  assert.notEqual(encrypted, encryptCredential(text, key));
  assert.ok(!encrypted.includes('synthetic'));
  assert.throws(() => decryptCredential(encrypted, randomBytes(32)));
  const value = JSON.parse(encrypted);
  for (const field of ['iv', 'tag', 'data']) {
    const bytes = Buffer.from(value[field], 'base64'); bytes[0] ^= 1;
    assert.throws(() => decryptCredential(JSON.stringify({ ...value, [field]: bytes.toString('base64') }), key));
  }
  assert.throws(() => decryptCredential(JSON.stringify({ ...value, version: 2 }), key));
  assert.throws(() => decryptCredential('Windows-DPAPI-data', key));
});

test('custom app validation distinguishes Mac bundles from Windows executables', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mail-ai-platform-'));
  try {
    const bundle = join(directory, 'Test App.app'), exe = join(directory, 'test.exe'), fake = join(directory, 'fake.app');
    await mkdir(bundle); await writeFile(exe, 'test only'); await writeFile(fake, 'not a bundle');
    await validateDesktopApplication(bundle, 'darwin');
    await validateDesktopApplication(exe, 'win32');
    await assert.rejects(validateDesktopApplication(exe, 'darwin'));
    await assert.rejects(validateDesktopApplication(bundle, 'win32'));
    await assert.rejects(validateDesktopApplication(fake, 'darwin'));
    await assert.rejects(validateDesktopApplication('relative.app', 'darwin'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const base = { version: '0.12.25', githubRepository: 'lvbeck/mail-ai-assist', baseUrl: 'https://github.com/lvbeck/mail-ai-assist/releases/latest/download/', publicKey };
function fixture(arch, bytes = Buffer.from('synthetic PKG, never executed')) {
  const config = { ...base, platform: `macos-${arch}` };
  const release = { version: '0.12.26', platform: config.platform, product: 'mail-ai-assist-helper', schema: 1,
    url: releaseAssetUrl(config, '0.12.26', releaseFilename(config, '0.12.26')), size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  const payload = Buffer.from(JSON.stringify(release));
  const envelope = { algorithm: 'RSA-SHA256', payload: payload.toString('base64'), signature: sign('RSA-SHA256', payload, privateKey).toString('base64') };
  return { config, release, envelope, bytes };
}
for (const arch of ['arm64', 'x64']) {
  test(`${arch}: signed feeds are isolated from Windows and the other Mac architecture`, () => {
    const { config, release, envelope } = fixture(arch);
    assert.deepEqual(validateMacConfig(config, arch), config);
    assert.deepEqual(verifyRelease(envelope, config), release);
    assert.throws(() => verifyRelease(envelope, base), /wrong_product/);
    assert.throws(() => verifyRelease(envelope, { ...config, platform: arch === 'arm64' ? 'macos-x64' : 'macos-arm64' }), /wrong_product/);
    assert.throws(() => validateMacConfig(config, arch === 'arm64' ? 'x64' : 'arm64'));
    assert.throws(() => validateMacConfig({ ...config, baseUrl: 'https://evil.invalid/' }, arch));
  });
  test(`${arch}: update download verifies bytes, retains retry state and checks at most daily`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mail-ai-mac-update-'));
    const { config, release, envelope, bytes } = fixture(arch);
    const requested = [];
    const download = async url => { requested.push(url); return url.endsWith('.json') ? Buffer.from(JSON.stringify(envelope)) : bytes; };
    try {
      await checkMacUpdate(config, directory, download);
      assert.equal(requested[0], `${config.baseUrl}helper-updates-macos-${arch}.json`);
      assert.equal(requested[1], release.url);
      const status = JSON.parse(await readFile(join(directory, 'status.json')));
      assert.equal(status.state, 'ready');
      assert.deepEqual(await readFile(join(directory, releaseFilename(config, release.version))), bytes);
      await checkMacUpdate(config, directory, download);
      assert.equal(requested.length, 2);
      await assert.rejects(readFile(join(directory, 'check.lock')), { code: 'ENOENT' });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}

test('Mac updater rejects a corrupted package without offering installation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mail-ai-mac-corrupt-'));
  const { config, envelope } = fixture('arm64');
  try {
    await assert.rejects(checkMacUpdate(config, directory, async url => url.endsWith('.json') ? Buffer.from(JSON.stringify(envelope)) : Buffer.from('tampered')), /hash_mismatch/);
    assert.equal(JSON.parse(await readFile(join(directory, 'status.json'))).state, 'update_failed');
    await assert.rejects(readFile(join(directory, 'pending-release.json')), { code: 'ENOENT' });
    await assert.rejects(readFile(join(directory, 'check.lock')), { code: 'ENOENT' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Mac updater ignores same-version releases and live checker locks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mail-ai-mac-lock-'));
  const { config, envelope } = fixture('x64');
  let requests = 0;
  try {
    await writeFile(join(directory, 'check.lock'), String(process.pid));
    await checkMacUpdate(config, directory, async () => { requests++; });
    assert.equal(requests, 0);
    await rm(join(directory, 'check.lock'));
    await checkMacUpdate({ ...config, version: '0.12.26' }, directory, async () => { requests++; return Buffer.from(JSON.stringify(envelope)); });
    assert.equal(requests, 1);
    assert.equal(JSON.parse(await readFile(join(directory, 'status.json'))).state, 'current');
    await assert.rejects(readFile(join(directory, 'pending-release.json')), { code: 'ENOENT' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('macOS copy is localized on first render and language changes without altering Windows labels', async () => {
  const translations = await readFile(new URL('../extension/translations.js', import.meta.url), 'utf8');
  const localization = await readFile(new URL('../extension/localization.js', import.meta.url), 'utf8');
  for (const os of ['mac', 'win']) {
    const sourceKey = '需要单独安装 Windows x64 辅助程序（MSI）。下载后手动安装，重启 Thunderbird，再登录或填写 API Key。';
    const text = { textContent: sourceKey, parentElement: { closest() { return false; } } };
    const context = { navigator: { languages: ['zh-CN'] }, NodeFilter: { SHOW_TEXT: 4 }, Event: class {},
      window: { dispatchEvent() {} },
      document: { body: { dataset: { page: 'settings' } }, documentElement: {}, getElementById() { return null; }, querySelectorAll() { return []; },
        createTreeWalker() { let done = false; return { nextNode() { if (done) return null; done = true; return text; } }; } },
      messenger: { runtime: { async getPlatformInfo() { return { os }; } }, i18n: { getUILanguage() { return 'zh-CN'; } },
        storage: { local: { async get() { return { uiLanguage: 'zh-CN' }; }, async set() {} } } } };
    vm.runInNewContext(translations, context); vm.runInNewContext(localization, context);
    await context.ComposeI18n.initialize();
    assert.match(text.textContent, os === 'mac' ? /macOS/ : /Windows/);
    for (const locale of Object.keys(context.ComposeTranslations)) {
      await context.ComposeI18n.setInterface(locale);
      assert.match(text.textContent, os === 'mac' ? /macOS/ : /Windows/);
      for (const key of ['macHelperSetup', 'macHelperDownload', 'macHelperUnavailable', 'macHelperUpgrade', 'macApplicationPath', 'macUpdateChannel', 'macUpdateReady', 'macUpdateInstall']) {
        assert.ok(context.ComposeTranslations[locale][key], `${locale}: ${key}`);
      }
    }
    assert.match(context.ComposeI18n.t('下载辅助程序（Windows x64）'), /Windows/);
  }
});


test('Mac installation rechecks signatures and bytes before opening Installer and allows retry', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mail-ai-mac-install-'));
  const { config, release, envelope, bytes } = fixture('arm64');
  const packagePath = join(directory, releaseFilename(config, release.version));
  let opened = 0;
  const installer = async request => { assert.equal(request.action, 'install'); assert.equal(request.path, packagePath); opened++; };
  try {
    await writeFile(join(directory, 'pending-release.json'), JSON.stringify(envelope));
    await writeFile(packagePath, 'changed after download');
    await assert.rejects(installMacUpdateFromCache(config, directory, installer), /hash_mismatch/);
    assert.equal(opened, 0);
    await writeFile(packagePath, bytes);
    await installMacUpdateFromCache(config, directory, installer);
    await installMacUpdateFromCache(config, directory, installer);
    assert.equal(opened, 2);
    assert.equal(JSON.parse(await readFile(join(directory, 'status.json'))).state, 'installer_opened');
    await assert.rejects(installMacUpdateFromCache({ ...config, version: release.version }, directory, installer), /already_current/);
    await assert.rejects(installMacUpdateFromCache({ ...config, platform: 'macos-x64' }, directory, installer), /wrong_product/);
    assert.equal(opened, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
