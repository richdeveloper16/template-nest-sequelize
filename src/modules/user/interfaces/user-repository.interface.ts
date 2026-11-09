import type { IBaseRepository } from '../../../common/interfaces/repository/base-repository.interface';
import type { PaginatedResult } from '../../../common/interfaces/pagination/paginated-result.interface';
import type { UsersAttributes } from '../../../database/models/users.model';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserFilterDto } from '../dto/user-filter.dto';

export interface IUserRepository extends IBaseRepository<
  UsersAttributes,
  CreateUserDto,
  UpdateUserDto
> {
  findAllPaginated(
    filters: UserFilterDto,
  ): Promise<PaginatedResult<UsersAttributes>>;
}
