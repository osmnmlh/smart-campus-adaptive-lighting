import { z } from 'zod';
import { NonEmptyIdSchema } from '../common/identifiers.schema.js';
import { JsonValueSchema } from '../common/json.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';

export const ApiErrorSchema = z
  .object({
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
    details: JsonValueSchema.optional(),
    correlationId: NonEmptyIdSchema,
    timestamp: UtcTimestampSchema,
  })
  .strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;
