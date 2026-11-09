import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/app.config';
import { DatabaseService } from '../src/database/database.service';
import { UserService } from '../src/modules/user/user.service';
import { verifyPassword } from '../src/common/util/password.util';

interface UserPayload {
  user_id: number;
  username: string;
  status: boolean;
}
interface ResponseBody<T> {
  success: boolean;
  code: number;
  data: T;
  timestamp: string;
}

describe('API integration (dedicated test database)', () => {
  let app: INestApplication<App>;
  let database: DatabaseService;
  let createdId: number | undefined;
  let seedId: number | undefined;
  let token: string;
  const suffix = `${process.pid}_${Date.now()}`;
  const username = `e2e_${suffix}`;
  const seedUsername = `seed_${suffix}`;
  const fkPerson = Math.floor(Math.random() * 1_000_000_000) + 1;
  const password = 'integration test password';

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test')
      throw new Error('NODE_ENV=test es obligatorio');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    database = app.get(DatabaseService);
    await app.init();
    const seed = await app
      .get(UserService)
      .save({ fk_person: fkPerson, username: seedUsername, password });
    seedId = seed.user_id;
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: seedUsername, password })
      .expect(200);
    token = (login.body as ResponseBody<{ access_token: string }>).data
      .access_token;
  });

  it('returns the public response envelope', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);
    const body = response.body as ResponseBody<string>;
    expect(body.data).toBe('Api NestJS!');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('protects user routes and resolves the current profile', async () => {
    await request(app.getHttpServer()).get('/user').expect(401);
    const profile = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect((profile.body as ResponseBody<UserPayload>).data.user_id).toBe(
      seedId,
    );
  });

  it('creates, filters, updates and reads a user without exposing credentials', async () => {
    const created = await request(app.getHttpServer())
      .post('/user')
      .auth(token, { type: 'bearer' })
      .send({
        fk_person: fkPerson + 1,
        username,
        password,
        failed_attempts: 99,
      })
      .expect(201);
    const body = created.body as ResponseBody<UserPayload>;
    createdId = body.data.user_id;
    expect(body.data).not.toHaveProperty('password');
    const persisted = await database.models.users.findByPk(createdId, {
      raw: true,
    });
    expect(persisted?.failed_attempts).toBe(0);
    await expect(verifyPassword(password, persisted!.password)).resolves.toBe(
      true,
    );
    const list = await request(app.getHttpServer())
      .get('/user/paginated')
      .auth(token, { type: 'bearer' })
      .query({ username, page: 1, limit: 5 })
      .expect(200);
    const page = list.body as ResponseBody<{
      items: UserPayload[];
      meta: { totalItems: number };
    }>;
    expect(page.data.items).toHaveLength(1);
    expect(page.data.items[0].user_id).toBe(createdId);
    expect(page.data.meta.totalItems).toBe(1);
    const updated = await request(app.getHttpServer())
      .patch(`/user/${createdId}`)
      .auth(token, { type: 'bearer' })
      .send({ status: false, fk_user_type: null })
      .expect(200);
    expect((updated.body as ResponseBody<UserPayload>).data.status).toBe(false);
    await request(app.getHttpServer())
      .get(`/user/${createdId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/user')
      .auth(token, { type: 'bearer' })
      .send({ fk_person: fkPerson + 1, username, password })
      .expect(409);
  });

  it('rejects invalid inputs with the shared timestamp format', async () => {
    const response = await request(app.getHttpServer())
      .post('/user')
      .auth(token, { type: 'bearer' })
      .send({ fk_person: -1, username: 'a', password: 'short' })
      .expect(400);
    const body = response.body as ResponseBody<null>;
    expect(body.success).toBe(false);
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    await request(app.getHttpServer())
      .get('/user/paginated?limit=101')
      .auth(token, { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/user/not-an-id')
      .auth(token, { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/user/2147483647')
      .auth(token, { type: 'bearer' })
      .expect(404);
  });

  it('persists failed logins and blocks a correct password until the lock expires', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: seedUsername, password: 'wrong' })
        .expect(401);
    }
    const persisted = await database.models.users.findByPk(seedId, {
      raw: true,
    });
    expect(persisted?.failed_attempts).toBe(5);
    expect(persisted!.locked_until!.getTime()).toBeGreaterThan(Date.now());
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: seedUsername, password })
      .expect(401);
  }, 15000);

  afterAll(async () => {
    try {
      for (const id of [createdId, seedId]) {
        if (id !== undefined)
          await database.models.users.destroy({ where: { user_id: id } });
      }
    } finally {
      if (app) await app.close();
    }
  });
});
