import type { UsersAttributes } from '../../../database/models/users.model';
import { UserResponseDto } from '../dto/user-response.dto';

export type UserEntity = UsersAttributes;

export class UserMapper {
  static toResponse<TEntity extends UserEntity>(
    entity: TEntity,
  ): UserResponseDto {
    return {
      user_id: entity.user_id,
      fk_person: entity.fk_person,
      fk_user_type: entity.fk_user_type,
      username: entity.username,
      status: entity.status,
      registration_date: entity.registration_date.toISOString(),
    };
  }

  static toResponseList<TEntity extends UserEntity>(
    entities: readonly TEntity[],
  ): UserResponseDto[] {
    return entities.map((entity) => UserMapper.toResponse(entity));
  }
}
