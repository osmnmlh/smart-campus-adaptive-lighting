import { invalidQuery } from '../http/api-errors.js';
import { readOptionalQueryString } from '../validation/query-validation.js';
import { DEFAULT_PAGINATION, MAX_PAGE_SIZE, type Pagination } from './pagination-model.js';

const UNSIGNED_INTEGER = /^(?:0|[1-9]\d*)$/;

const parseInteger = (
  query: Readonly<Record<string, unknown>>,
  field: 'offset' | 'limit',
): number => {
  const raw = readOptionalQueryString(query, field);
  if (raw === undefined) return DEFAULT_PAGINATION[field];
  if (!UNSIGNED_INTEGER.test(raw)) throw invalidQuery(field, 'Expected a canonical integer.');

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw invalidQuery(field, 'Integer is outside the safe range.');
  if (field === 'limit' && (value < 1 || value > MAX_PAGE_SIZE)) {
    throw invalidQuery(field, `Expected an integer from 1 to ${MAX_PAGE_SIZE}.`);
  }
  return value;
};

export const parsePagination = (query: Readonly<Record<string, unknown>>): Pagination => ({
  offset: parseInteger(query, 'offset'),
  limit: parseInteger(query, 'limit'),
});
