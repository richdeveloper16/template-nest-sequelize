import { NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import type { DatabaseService } from '../../../database/database.service';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  const model = {
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
  };
  const repository = new UserRepository({
    models: { users: model },
  } as unknown as DatabaseService);
  beforeEach(() => jest.resetAllMocks());

  it('creates a user using only public creation fields', async () => {
    const dto = {
      fk_person: 1,
      fk_user_type: 2,
      username: 'ana',
      password: 'test',
    };
    model.create.mockResolvedValue({ get: () => ({ user_id: 1 }) });
    await expect(repository.save(dto)).resolves.toEqual({ user_id: 1 });
    expect(model.create).toHaveBeenCalledWith({
      ...dto,
      status: true,
    });
  });

  it('updates user fields using user_id and preserves false and nullable user type', async () => {
    model.update.mockResolvedValue([1, [{ get: () => ({ user_id: 1 }) }]]);
    await expect(
      repository.update(1, {
        username: 'new',
        status: false,
        fk_user_type: null,
      }),
    ).resolves.toEqual({ user_id: 1 });
    expect(model.update).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'new',
        status: false,
        fk_user_type: null,
      }),
      { where: { user_id: 1 }, returning: true },
    );
  });

  it('returns 404 when an update finds no user', async () => {
    model.update.mockResolvedValue([0, []]);
    await expect(
      repository.update(999, { status: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('paginates using the filters declared for users', async () => {
    model.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    await expect(
      repository.findAllPaginated({
        page: 2,
        limit: 5,
        user_id: 1,
        fk_user_type: 2,
        username: 'ana',
        status: false,
        fk_user_type: null,
      }),
    ).resolves.toEqual({
      items: [],
      meta: {
        page: 2,
        limit: 5,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });
    expect(model.findAndCountAll).toHaveBeenCalledWith({
      where: {
        user_id: 1,
        fk_user_type: 2,
        username: { [Op.iLike]: '%ana%' },
        status: false,
        fk_user_type: null,
      },
      offset: 5,
      limit: 5,
      order: [['user_id', 'ASC']],
      raw: true,
    });
  });

  it('lists users and looks up a user by primary key', async () => {
    model.findAll.mockResolvedValue([]);
    model.findByPk.mockResolvedValue(null);
    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.findById(999)).resolves.toBeNull();
    expect(model.findAll).toHaveBeenCalledWith({
      order: [['user_id', 'ASC']],
      raw: true,
    });
    expect(model.findByPk).toHaveBeenCalledWith(999, { raw: true });
  });
});
