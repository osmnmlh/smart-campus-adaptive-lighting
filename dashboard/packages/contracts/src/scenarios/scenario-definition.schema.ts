import { z } from 'zod';
import {
  EntityRefSchema,
  LampIdSchema,
  NodeIdSchema,
  ScenarioIdSchema,
  SensorIdSchema,
} from '../common/identifiers.schema.js';
import { JsonValueSchema } from '../common/json.schema.js';
import {
  NonNegativeIntegerSchema,
  PercentageSchema,
  PositiveIntegerSchema,
} from '../common/metric.schema.js';
import {
  LampHealthSchema,
  LampOperatingStateSchema,
  NodeHealthSchema,
  SensorHealthSchema,
} from '../enums/health.enums.js';
import { DayPhaseSchema, SystemModeSchema } from '../enums/system.enums.js';
import { ScenarioEventSchema } from './scenario-event.schema.js';

export const ScenarioInitialStateSchema = z
  .object({
    systemMode: SystemModeSchema.optional(),
    dayPhase: DayPhaseSchema.optional(),
    lux: z.number().finite().nonnegative().optional(),
    nodes: z
      .array(
        z
          .object({
            nodeId: NodeIdSchema,
            online: z.boolean(),
            health: NodeHealthSchema.optional(),
          })
          .strict(),
      )
      .optional(),
    lamps: z
      .array(
        z
          .object({
            lampId: LampIdSchema,
            brightnessPercent: PercentageSchema,
            operatingState: LampOperatingStateSchema.optional(),
            health: LampHealthSchema.optional(),
          })
          .strict(),
      )
      .optional(),
    sensors: z
      .array(
        z
          .object({
            sensorId: SensorIdSchema,
            active: z.boolean().optional(),
            health: SensorHealthSchema.optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const ScenarioExpectedOutcomeSchema = z
  .object({
    description: z.string().trim().min(1),
    atMs: NonNegativeIntegerSchema,
    entity: EntityRefSchema.optional(),
    expectedPath: z.string().trim().min(1),
    expectedValue: JsonValueSchema,
  })
  .strict();

export const ScenarioDefinitionSchema = z
  .object({
    id: ScenarioIdSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    tickMs: PositiveIntegerSchema,
    durationMs: PositiveIntegerSchema,
    initialState: ScenarioInitialStateSchema,
    events: z.array(ScenarioEventSchema),
    expectedOutcomes: z.array(ScenarioExpectedOutcomeSchema),
    tags: z.array(z.string().trim().min(1)),
  })
  .strict()
  .superRefine((definition, context) => {
    definition.events.forEach((event, index) => {
      if (event.atMs > definition.durationMs) {
        context.addIssue({
          code: 'custom',
          message: 'Scenario event must occur within durationMs',
          path: ['events', index, 'atMs'],
        });
      }
    });
    definition.expectedOutcomes.forEach((outcome, index) => {
      if (outcome.atMs > definition.durationMs) {
        context.addIssue({
          code: 'custom',
          message: 'Expected outcome must occur within durationMs',
          path: ['expectedOutcomes', index, 'atMs'],
        });
      }
    });
  });

export type ScenarioInitialState = z.infer<typeof ScenarioInitialStateSchema>;
export type ScenarioExpectedOutcome = z.infer<typeof ScenarioExpectedOutcomeSchema>;
export type ScenarioDefinition = z.infer<typeof ScenarioDefinitionSchema>;
