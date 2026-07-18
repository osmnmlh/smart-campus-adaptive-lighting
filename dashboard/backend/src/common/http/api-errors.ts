import type { ApiErrorCode } from './api-error-code.js';

export interface ApiErrorDetail {
  field: string;
  reason: string;
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: readonly ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export const invalidQuery = (field: string, reason = 'Unsupported value.'): ApiRequestError =>
  new ApiRequestError(400, 'INVALID_QUERY', 'The supplied query parameter is invalid.', [
    { field, reason },
  ]);

export const invalidIdentifier = (field: string): ApiRequestError =>
  new ApiRequestError(400, 'INVALID_IDENTIFIER', 'The supplied identifier is invalid.', [
    { field, reason: 'Unsupported identifier format.' },
  ]);

export const notFound = (resource: string): ApiRequestError =>
  new ApiRequestError(404, 'NOT_FOUND', `The requested ${resource} was not found.`);

export class ReadModelInvalidError extends Error {
  constructor() {
    super('The deterministic read model failed runtime validation.');
    this.name = 'ReadModelInvalidError';
  }
}
