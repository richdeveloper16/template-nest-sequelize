import { ApiProperty } from '@nestjs/swagger';

/** Campos comunes del contrato HTTP; el decorador define el tipo de data. */
export class ApiResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ example: 200 })
  code!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({
    type: String,
    example: '2026-10-09T20:54:35.000Z',
    description: 'Fecha y hora UTC en formato ISO 8601.',
  })
  timestamp!: string;

  @ApiProperty({ example: '/user' })
  path!: string;
}
