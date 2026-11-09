import type { PaginatedResult } from '../../interfaces/pagination/paginated-result.interface';
import type { IBaseRepository } from '../../interfaces/repository/base-repository.interface';

export type CatalogSearchResult<TEntity> = PaginatedResult<TEntity>;

export interface CatalogRepositoryInterface<
  TCreate,
  TUpdate,
  TSearch,
  TEntity,
> extends IBaseRepository<TEntity, TCreate, TUpdate> {
  findAllPaginated(filters: TSearch): Promise<PaginatedResult<TEntity>>;
}
