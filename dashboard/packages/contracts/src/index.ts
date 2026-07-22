export {
  EntityRefSchema,
  LampIdSchema,
  NodeIdSchema,
  NonEmptyIdSchema,
  ScenarioIdSchema,
  SchemaVersionSchema,
  SensorIdSchema,
} from './common/identifiers.schema.js';
export type {
  EntityRef,
  LampId,
  NodeId,
  ScenarioId,
  SchemaVersion,
  SensorId,
} from './common/identifiers.schema.js';
export { JsonObjectSchema, JsonValueSchema } from './common/json.schema.js';
export type { JsonObject, JsonPrimitive, JsonValue } from './common/json.schema.js';
export {
  BooleanMetricValueSchema,
  ConfidenceSchema,
  createMetricValueSchema,
  LuxMetricValueSchema,
  NonNegativeIntegerSchema,
  NonNegativeMetricValueSchema,
  NonNegativeNumberSchema,
  NumericMetricValueSchema,
  PercentageMetricValueSchema,
  PercentageSchema,
  PositiveIntegerSchema,
} from './common/metric.schema.js';
export type { MetricValue } from './common/metric.schema.js';
export { UtcTimestampSchema } from './common/timestamp.schema.js';
export type { UtcTimestamp } from './common/timestamp.schema.js';

export {
  DayPhase,
  DayPhaseSchema,
  Direction,
  DirectionSchema,
  EntityType,
  EntityTypeSchema,
  SystemMode,
  SystemModeSchema,
} from './enums/system.enums.js';
export {
  AlertSeverity,
  AlertSeveritySchema,
  AlertStatus,
  AlertStatusSchema,
  CommunicationHealth,
  CommunicationHealthSchema,
  LampHealth,
  LampHealthSchema,
  LampOperatingState,
  LampOperatingStateSchema,
  NodeHealth,
  NodeHealthSchema,
  SensorHealth,
  SensorHealthSchema,
} from './enums/health.enums.js';
export {
  DataSource,
  DataSourceSchema,
  MetricQuality,
  MetricQualitySchema,
  MetricUnit,
  MetricUnitSchema,
  SensorType,
  SensorTypeSchema,
  TelemetryMetric,
  TelemetryMetricSchema,
} from './enums/telemetry.enums.js';
export {
  ScenarioControlAction,
  ScenarioControlActionSchema,
  ScenarioEventType,
  ScenarioEventTypeSchema,
  ScenarioRunStatus,
  ScenarioRunStatusSchema,
} from './enums/scenario.enums.js';

export { NodeSchema } from './entities/node.schema.js';
export type { Node } from './entities/node.schema.js';
export { LampSchema } from './entities/lamp.schema.js';
export type { Lamp } from './entities/lamp.schema.js';
export { SensorSchema } from './entities/sensor.schema.js';
export type { Sensor } from './entities/sensor.schema.js';

export { TelemetrySampleSchema } from './telemetry/telemetry-sample.schema.js';
export type { TelemetrySample } from './telemetry/telemetry-sample.schema.js';
export {
  CurrentMetricValueSchema,
  ElectricalMetricsSchema,
  EnergyMetricValueSchema,
  PowerMetricValueSchema,
  VoltageMetricValueSchema,
} from './telemetry/electrical-metrics.schema.js';
export type {
  CurrentMetricValue,
  ElectricalMetrics,
  EnergyMetricValue,
  PowerMetricValue,
  VoltageMetricValue,
} from './telemetry/electrical-metrics.schema.js';
export { CommunicationMetricsSchema } from './telemetry/communication-metrics.schema.js';
export type { CommunicationMetrics } from './telemetry/communication-metrics.schema.js';
export { DirectionStateSchema, MotionEventSchema } from './telemetry/motion.schema.js';
export type { DirectionState, MotionEvent } from './telemetry/motion.schema.js';

export { AlertCode, AlertCodeSchema, AlertSchema } from './alerts/alert.schema.js';
export type { Alert } from './alerts/alert.schema.js';
export { EventLogSchema, EventType, EventTypeSchema } from './alerts/event-log.schema.js';
export type { EventLog } from './alerts/event-log.schema.js';

export { NodeSnapshotSchema } from './snapshots/node-snapshot.schema.js';
export type { NodeSnapshot } from './snapshots/node-snapshot.schema.js';
export { LampSnapshotSchema } from './snapshots/lamp-snapshot.schema.js';
export type { LampSnapshot } from './snapshots/lamp-snapshot.schema.js';
export { SensorSnapshotSchema } from './snapshots/sensor-snapshot.schema.js';
export type { SensorSnapshot } from './snapshots/sensor-snapshot.schema.js';
export { SystemSnapshotSchema } from './snapshots/system-snapshot.schema.js';
export type { SystemSnapshot } from './snapshots/system-snapshot.schema.js';

export {
  DashboardCommandSchema,
  DashboardCommandType,
  DashboardCommandTypeSchema,
  ScenarioControlPayloadSchema,
} from './commands/dashboard-command.schema.js';
export type {
  DashboardCommand,
  ScenarioControlPayload,
} from './commands/dashboard-command.schema.js';

export { ScenarioEventSchema } from './scenarios/scenario-event.schema.js';
export type { ScenarioEvent } from './scenarios/scenario-event.schema.js';
export {
  ScenarioDefinitionSchema,
  ScenarioExpectedOutcomeSchema,
  ScenarioInitialStateSchema,
} from './scenarios/scenario-definition.schema.js';
export type {
  ScenarioDefinition,
  ScenarioExpectedOutcome,
  ScenarioInitialState,
} from './scenarios/scenario-definition.schema.js';

export { ApiErrorSchema } from './transport/api-error.schema.js';
export type { ApiError } from './transport/api-error.schema.js';
export {
  WebSocketEventSchema,
  WebSocketEventType,
  WebSocketEventTypeSchema,
} from './transport/websocket-event.schema.js';
export type { WebSocketEvent } from './transport/websocket-event.schema.js';

export * from './transport/communication.index.js';
export * from './transport/realtime/index.js';
