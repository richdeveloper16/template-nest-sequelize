import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCatalogDto {
  @ApiProperty({
    example: 'GK',
    description: 'Código único y estable del elemento',
    maxLength: 30,
  })
  @IsString()
  @MaxLength(30)
  code!: string;

  @ApiProperty({
    example: 'Portero',
    description: 'Descripción visible del elemento',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  description!: string;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    minimum: 0,
    description: 'Orden de visualización del elemento',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Indica si el elemento está activo',
  })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
