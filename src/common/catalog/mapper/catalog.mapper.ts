import type { CatalogResponseDto } from '../dto/catalog-response.dto';

export interface CatalogEntity {
  element_id: number;
  code: string;
  description: string;
  sort_order: number;
  status: boolean;
  registration_date: Date;
  update_date: Date | null;
}

export class CatalogMapper {
  static toResponse<TEntity extends CatalogEntity>(
    entity: TEntity,
  ): CatalogResponseDto {
    return {
      id: entity.element_id,
      code: entity.code,
      description: entity.description,
      sortOrder: entity.sort_order,
      status: entity.status,
      registrationDate: entity.registration_date,
      updateDate: entity.update_date,
    };
  }

  static toResponseList<TEntity extends CatalogEntity>(
    entities: readonly TEntity[],
  ): CatalogResponseDto[] {
    return entities.map((entity) => CatalogMapper.toResponse(entity));
  }
}
