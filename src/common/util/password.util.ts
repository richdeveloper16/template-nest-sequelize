import * as bcryptjs from 'bcryptjs';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export interface PasswordHashOptions {
  rounds?: number;
}

const deriveLegacyKey = promisify(scrypt);

export async function hashPassword(
  password: string,
  { rounds = 12 }: PasswordHashOptions = {},
): Promise<string> {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('La contraseña no puede superar 72 bytes UTF-8');
  }
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_ROUNDS debe ser un entero entre 10 y 15');
  }
  return bcryptjs.hash(password, rounds);
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  // Read-only compatibility: existing scrypt hashes are never written again.
  const legacy = /^scrypt\$v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (legacy) {
    const key = (await deriveLegacyKey(password, legacy[1], 64)) as Buffer;
    return timingSafeEqual(key, Buffer.from(legacy[2], 'hex'));
  }
  if (
    Buffer.byteLength(password, 'utf8') > 72 ||
    !/^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(encoded)
  )
    return false;
  return bcryptjs.compare(password, encoded);
}
