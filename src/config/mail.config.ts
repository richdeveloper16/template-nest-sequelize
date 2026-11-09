import { isEmail } from 'class-validator';

/** SMTP is optional: an unconfigured template must start without a mail server. */
export function validateMailEnvironment(config: Record<string, unknown>) {
  const booleanValue = (key: string, fallback: boolean): boolean => {
    const value = config[key];
    if (value === undefined || value === '') return fallback;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw new Error(`${key} debe ser true o false`);
  };
  const enabled = booleanValue('MAIL_ENABLED', false);
  const rawPort = config.SMTP_PORT ?? 587;
  const port = Number(rawPort);
  if (
    !['string', 'number'].includes(typeof rawPort) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('SMTP_PORT debe ser un entero entre 1 y 65535');
  }
  const secure = booleanValue('SMTP_SECURE', port === 465);
  const requireTls = booleanValue('SMTP_REQUIRE_TLS', !secure);
  const stringValue = (key: string): string => {
    const value = config[key] ?? '';
    if (typeof value !== 'string') throw new Error(`${key} debe ser texto`);
    return value;
  };
  const host = stringValue('SMTP_HOST').trim();
  const user = stringValue('SMTP_USER').trim();
  const password = stringValue('SMTP_PASSWORD');
  const from = stringValue('MAIL_FROM').trim();
  const fromName = stringValue('MAIL_FROM_NAME').trim();
  if (enabled && (!host || !isEmail(from) || /[\r\n]/.test(fromName))) {
    throw new Error(
      'Configura SMTP_HOST y MAIL_FROM válidos para habilitar correo',
    );
  }
  if (enabled && Boolean(user) !== Boolean(password)) {
    throw new Error('SMTP_USER y SMTP_PASSWORD deben configurarse juntos');
  }
  if (enabled && port === 465 && !secure) {
    throw new Error('SMTP_SECURE debe ser true para el puerto 465');
  }
  return {
    MAIL_ENABLED: enabled,
    SMTP_HOST: host,
    SMTP_PORT: port,
    SMTP_SECURE: secure,
    SMTP_REQUIRE_TLS: requireTls,
    SMTP_USER: user,
    SMTP_PASSWORD: password,
    MAIL_FROM: from,
    MAIL_FROM_NAME: fromName,
  };
}
