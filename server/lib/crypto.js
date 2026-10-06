const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function computeFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function computeBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function deriveEncryptionKey(seed) {
  const material = seed || process.env.FILE_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'dev-fallback-encryption-secret-securechain';
  return crypto.createHash('sha256').update(material).digest();
}

function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return {
    ivHex: iv.toString('hex'),
    encryptedBuffer: Buffer.concat([iv, encrypted])
  };
}

function decryptBuffer(buffer, key) {
  const iv = buffer.subarray(0, 16);
  const encrypted = buffer.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function persistEncryptedFile(buffer, originalName, uploadDir) {
  const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(uploadDir, safeName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function generateShareToken(payload) {
  return crypto.createHash('sha256').update(`${payload}:${Date.now()}`).digest('hex');
}

module.exports = {
  computeFileHash,
  computeBufferHash,
  deriveEncryptionKey,
  encryptBuffer,
  decryptBuffer,
  persistEncryptedFile,
  generateShareToken
};
