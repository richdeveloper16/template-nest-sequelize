import { validateMailEnvironment } from './mail.config';

/** Valida la configuración al arrancar sin incluir secretos en los errores. */
export function validateEnvironment(config: Record<string, unknown>) {
  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL es obligatoria');
  }

  try {
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
      throw new Error('invalid URL');
    }
  } catch {
    throw new Error('DATABASE_URL debe ser una URL válida de PostgreSQL');
  }

  const rawPort = config.PORT ?? 3000;
  const port = Number(rawPort);
  if (
    !['string', 'number'].includes(typeof rawPort) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('PORT debe ser un entero entre 1 y 65535');
  }

  const nodeEnv = config.NODE_ENV ?? 'development';
  if (
    typeof nodeEnv !== 'string' ||
    !['development', 'test', 'production'].includes(nodeEnv)
  ) {
    throw new Error('NODE_ENV debe ser development, test o production');
  }

  const rawRounds = config.BCRYPT_ROUNDS ?? 12;
  const bcryptRounds = Number(rawRounds);
  if (
    !['string', 'number'].includes(typeof rawRounds) ||
    !Number.isInteger(bcryptRounds) ||
    bcryptRounds < 10 ||
    bcryptRounds > 15
  ) {
    throw new Error('BCRYPT_ROUNDS debe ser un entero entre 10 y 15');
  }

  const jwtSecret = config.JWT_SECRET;
  if (
    typeof jwtSecret !== 'string' ||
    Buffer.byteLength(jwtSecret.trim(), 'utf8') < 32
  ) {
    throw new Error(
      'JWT_SECRET debe contener al menos 32 bytes y ser un secreto aleatorio',
    );
  }
  const rawJwtTtl = config.JWT_TTL_SECONDS ?? 900;
  const jwtTtl = Number(rawJwtTtl);
  if (
    !['string', 'number'].includes(typeof rawJwtTtl) ||
    !Number.isInteger(jwtTtl) ||
    jwtTtl < 60 ||
    jwtTtl > 86400
  ) {
    throw new Error('JWT_TTL_SECONDS debe ser un entero entre 60 y 86400');
  }

  return {
    ...config,
    ...validateMailEnvironment(config),
    DATABASE_URL: databaseUrl,
    PORT: port,
    NODE_ENV: nodeEnv,
    BCRYPT_ROUNDS: bcryptRounds,
    JWT_SECRET: jwtSecret,
    JWT_TTL_SECONDS: jwtTtl,
  };
}
