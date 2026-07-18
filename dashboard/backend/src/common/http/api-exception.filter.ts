import { Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';

import { ApiRequestError, ReadModelInvalidError } from './api-errors.js';
import type { ApiErrorResponse } from './api-response.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.mapException(exception);
    response.status(mapped.status).json(mapped.body);
  }

  private mapException(exception: unknown): { status: number; body: ApiErrorResponse } {
    if (exception instanceof ApiRequestError) {
      return {
        status: exception.status,
        body: {
          error: {
            code: exception.code,
            message: exception.message,
            ...(exception.details.length === 0 ? {} : { details: exception.details }),
          },
        },
      };
    }

    if (exception instanceof ReadModelInvalidError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          error: {
            code: 'READ_MODEL_INVALID',
            message: 'The deterministic read model is unavailable.',
          },
        },
      };
    }

    if (exception instanceof HttpException && exception.getStatus() === HttpStatus.NOT_FOUND) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found.',
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected server error occurred.',
        },
      },
    };
  }
}
