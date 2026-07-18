import { invalidQuery } from '../http/api-errors.js';

export const assertAllowedQueryKeys = (
  query: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): void => {
  const allowedSet = new Set(allowed);
  const unknownKey = Object.keys(query).find((key) => !allowedSet.has(key));
  if (unknownKey !== undefined) throw invalidQuery(unknownKey, 'Unknown query parameter.');
};

export const readOptionalQueryString = (
  query: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  const value = query[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw invalidQuery(field, 'Expected exactly one string value.');
  if (value.length === 0 || value.trim() !== value) {
    throw invalidQuery(field, 'Empty or whitespace-padded values are not supported.');
  }
  return value;
};

export const parseOptionalEnum = <T extends string>(
  query: Readonly<Record<string, unknown>>,
  field: string,
  values: readonly T[],
): T | undefined => {
  const value = readOptionalQueryString(query, field);
  if (value === undefined) return undefined;
  if (!(values as readonly string[]).includes(value)) throw invalidQuery(field);
  return value as T;
};
