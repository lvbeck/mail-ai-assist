import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
const aad = Buffer.from('local.mail_ai_assist/credentials/v1');

export function encryptCredential(text, key) {
  if (key.length !== 32 || typeof text !== 'string' || Buffer.byteLength(text) > 1048576) throw new Error('invalid_credential');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') });
}
export function decryptCredential(text, key) {
  if (key.length !== 32 || typeof text !== 'string' || text.length > 1500000) throw new Error('invalid_credential');
  const value = JSON.parse(text);
  if (value.version !== 1 || !['iv', 'tag', 'data'].every(name => typeof value[name] === 'string')) throw new Error('invalid_credential');
  const iv = Buffer.from(value.iv, 'base64'), tag = Buffer.from(value.tag, 'base64');
  if (iv.length !== 12 || tag.length !== 16) throw new Error('invalid_credential');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(aad); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8');
}
