import { ApiProperty } from '@nestjs/swagger';

export class CatalogResponseDto {
  @ApiProperty({
    example: 1,

    description: 'Identificador único del elemento del catálogo',
  })
  id!: number;

  @ApiProperty({
    example: 'ADMIN',
    description: 'Código único y estable del elemento',
  })
  code!: string;

  @ApiProperty({
    example: 'Administrador',
    description: 'Descripción visible del elemento',
  })
  description!: string;

  @ApiProperty({
    example: 1,
    description: 'Orden de visualización del elemento',
  })
  sortOrder!: number;

  @ApiProperty({
    example: true,
    description: 'Indica si el elemento está activo',
  })
  status!: boolean;

  @ApiProperty({
    example: '2026-07-27T15:30:00.000Z',
    description: 'Fecha de registro',
    type: String,
    format: 'date-time',
  })
  registrationDate!: Date;

  @ApiProperty({
    example: '2026-07-27T18:45:00.000Z',
    description: 'Fecha de la última actualización',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  updateDate!: Date | null;
}
