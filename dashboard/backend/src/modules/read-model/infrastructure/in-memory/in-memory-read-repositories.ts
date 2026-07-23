import { Injectable } from '@nestjs/common';
import {
  AlertSchema,
  EventLogSchema,
  LampSnapshotSchema,
  NodeSnapshotSchema,
  SensorSnapshotSchema,
  SystemSnapshotSchema,
  type Alert,
  type EventLog,
  type LampSnapshot,
  type NodeSnapshot,
  type SensorSnapshot,
  type SystemSnapshot,
  type UtcTimestamp,
} from '@smart-campus/contracts';

import type {
  AlertReadRepository,
  LogReadRepository,
  ScenarioReadRepository,
  SnapshotReadRepository,
} from '../../domain/read-repositories.js';
import type { ScenarioReadModel } from '../../domain/read-model-models.js';
import { DeterministicReadFixture } from './deterministic-read-fixture.js';

@Injectable()
export class InMemorySnapshotReadRepository implements SnapshotReadRepository {
  private snapshot: SystemSnapshot;

  constructor(fixture: DeterministicReadFixture) {
    this.snapshot = SystemSnapshotSchema.parse(fixture.getSnapshot());
  }

  getCurrentSnapshot(): SystemSnapshot {
    return SystemSnapshotSchema.parse(this.snapshot);
  }

  setNode(node: NodeSnapshot, snapshotAt: UtcTimestamp): NodeSnapshot {
    const parsed = NodeSnapshotSchema.parse(node);
    this.snapshot = SystemSnapshotSchema.parse({
      ...this.snapshot,
      snapshotAt,
      nodes: this.snapshot.nodes.map((current) =>
        current.nodeId === parsed.nodeId ? parsed : current,
      ),
    });
    return NodeSnapshotSchema.parse(parsed);
  }

  setLamp(lamp: LampSnapshot, snapshotAt: UtcTimestamp): LampSnapshot {
    const parsed = LampSnapshotSchema.parse(lamp);
    this.snapshot = SystemSnapshotSchema.parse({
      ...this.snapshot,
      snapshotAt,
      lamps: this.snapshot.lamps.map((current) =>
        current.lampId === parsed.lampId ? parsed : current,
      ),
    });
    return LampSnapshotSchema.parse(parsed);
  }

  setSensor(sensor: SensorSnapshot, snapshotAt: UtcTimestamp): SensorSnapshot {
    const parsed = SensorSnapshotSchema.parse(sensor);
    this.snapshot = SystemSnapshotSchema.parse({
      ...this.snapshot,
      snapshotAt,
      sensors: this.snapshot.sensors.map((current) =>
        current.sensorId === parsed.sensorId ? parsed : current,
      ),
    });
    return SensorSnapshotSchema.parse(parsed);
  }
}

@Injectable()
export class InMemoryAlertReadRepository implements AlertReadRepository {
  private alerts: Alert[];

  constructor(fixture: DeterministicReadFixture) {
    this.alerts = fixture.getAlerts().map((alert) => AlertSchema.parse(alert));
  }

  list(): readonly Alert[] {
    return this.alerts.map((alert) => AlertSchema.parse(alert));
  }

  findById(id: string): Alert | null {
    const alert = this.alerts.find((candidate) => candidate.id === id);
    return alert === undefined ? null : AlertSchema.parse(alert);
  }

  upsert(alert: Alert): Alert {
    const parsed = AlertSchema.parse(alert);
    const index = this.alerts.findIndex((candidate) => candidate.id === parsed.id);
    if (index === -1) this.alerts.push(parsed);
    else this.alerts[index] = parsed;
    return AlertSchema.parse(parsed);
  }
}

@Injectable()
export class InMemoryLogReadRepository implements LogReadRepository {
  private logs: EventLog[];

  constructor(fixture: DeterministicReadFixture) {
    this.logs = fixture.getLogs().map((log) => EventLogSchema.parse(log));
  }

  list(): readonly EventLog[] {
    return this.logs.map((log) => EventLogSchema.parse(log));
  }

  findById(id: string): EventLog | null {
    const log = this.logs.find((candidate) => candidate.id === id);
    return log === undefined ? null : EventLogSchema.parse(log);
  }

  append(log: EventLog): EventLog {
    const parsed = EventLogSchema.parse(log);
    if (!this.logs.some((candidate) => candidate.id === parsed.id)) this.logs.push(parsed);
    return EventLogSchema.parse(parsed);
  }
}

@Injectable()
export class InMemoryScenarioReadRepository implements ScenarioReadRepository {
  constructor(private readonly fixture: DeterministicReadFixture) {}

  list(): readonly ScenarioReadModel[] {
    return this.fixture.getScenarios();
  }

  findById(id: string): ScenarioReadModel | null {
    return this.fixture.getScenarios().find((scenario) => scenario.id === id) ?? null;
  }
}
