import { z } from 'zod';
import { AlertSchema } from '../alerts/alert.schema.js';
import { EventLogSchema } from '../alerts/event-log.schema.js';
import { ScenarioIdSchema, SchemaVersionSchema } from '../common/identifiers.schema.js';
import { LuxMetricValueSchema, PercentageMetricValueSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { DayPhaseSchema, SystemModeSchema } from '../enums/system.enums.js';
import {
  EnergyMetricValueSchema,
  PowerMetricValueSchema,
} from '../telemetry/electrical-metrics.schema.js';
import { DirectionStateSchema } from '../telemetry/motion.schema.js';
import { LampSnapshotSchema } from './lamp-snapshot.schema.js';
import { NodeSnapshotSchema } from './node-snapshot.schema.js';
import { SensorSnapshotSchema } from './sensor-snapshot.schema.js';

export const SystemSnapshotSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    snapshotAt: UtcTimestampSchema,
    scenarioRunId: ScenarioIdSchema.optional(),
    systemMode: SystemModeSchema,
    dayPhase: DayPhaseSchema,
    lux: LuxMetricValueSchema.nullable(),
    direction: DirectionStateSchema,
    nodes: z.array(NodeSnapshotSchema),
    lamps: z.array(LampSnapshotSchema),
    sensors: z.array(SensorSnapshotSchema),
    activeAlerts: z.array(AlertSchema),
    recentEvents: z.array(EventLogSchema),
    instantPower: PowerMetricValueSchema,
    energyConsumed: EnergyMetricValueSchema,
    baselineEnergy: EnergyMetricValueSchema,
    estimatedSavingPercent: PercentageMetricValueSchema.nullable(),
  })
  .strict();

export type SystemSnapshot = z.infer<typeof SystemSnapshotSchema>;
