import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaginatedResult } from '../../common/interfaces/pagination/paginated-result.interface';
import { hashPassword } from '../../common/util/password.util';
import { UserRepository } from './repository/user.repository';
import { UserResponseDto } from './dto/user-response.dto';
import { UserMapper } from './mapper/user.mapper';
import { UserFilterDto } from './dto/user-filter.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly config: ConfigService,
  ) {}

  async save(dto: CreateUserDto): Promise<UserResponseDto> {
    const entity = await this.userRepository.save({
      ...dto,
      password: await hashPassword(dto.password, {
        rounds: this.config.getOrThrow<number>('BCRYPT_ROUNDS'),
      }),
    });
    return UserMapper.toResponse(entity);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const entity = await this.userRepository.update(id, dto);
    return UserMapper.toResponse(entity);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const entities = await this.userRepository.findAll();
    return UserMapper.toResponseList(entities);
  }

  async findAllPaginated(
    filters: UserFilterDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.userRepository.findAllPaginated(filters);
    return { ...result, items: UserMapper.toResponseList(result.items) };
  }

  async findById(id: number): Promise<UserResponseDto> {
    const entity = await this.userRepository.findById(id);
    if (!entity) throw new NotFoundException('Usuario no encontrado');
    return UserMapper.toResponse(entity);
  }
}
