import type { PaginatedResult } from '../../interfaces/pagination/paginated-result.interface';

export interface Catalog {
  id: number;
  code: string;
  description: string;
  sortOrder: number;
  status: boolean;
  registrationDate: Date;
  updateDate: Date | null;
}

export interface CatalogSearchFilters {
  code?: string;
  description?: string;
  status?: boolean;
  page: number;
  limit: number;
}

export type PaginatedCatalogResult = PaginatedResult<Catalog>;
