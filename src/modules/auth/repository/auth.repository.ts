import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type {
  IAuthRepository,
  DecideLogin,
} from '../interfaces/auth-repository.interface';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async attemptLogin(username: string, decide: DecideLogin) {
    return this.database.sequelize.transaction(async (transaction) => {
      const model = await this.database.models.users.findOne({
        where: { username },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const account = model ? model.get({ plain: true }) : null;
      const decision = await decide(account);
      if (!model || !account) return null;
      if (decision.updates) {
        await model.update(decision.updates, { transaction });
      }
      return decision.authenticated
        ? { ...account, ...decision.updates }
        : null;
    });
  }
}
