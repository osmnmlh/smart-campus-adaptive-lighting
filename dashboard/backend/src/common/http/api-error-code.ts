export const API_ERROR_CODES = [
  'INVALID_QUERY',
  'INVALID_IDENTIFIER',
  'NOT_FOUND',
  'READ_MODEL_INVALID',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
