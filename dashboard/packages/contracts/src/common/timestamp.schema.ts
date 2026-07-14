import { z } from 'zod';

export const UtcTimestampSchema = z
  .string()
  .datetime({ offset: false })
  .refine((value) => value.endsWith('Z'), 'Timestamp must be a UTC ISO 8601 string');

export type UtcTimestamp = z.infer<typeof UtcTimestampSchema>;
