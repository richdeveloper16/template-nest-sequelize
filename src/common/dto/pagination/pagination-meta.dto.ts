import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../interfaces/pagination/paginated-result.interface';

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ example: 1, minimum: 1 })
  page!: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 100 })
  limit!: number;

  @ApiProperty({ example: 15, minimum: 0 })
  totalItems!: number;

  @ApiProperty({ example: 2, minimum: 0 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}
