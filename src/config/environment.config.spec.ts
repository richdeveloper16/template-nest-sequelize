import { validateEnvironment } from './environment.config';
import { validateMailEnvironment } from './mail.config';

describe('environment configuration', () => {
  const DATABASE_URL = 'postgresql://user:password@localhost:5432/test';
  const JWT_SECRET = 'test-only-secret-not-for-production-123456';
  const base = { DATABASE_URL, JWT_SECRET };

  it('applies defaults and converts numeric values', () => {
    expect(validateEnvironment(base)).toEqual({
      ...base,
      ...validateMailEnvironment({}),
      PORT: 3000,
      NODE_ENV: 'development',
      BCRYPT_ROUNDS: 12,
      JWT_TTL_SECONDS: 900,
    });
    expect(
      validateEnvironment({ ...base, PORT: '4000', JWT_TTL_SECONDS: '600' }),
    ).toEqual(expect.objectContaining({ PORT: 4000, JWT_TTL_SECONDS: 600 }));
  });

  it.each([
    { DATABASE_URL: undefined },
    { DATABASE_URL: 'invalid' },
    { DATABASE_URL: 'mysql://localhost/db' },
    { PORT: 'abc' },
    { PORT: 0 },
    { NODE_ENV: 'invalid' },
    { BCRYPT_ROUNDS: 9 },
    { BCRYPT_ROUNDS: 16 },
    { BCRYPT_ROUNDS: 'invalid' },
    { JWT_SECRET: undefined },
    { JWT_SECRET: 'short' },
    { JWT_SECRET: ' '.repeat(40) },
    { JWT_TTL_SECONDS: 59 },
    { JWT_TTL_SECONDS: 86401 },
    { JWT_TTL_SECONDS: 'abc' },
  ])('rejects invalid configuration %j', (invalid) => {
    expect(() => validateEnvironment({ ...base, ...invalid })).toThrow();
  });
});
