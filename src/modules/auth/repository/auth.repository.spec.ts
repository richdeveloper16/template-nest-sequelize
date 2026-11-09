import { AuthRepository } from './auth.repository';
import type { DatabaseService } from '../../../database/database.service';
import type { UsersAttributes } from '../../../database/models/users.model';

describe('AuthRepository transaction', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const attributes = {
    user_id: 1,
    username: 'ana',
    failed_attempts: 0,
  } as UsersAttributes;
  const model = { get: () => attributes, update: jest.fn() };
  const findOne = jest.fn();
  const commit = jest.fn();
  const rollback = jest.fn();
  const repository = new AuthRepository({
    models: { users: { findOne } },
    sequelize: {
      transaction: async (
        operation: (tx: typeof transaction) => Promise<unknown>,
      ) => {
        try {
          const result = await operation(transaction);
          commit();
          return result;
        } catch (error) {
          rollback();
          throw error;
        }
      },
    },
  } as unknown as DatabaseService);
  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockResolvedValue(model);
  });

  it('commits failed attempts under a row lock even when authentication is denied', async () => {
    await expect(
      repository.attemptLogin('ana', () =>
        Promise.resolve({
          authenticated: false,
          updates: { failed_attempts: 1 },
        }),
      ),
    ).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      where: { username: 'ana' },
      transaction,
      lock: 'UPDATE',
    });
    expect(model.update).toHaveBeenCalledWith(
      { failed_attempts: 1 },
      { transaction },
    );
    expect(commit).toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
  });
  it('does not create records for unknown users', async () => {
    findOne.mockResolvedValue(null);
    await expect(
      repository.attemptLogin('unknown', () =>
        Promise.resolve({
          authenticated: false,
        }),
      ),
    ).resolves.toBeNull();
    expect(model.update).not.toHaveBeenCalled();
  });
  it('propagates update failures and rolls back', async () => {
    model.update.mockRejectedValueOnce(new Error('update failed'));
    await expect(
      repository.attemptLogin('ana', () =>
        Promise.resolve({
          authenticated: true,
          updates: { last_login: new Date() },
        }),
      ),
    ).rejects.toThrow('update failed');
    expect(rollback).toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });
});
