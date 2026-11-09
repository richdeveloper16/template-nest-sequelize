import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({ type: Boolean, description: 'Usuario activo.' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  status?: boolean;
}
