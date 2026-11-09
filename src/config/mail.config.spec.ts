import { validateMailEnvironment } from './mail.config';

describe('SMTP configuration', () => {
  const base = {
    MAIL_ENABLED: 'true',
    SMTP_HOST: 'smtp.example.com',
    MAIL_FROM: 'no-reply@example.com',
  };
  it('is disabled by default without requiring credentials', () => {
    expect(validateMailEnvironment({}).MAIL_ENABLED).toBe(false);
  });
  it('parses booleans and selects TLS defaults for ports 587 and 465', () => {
    expect(validateMailEnvironment(base)).toEqual(
      expect.objectContaining({
        MAIL_ENABLED: true,
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        SMTP_REQUIRE_TLS: true,
      }),
    );
    expect(validateMailEnvironment({ ...base, SMTP_PORT: '465' })).toEqual(
      expect.objectContaining({ SMTP_PORT: 465, SMTP_SECURE: true }),
    );
  });
  it('allows unauthenticated relays and preserves password whitespace', () => {
    expect(validateMailEnvironment(base).SMTP_USER).toBe('');
    expect(
      validateMailEnvironment({
        ...base,
        SMTP_USER: 'user',
        SMTP_PASSWORD: ' secret ',
      }).SMTP_PASSWORD,
    ).toBe(' secret ');
  });
  it.each([
    { MAIL_ENABLED: 'yes' },
    { SMTP_PORT: 'invalid' },
    { SMTP_PORT: 0 },
    { SMTP_SECURE: 'yes' },
    { SMTP_REQUIRE_TLS: 'yes' },
    { SMTP_HOST: '' },
    { MAIL_FROM: 'not-an-email' },
    { SMTP_USER: 'user' },
    { SMTP_PASSWORD: 'secret' },
    { MAIL_FROM_NAME: 'Name\r\nInjected: header' },
    { SMTP_PORT: 465, SMTP_SECURE: false },
  ])('rejects invalid configuration without echoing secrets %j', (invalid) => {
    expect(() => validateMailEnvironment({ ...base, ...invalid })).toThrow();
  });
});
