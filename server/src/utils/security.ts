import crypto from 'node:crypto';

export function nowIso() {
  return new Date().toISOString();
}

export function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function comparePassword(password: string, hash: string) {
  return hashPassword(password) === hash;
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}
