import { z } from 'zod';
import { LampIdSchema, NonEmptyIdSchema, ScenarioIdSchema } from '../common/identifiers.schema.js';
import { PercentageSchema, PositiveIntegerSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { SystemModeSchema } from '../enums/system.enums.js';

export const DashboardCommandTypeSchema = z.enum([
  'SET_MODE',
  'SET_LAMP_BRIGHTNESS',
  'RUN_SCENARIO',
  'CONTROL_SCENARIO',
  'RESET_SCENARIO',
]);
export const DashboardCommandType = DashboardCommandTypeSchema.enum;
export type DashboardCommandType = z.infer<typeof DashboardCommandTypeSchema>;

const CommandBaseShape = {
  commandId: NonEmptyIdSchema,
  issuedAt: UtcTimestampSchema,
  actorId: NonEmptyIdSchema,
  correlationId: NonEmptyIdSchema,
};

export const ScenarioControlPayloadSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('PAUSE') }).strict(),
  z.object({ action: z.literal('RESUME') }).strict(),
  z.object({ action: z.literal('STEP'), stepMs: PositiveIntegerSchema }).strict(),
  z
    .object({
      action: z.literal('SET_SPEED'),
      speed: z.union([z.literal(0.5), z.literal(1), z.literal(2), z.literal(5)]),
    })
    .strict(),
]);

const SetModeCommandSchema = z
  .object({
    ...CommandBaseShape,
    type: z.literal('SET_MODE'),
    payload: z.object({ mode: SystemModeSchema }).strict(),
  })
  .strict();

const SetLampBrightnessCommandSchema = z
  .object({
    ...CommandBaseShape,
    type: z.literal('SET_LAMP_BRIGHTNESS'),
    target: z
      .object({
        entityType: z.literal('LAMP'),
        lampId: LampIdSchema,
      })
      .strict(),
    payload: z.object({ brightnessPercent: PercentageSchema }).strict(),
  })
  .strict();

const RunScenarioCommandSchema = z
  .object({
    ...CommandBaseShape,
    type: z.literal('RUN_SCENARIO'),
    payload: z.object({ scenarioId: ScenarioIdSchema }).strict(),
  })
  .strict();

const ControlScenarioCommandSchema = z
  .object({
    ...CommandBaseShape,
    type: z.literal('CONTROL_SCENARIO'),
    payload: ScenarioControlPayloadSchema,
  })
  .strict();

const ResetScenarioCommandSchema = z
  .object({
    ...CommandBaseShape,
    type: z.literal('RESET_SCENARIO'),
    payload: z.object({}).strict(),
  })
  .strict();

export const DashboardCommandSchema = z.discriminatedUnion('type', [
  SetModeCommandSchema,
  SetLampBrightnessCommandSchema,
  RunScenarioCommandSchema,
  ControlScenarioCommandSchema,
  ResetScenarioCommandSchema,
]);

export type ScenarioControlPayload = z.infer<typeof ScenarioControlPayloadSchema>;
export type DashboardCommand = z.infer<typeof DashboardCommandSchema>;
