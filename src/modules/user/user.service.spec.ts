import type { CreateUserDto } from './dto/create-user.dto';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from './repository/user.repository';
import { UserService } from './user.service';
import { verifyPassword } from '../../common/util/password.util';
import type { UsersAttributes } from '../../database/models/users.model';

export const userFixture: UsersAttributes = {
  user_id: 1,
  fk_person: 1,
  fk_user_type: null,
  username: 'ana',
  password: 'internal hash',
  last_login: null,
  failed_attempts: 0,
  locked_until: null,
  status: true,
  registration_date: new Date('2026-01-01T00:00:00.000Z'),
  update_date: null,
};

describe('UserService', () => {
  const repository = {
    save: jest.fn<Promise<UsersAttributes>, [CreateUserDto]>(),
    update: jest.fn(),
    findById: jest.fn(),
    findAllPaginated: jest.fn(),
  };
  const service = new UserService(
    repository as unknown as UserRepository,
    new ConfigService({ BCRYPT_ROUNDS: 10 }),
  );
  beforeEach(() => jest.resetAllMocks());

  it('hashes the password before persistence and excludes internal fields from responses', async () => {
    repository.save.mockResolvedValue(userFixture);
    const dto = {
      fk_person: 1,
      username: 'ana',
      password: 'a secure password',
    };
    const result = await service.save(dto);
    const saved = repository.save.mock.calls[0][0] as { password: string };
    await expect(verifyPassword(dto.password, saved.password)).resolves.toBe(
      true,
    );
    expect(dto.password).toBe('a secure password');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('failed_attempts');
    expect(result.registration_date).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns 404 when the user does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findById(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps paginated items and preserves metadata', async () => {
    const meta = {
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    repository.findAllPaginated.mockResolvedValue({
      items: [userFixture],
      meta,
    });
    const result = await service.findAllPaginated({ page: 1, limit: 10 });
    expect(result.meta).toEqual(meta);
    expect(result.items[0]).not.toHaveProperty('password');
  });
});
