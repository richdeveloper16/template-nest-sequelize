import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsByteLength,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @IsInt()
  @Min(1)
  fk_person!: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  fk_user_type?: number | null;

  @ApiProperty({ minLength: 2, maxLength: 50 })
  @IsString()
  @Length(2, 50)
  username!: string;

  @ApiProperty({
    minLength: 12,
    maxLength: 72,
    writeOnly: true,
    description: 'Entre 12 caracteres y 72 bytes UTF-8.',
  })
  @IsString()
  @Length(8, 72)
  @IsByteLength(0, 72)
  password!: string;
}
