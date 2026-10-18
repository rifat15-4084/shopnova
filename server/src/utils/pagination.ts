export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function normalizePagination(query: PaginationQuery, maxLimit = 100) {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(query.limit ?? 12)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}
