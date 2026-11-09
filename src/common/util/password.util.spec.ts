import { scryptSync } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.util';

describe('password hashing with bcryptjs', () => {
  it('uses random salts and verifies only the correct password', async () => {
    const password = 'a secure password';
    const first = await hashPassword(password, { rounds: 10 });
    const second = await hashPassword(password, { rounds: 10 });
    expect(first).not.toBe(second);
    expect(first).toMatch(/^\$2[ab]\$10\$/);
    expect(first).toHaveLength(60);
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', first)).resolves.toBe(false);
    await expect(verifyPassword(password, 'plaintext')).resolves.toBe(false);
  });

  it('accepts 72 bytes and rejects longer ASCII and multibyte passwords', async () => {
    const password = 'é'.repeat(36);
    const hash = await hashPassword(password, { rounds: 10 });
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(hashPassword('a'.repeat(73))).rejects.toThrow('72 bytes');
    await expect(hashPassword('é'.repeat(37))).rejects.toThrow('72 bytes');
    await expect(verifyPassword(password + 'x', hash)).resolves.toBe(false);
  });

  it.each([9, 16, 10.5, NaN])('rejects invalid cost %s', async (rounds) => {
    await expect(hashPassword('a secure password', { rounds })).rejects.toThrow(
      'BCRYPT_ROUNDS',
    );
  });

  it('preserves verification of legacy scrypt hashes until login migrates them', async () => {
    const password = 'a'.repeat(100);
    const salt = '1234567890abcdef1234567890abcdef';
    const key = scryptSync(password, salt, 64).toString('hex');
    const encoded = `scrypt$v1$${salt}$${key}`;
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', encoded)).resolves.toBe(
      false,
    );
    await expect(verifyPassword(password, 'scrypt$v1$invalid')).resolves.toBe(
      false,
    );
  });
});
