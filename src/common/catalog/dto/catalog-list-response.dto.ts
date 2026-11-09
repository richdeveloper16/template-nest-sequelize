import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../dto/pagination/pagination-meta.dto';
import { CatalogResponseDto } from './catalog-response.dto';

export class CatalogListResponseDto {
  @ApiProperty({ type: [CatalogResponseDto] })
  items!: CatalogResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
