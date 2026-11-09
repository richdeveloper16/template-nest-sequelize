import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { scryptSync } from 'node:crypto';
import { hashPassword, verifyPassword } from '../../common/util/password.util';
import type { UsersAttributes } from '../../database/models/users.model';
import { UserMapper } from '../user/mapper/user.mapper';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { AuthRepository } from './repository/auth.repository';

const secret = 'test-only-secret-not-for-production-123456';
const password = 'a secure password';

describe('AuthService', () => {
  let hash: string;
  let account: UsersAttributes | null;
  const repository = {
    attemptLogin: jest.fn<
      ReturnType<AuthRepository['attemptLogin']>,
      Parameters<AuthRepository['attemptLogin']>
    >(),
  };
  const users = {
    findById: jest.fn<
      ReturnType<UserService['findById']>,
      Parameters<UserService['findById']>
    >(),
  };
  const jwt = new JwtService({ secret, signOptions: { expiresIn: 900 } });
  const service = new AuthService(
    repository as unknown as AuthRepository,
    users as unknown as UserService,
    jwt,
    new ConfigService({
      BCRYPT_ROUNDS: 10,
      JWT_TTL_SECONDS: 900,
    }),
  );

  beforeAll(async () => {
    hash = await hashPassword(password, { rounds: 10 });
    await service.onModuleInit();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    account = {
      user_id: 1,
      fk_person: 1,
      fk_user_type: null,
      username: 'ana',
      password: hash,
      last_login: null,
      failed_attempts: 0,
      locked_until: null,
      status: true,
      registration_date: new Date('2026-01-01T00:00:00Z'),
      update_date: null,
    };
    repository.attemptLogin.mockImplementation(async (_username, decide) => {
      const decision = await decide(account);
      if (account && decision.updates) Object.assign(account, decision.updates);
      return decision.authenticated ? account : null;
    });
    users.findById.mockResolvedValue(UserMapper.toResponse(account));
  });

  it('issues an expiring token with only identity claims and a safe profile', async () => {
    account!.failed_attempts = 2;
    const result = await service.login({ username: 'ana', password });
    const payload = await jwt.verifyAsync<{
      sub: string;
      exp: number;
      iat: number;
    }>(result.access_token);
    expect(payload.sub).toBe('1');
    expect(payload.exp - payload.iat).toBe(900);
    expect(payload).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('password');
    expect(account!.failed_attempts).toBe(0);
    expect(account!.last_login).toBeInstanceOf(Date);
  });

  it('persists failures and locks the account after five wrong passwords', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        service.login({ username: 'ana', password: 'wrong' }),
      ).rejects.toThrow('Credenciales inválidas');
    }
    expect(account!.failed_attempts).toBe(5);
    expect(account!.locked_until!.getTime()).toBeGreaterThan(Date.now());
    await expect(
      service.login({ username: 'ana', password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(account!.failed_attempts).toBe(5);
  });

  it('allows login after a lock expires and clears the lock', async () => {
    account!.failed_attempts = 5;
    account!.locked_until = new Date(Date.now() - 1000);
    await service.login({ username: 'ana', password });
    expect(account!.failed_attempts).toBe(0);
    expect(account!.locked_until).toBeNull();
  });

  it('starts a new attempt window after an expired lock', async () => {
    account!.failed_attempts = 5;
    account!.locked_until = new Date(Date.now() - 1000);
    await expect(
      service.login({ username: 'ana', password: 'wrong' }),
    ).rejects.toThrow('Credenciales inválidas');
    expect(account!.failed_attempts).toBe(1);
    expect(account!.locked_until).toBeNull();
  });

  it('returns the same error for unknown and inactive accounts', async () => {
    account!.status = false;
    await expect(service.login({ username: 'ana', password })).rejects.toThrow(
      'Credenciales inválidas',
    );
    account = null;
    await expect(
      service.login({ username: 'unknown', password }),
    ).rejects.toThrow('Credenciales inválidas');
  });

  it('upgrades legacy scrypt only after a successful login', async () => {
    const salt = '1234567890abcdef1234567890abcdef';
    const legacy = `scrypt$v1$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
    account!.password = legacy;
    await expect(
      service.login({ username: 'ana', password: 'wrong' }),
    ).rejects.toThrow();
    expect(account!.password).toBe(legacy);
    await service.login({ username: 'ana', password });
    expect(account!.password).toMatch(/^\$2[ab]\$/);
    await expect(verifyPassword(password, account!.password)).resolves.toBe(
      true,
    );
  });

  it('rejects removed and disabled users when resolving token identity', async () => {
    users.findById.mockRejectedValueOnce(new NotFoundException());
    await expect(service.currentUser(1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    users.findById.mockResolvedValueOnce({
      ...UserMapper.toResponse(account!),
      status: false,
    });
    await expect(service.currentUser(1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not disguise database failures as invalid credentials', async () => {
    users.findById.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.currentUser(1)).rejects.toThrow(
      'database unavailable',
    );
  });
});
