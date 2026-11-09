import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../../config/app.config';
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { hashPassword } from '../../common/util/password.util';
import type { UsersAttributes } from '../../database/models/users.model';
import { UserService } from '../user/user.service';
import { UserMapper } from '../user/mapper/user.mapper';
import { AuthModule } from './auth.module';
import { AuthRepository } from './repository/auth.repository';

interface LoginBody {
  data: { access_token: string; expires_in: number; user: { user_id: number } };
}

describe('Auth HTTP and global JWT guard (simulated persistence)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let token: string;
  let account: UsersAttributes;
  const users = { findById: jest.fn() };
  const repository = {
    attemptLogin: jest.fn<
      ReturnType<AuthRepository['attemptLogin']>,
      Parameters<AuthRepository['attemptLogin']>
    >(),
  };
  const config = {
    JWT_SECRET: 'test-only-secret-not-for-production-123456',
    JWT_TTL_SECONDS: 900,
    BCRYPT_ROUNDS: 10,
  };

  beforeAll(async () => {
    account = {
      user_id: 1,
      fk_person: 1,
      fk_user_type: null,
      username: 'ana',
      password: await hashPassword('a secure password', { rounds: 10 }),
      status: true,
      failed_attempts: 0,
      locked_until: null,
      last_login: null,
      registration_date: new Date(),
      update_date: null,
    };
    repository.attemptLogin.mockImplementation(async (username, decide) => {
      const user = username === account.username ? account : null;
      const decision = await decide(user);
      if (user && decision.updates) Object.assign(user, decision.updates);
      return decision.authenticated ? user : null;
    });
    users.findById.mockImplementation(() =>
      Promise.resolve(UserMapper.toResponse(account)),
    );
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [() => config],
        }),
        DatabaseModule,
        AuthModule,
      ],
      providers: [
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      ],
    })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(AuthRepository)
      .useValue(repository)
      .overrideProvider(UserService)
      .useValue(users)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    app.useLogger(false);
    await app.init();
    jwt = app.get(JwtService);
  });

  it('allows public login and wraps the token response', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'ana', password: 'a secure password' })
      .expect(200);
    const body = response.body as LoginBody;
    token = body.data.access_token;
    expect(body.data.expires_in).toBe(900);
    expect(body.data.user.user_id).toBe(1);
    expect(body.data.user).not.toHaveProperty('password');
  });

  it('validates login input before querying credentials', async () => {
    const before = repository.attemptLogin.mock.calls.length;
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: '', password: '' })
      .expect(400);
    expect(repository.attemptLogin).toHaveBeenCalledTimes(before);
  });

  it('protects both auth/me and existing user routes by default', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/user/1').expect(401);
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect((response.body as { data: { user_id: number } }).data.user_id).toBe(
      1,
    );
  });

  it('rejects malformed, expired, wrongly signed and invalid-subject tokens', async () => {
    for (const invalid of [
      'invalid',
      await jwt.signAsync({ sub: '1' }, { expiresIn: -1 }),
      await jwt.signAsync(
        { sub: '1' },
        { secret: 'a different secret for tests only 123456' },
      ),
      await jwt.signAsync({ sub: '1' }, { audience: 'wrong-audience' }),
      await jwt.signAsync({ sub: '1' }, { issuer: 'wrong-issuer' }),
      await jwt.signAsync({ sub: '0' }),
      await jwt.signAsync({ sub: 1 }),
    ]) {
      await request(app.getHttpServer())
        .get('/auth/me')
        .auth(invalid, { type: 'bearer' })
        .expect(401);
    }
  });

  it('rejects a previously issued token once the account is disabled', async () => {
    account.status = false;
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(401);
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
