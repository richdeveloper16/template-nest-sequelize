import { Injectable, NotFoundException } from '@nestjs/common';
import { Op, type WhereOptions } from 'sequelize';
import type { PaginatedResult } from '../../../common/interfaces/pagination/paginated-result.interface';
import type { IUserRepository } from '../interfaces/user-repository.interface';
import { DatabaseService } from '../../../database/database.service';
import type { UsersAttributes } from '../../../database/models/users.model';
import type { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserFilterDto } from '../dto/user-filter.dto';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly database: DatabaseService) {}

  async save(data: CreateUserDto): Promise<UsersAttributes> {
    const user = await this.database.models.users.create({
      fk_person: data.fk_person,
      fk_user_type: data.fk_user_type,
      username: data.username,
      password: data.password,
      status: true,
    });
    return user.get({ plain: true });
  }

  async update(id: number, data: UpdateUserDto): Promise<UsersAttributes> {
    const values: Partial<UsersAttributes> = { update_date: new Date() };
    if (data.fk_person !== undefined) values.fk_person = data.fk_person;
    if (data.fk_user_type !== undefined)
      values.fk_user_type = data.fk_user_type;
    if (data.username !== undefined) values.username = data.username;

    if (data.status !== undefined) values.status = data.status;

    const [count, users] = await this.database.models.users.update(values, {
      where: { user_id: id },
      returning: true,
    });
    if (count === 0) throw new NotFoundException('Usuario no encontrado');
    return users[0].get({ plain: true });
  }

  async findAllPaginated(
    filters: UserFilterDto,
  ): Promise<PaginatedResult<UsersAttributes>> {
    const {
      page = 1,
      limit = 10,
      user_id,
      fk_user_type,
      username,
      status,
    } = filters;
    const where: WhereOptions<UsersAttributes> = {
      ...(user_id !== undefined && { user_id }),
      ...(fk_user_type !== undefined && { fk_user_type }),
      ...(username !== undefined && {
        username: { [Op.iLike]: `%${username}%` },
      }),
      ...(status !== undefined && { status }),
    };
    const { rows: items, count: totalItems } =
      await this.database.models.users.findAndCountAll({
        where,
        offset: (page - 1) * limit,
        limit,
        order: [['user_id', 'ASC']],
        raw: true,
      });
    const totalPages = Math.ceil(totalItems / limit);
    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
  async findAll(): Promise<UsersAttributes[]> {
    return this.database.models.users.findAll({
      order: [['user_id', 'ASC']],
      raw: true,
    });
  }
  async findById(id: number): Promise<UsersAttributes | null> {
    return this.database.models.users.findByPk(id, { raw: true });
  }
  async remove(id: number): Promise<UsersAttributes> {
    return this.database.sequelize.transaction(async (transaction) => {
      const user = await this.database.models.users.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      const attributes = user.get({ plain: true });
      await user.destroy({ transaction });
      return attributes;
    });
  }
}
