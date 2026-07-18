export interface Pagination {
  offset: number;
  limit: number;
}

export const DEFAULT_PAGINATION: Pagination = Object.freeze({ offset: 0, limit: 25 });
export const MAX_PAGE_SIZE = 100;
