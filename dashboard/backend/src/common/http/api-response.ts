import type { DataSource } from '@smart-campus/contracts';

export interface ApiMeta {
  asOf: string;
  dataSource: DataSource;
  deterministic: boolean;
}

export interface ListApiMeta extends ApiMeta {
  total: number;
  filteredCount: number;
  offset: number;
  limit: number;
  returnedCount: number;
  hasMore: boolean;
}

export interface ApiResponse<T, M extends ApiMeta = ApiMeta> {
  data: T;
  meta: M;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: readonly { field: string; reason: string }[];
  };
}
