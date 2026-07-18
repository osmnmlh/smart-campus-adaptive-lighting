import 'reflect-metadata';

import { Test, type TestingModule } from '@nestjs/testing';
import {
  AlertSchema,
  DataSource,
  EventLogSchema,
  ScenarioDefinitionSchema,
  SystemSnapshotSchema,
} from '@smart-campus/contracts';

import {
  ACTIVITY_WINDOW_START,
  FIXED_AS_OF,
} from '../../src/modules/read-model/domain/read-model-models.js';
import { DeterministicReadFixture } from '../../src/modules/read-model/infrastructure/in-memory/deterministic-read-fixture.js';
import {
  InMemoryAlertReadRepository,
  InMemoryLogReadRepository,
  InMemoryScenarioReadRepository,
  InMemorySnapshotReadRepository,
} from '../../src/modules/read-model/infrastructure/in-memory/in-memory-read-repositories.js';
import { ReadModelModule } from '../../src/modules/read-model/read-model.module.js';

describe('deterministic read fixture and repositories', () => {
  let moduleReference: TestingModule;
  let fixture: DeterministicReadFixture;
  let snapshots: InMemorySnapshotReadRepository;
  let alerts: InMemoryAlertReadRepository;
  let logs: InMemoryLogReadRepository;
  let scenarios: InMemoryScenarioReadRepository;

  beforeAll(async () => {
    moduleReference = await Test.createTestingModule({ imports: [ReadModelModule] }).compile();
    fixture = moduleReference.get(DeterministicReadFixture);
    snapshots = moduleReference.get(InMemorySnapshotReadRepository);
    alerts = moduleReference.get(InMemoryAlertReadRepository);
    logs = moduleReference.get(InMemoryLogReadRepository);
    scenarios = moduleReference.get(InMemoryScenarioReadRepository);
  });

  afterAll(async () => {
    await moduleReference.close();
  });

  it('uses the fixed UTC as-of timestamp', () => {
    expect(ACTIVITY_WINDOW_START).toBe('2026-06-14T20:30:00.000Z');
    expect(fixture.windowStart).toBe(ACTIVITY_WINDOW_START);
    expect(fixture.asOf).toBe(FIXED_AS_OF);
    expect(FIXED_AS_OF).toBe('2026-06-15T20:30:00.000Z');
    expect(fixture.getSnapshot().snapshotAt).toBe(FIXED_AS_OF);
  });

  it('constructs equal output repeatedly', () => {
    expect(fixture.getSnapshot()).toEqual(fixture.getSnapshot());
    expect(fixture.getAlerts()).toEqual(fixture.getAlerts());
    expect(fixture.getLogs()).toEqual(fixture.getLogs());
  });

  it('is JSON serializable without undefined values or functions', () => {
    const serialized = JSON.stringify({
      snapshot: fixture.getSnapshot(),
      alerts: fixture.getAlerts(),
      logs: fixture.getLogs(),
      scenarios: fixture.getScenarios(),
    });
    expect(serialized).not.toContain('undefined');
    expect(serialized).not.toContain('function');
    expect(JSON.parse(serialized)).toBeDefined();
  });

  it('contains unique alert IDs', () => {
    const ids = fixture.getAlerts().map((alert) => alert.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains unique log IDs', () => {
    const ids = fixture.getLogs().map((log) => log.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains unique scenario IDs', () => {
    const ids = fixture.getScenarios().map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('runtime-validates the snapshot against shared contracts', () => {
    expect(SystemSnapshotSchema.safeParse(fixture.getSnapshot()).success).toBe(true);
  });

  it('runtime-validates every alert against shared contracts', () => {
    expect(fixture.getAlerts().every((alert) => AlertSchema.safeParse(alert).success)).toBe(true);
  });

  it('runtime-validates every log against shared contracts', () => {
    expect(fixture.getLogs().every((log) => EventLogSchema.safeParse(log).success)).toBe(true);
  });

  it('runtime-validates every scenario definition against shared contracts', () => {
    expect(
      fixture
        .getScenarios()
        .every((scenario) => ScenarioDefinitionSchema.safeParse(scenario.definition).success),
    ).toBe(true);
  });

  it('contains 15 alerts with 5 active and 10 resolved records', () => {
    const records = fixture.getAlerts();
    expect(records).toHaveLength(15);
    expect(records.filter((alert) => alert.status === 'ACTIVE')).toHaveLength(5);
    expect(records.filter((alert) => alert.status === 'RESOLVED')).toHaveLength(10);
  });

  it.each([
    ['CRITICAL', 1],
    ['WARNING', 9],
    ['INFO', 5],
  ] as const)('contains %s alert parity count', (severity, expected) => {
    expect(fixture.getAlerts().filter((alert) => alert.severity === severity)).toHaveLength(
      expected,
    );
  });

  it('contains exactly one active node-offline alert', () => {
    expect(
      fixture
        .getAlerts()
        .filter((alert) => alert.code === 'NODE_OFFLINE' && alert.status === 'ACTIVE'),
    ).toHaveLength(1);
  });

  it('contains 42 logs', () => {
    expect(fixture.getLogs()).toHaveLength(42);
  });

  it.each([
    ['SYSTEM', 4],
    ['SCENARIO', 7],
    ['SENSOR', 8],
    ['DIRECTION', 2],
    ['LAMP', 7],
    ['NODE', 6],
    ['ALERT', 8],
  ] as const)('contains %s log category parity count', (category, expected) => {
    expect(fixture.getLogs().filter((log) => log.metadata.category === category)).toHaveLength(
      expected,
    );
  });

  it.each([
    ['INFO', 29],
    ['WARNING', 11],
    ['ERROR', 2],
  ] as const)('contains %s log level parity count', (level, expected) => {
    expect(fixture.getLogs().filter((log) => log.metadata.level === level)).toHaveLength(expected);
  });

  it('marks all alert and log records as simulated', () => {
    expect(
      fixture.getAlerts().every((alert) => alert.metadata.dataSource === DataSource.SIMULATED),
    ).toBe(true);
    expect(fixture.getLogs().every((log) => log.metadata.dataSource === DataSource.SIMULATED)).toBe(
      true,
    );
  });

  it('returns a snapshot without ambiguous pwmDuty or measured electrical values', () => {
    const snapshot = fixture.getSnapshot();
    expect(snapshot.lamps.every((lamp) => 'pwmDutyPercent' in lamp)).toBe(true);
    expect(snapshot.lamps.every((lamp) => !('pwmDuty' in lamp))).toBe(true);
    expect(snapshot.lamps.every((lamp) => lamp.electrical.current === null)).toBe(true);
    expect(snapshot.lamps.every((lamp) => lamp.electrical.voltage === null)).toBe(true);
    expect(snapshot.lamps.every((lamp) => lamp.electrical.power === null)).toBe(true);
  });

  it('returns all canonical topology entities in the snapshot', () => {
    const snapshot = fixture.getSnapshot();
    expect(snapshot.nodes.map((node) => node.nodeId)).toEqual(['node-1', 'node-2', 'node-3']);
    expect(snapshot.lamps.map((lamp) => lamp.lampId)).toEqual([
      'lamp-1',
      'lamp-2',
      'lamp-3',
      'lamp-4',
      'lamp-5',
    ]);
    expect(snapshot.sensors).toHaveLength(6);
  });

  it('snapshot repository returns defensive copies', () => {
    const first = snapshots.getCurrentSnapshot();
    first.nodes[0]!.online = false;
    expect(snapshots.getCurrentSnapshot().nodes[0]!.online).toBe(true);
  });

  it('alert repository returns defensive copies', () => {
    const first = alerts.list();
    first[0]!.message = 'mutated';
    expect(alerts.list()[0]!.message).not.toBe('mutated');
  });

  it('log repository returns defensive copies', () => {
    const first = logs.list();
    first[0]!.message = 'mutated';
    expect(logs.list()[0]!.message).not.toBe('mutated');
  });

  it('scenario repository returns defensive copies', () => {
    const first = scenarios.list();
    first[0]!.title = 'mutated';
    expect(scenarios.list()[0]!.title).not.toBe('mutated');
  });

  it('finds an existing alert and returns null for a valid unknown alert', () => {
    expect(alerts.findById('ALERT_SIM_001')?.id).toBe('ALERT_SIM_001');
    expect(alerts.findById('ALERT_SIM_999')).toBeNull();
  });

  it('finds an existing log and returns null for a valid unknown log', () => {
    expect(logs.findById('LOG_SIM_035')?.id).toBe('LOG_SIM_035');
    expect(logs.findById('LOG_SIM_999')).toBeNull();
  });

  it('returns five scenarios in canonical stable order', () => {
    expect(scenarios.list().map((scenario) => scenario.id)).toEqual([
      'empty-campus',
      'left-to-right',
      'right-to-left',
      'center-presence',
      'node-offline',
    ]);
  });

  it('finds an existing scenario and returns null for an unknown scenario', () => {
    expect(scenarios.findById('node-offline')?.id).toBe('node-offline');
    expect(scenarios.findById('unknown-scenario')).toBeNull();
  });
});
