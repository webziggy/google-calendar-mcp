import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CREDENTIALS_PATH = path.resolve(process.cwd(), 'credentials.enc');
const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is required to encrypt/decrypt credentials.");
  // Derive a 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

export function saveEncryptedToken(refreshToken: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(refreshToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const payload = JSON.stringify({ iv: iv.toString('hex'), data: encrypted });
  fs.writeFileSync(CREDENTIALS_PATH, payload, { mode: 0o600 });
}

export function loadEncryptedToken(): string | null {
  if (!fs.existsSync(CREDENTIALS_PATH)) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const iv = Buffer.from(payload.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(payload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.warn("Failed to decrypt credentials.enc. Ensure your GOOGLE_CLIENT_SECRET hasn't changed.");
    return null;
  }
}
