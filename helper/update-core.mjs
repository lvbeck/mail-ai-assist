import { verify, createHash } from 'node:crypto';

export function versionParts(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error('invalid_version');
  const parts = value.split('.').map(Number);
  if (parts[0] > 255 || parts[1] > 255 || parts[2] > 65535) throw new Error('invalid_version');
  return parts;
}
export function newerVersion(candidate, installed) {
  const a = versionParts(candidate), b = versionParts(installed);
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}
export function installerSuffix(config) {
  const language = config.installerLanguage || 'en';
  if (!['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'].includes(language)) throw new Error('invalid_installer_language');
  return language === 'en' ? '' : '-' + language;
}
export function releaseAssetUrl(config, version, filename) {
  versionParts(version);
  if (config.githubRepository) {
    if (config.githubRepository !== 'lvbeck/mail-ai-assist') throw new Error('invalid_repository');
    return `https://github.com/${config.githubRepository}/releases/download/v${version}/${filename}`;
  }
  return `${config.baseUrl}releases/${version}/${filename}`;
}
export function verifyRelease(envelope, config) {
  if (envelope?.algorithm !== 'RSA-SHA256' || typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string' || envelope.payload.length > 24000) throw new Error('invalid_manifest');
  const payload = Buffer.from(envelope.payload, 'base64');
  if (!verify('RSA-SHA256', payload, config.publicKey, Buffer.from(envelope.signature, 'base64'))) throw new Error('invalid_signature');
  const release = JSON.parse(payload.toString('utf8'));
  versionParts(release.version);
  if (release.product !== 'mail-ai-assist-helper' || release.platform !== 'windows-x64' || release.schema !== 1) throw new Error('wrong_product');
  if (release.url !== releaseAssetUrl(config, release.version, `Mail-AI-Assist-${release.version}-x64${installerSuffix(config)}.msi`)) throw new Error('invalid_download_url');
  if (!/^[a-f0-9]{64}$/.test(release.sha256) || !Number.isSafeInteger(release.size) || release.size < 1 || release.size > 200 * 1024 * 1024) throw new Error('invalid_package');
  return release;
}
export function verifyPackage(bytes, release) {
  if (bytes.length !== release.size || createHash('sha256').update(bytes).digest('hex') !== release.sha256) throw new Error('package_hash_mismatch');
}
export async function limitedDownload(url, limit, fetcher = fetch) {
  const initial = new URL(url);
  const prefix = '/lvbeck/mail-ai-assist/releases/';
  const github = initial.origin === 'https://github.com' && initial.pathname.startsWith(prefix) && !initial.username && !initial.password;
  const signal = AbortSignal.timeout(120000);
  let current = initial, response;
  for (let hops = 0; ; hops++) {
    response = await fetcher(current.href, { redirect: github ? 'manual' : 'error', signal });
    if (!github || ![301, 302, 303, 307, 308].includes(response.status)) break;
    await response.body?.cancel();
    const location = response.headers.get('location');
    if (!location || hops >= 4) throw new Error('invalid_redirect');
    const next = new URL(location, current);
    const sameRepository = next.origin === 'https://github.com' && next.pathname.startsWith(prefix);
    const assetHost = next.origin === 'https://release-assets.githubusercontent.com';
    if ((!sameRepository && !assetHost) || next.username || next.password || next.hash) throw new Error('invalid_redirect');
    current = next;
  }
  if (!response.ok || !response.body) throw new Error('download_failed');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error('download_too_large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
