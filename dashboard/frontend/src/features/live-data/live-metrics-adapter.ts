import {
  DataSource,
  MetricQuality,
  MetricUnit,
  SystemSnapshotSchema,
  type SystemSnapshot,
} from '@smart-campus/contracts';
import type {
  MetricsDashboardModel,
  MetricsDashboardState,
} from '@/features/metrics/metrics-model';
import { displayEntityId } from '@/features/overview/overview-selectors';

function snapshotSource(snapshot: SystemSnapshot): DataSource {
  return (
    snapshot.lux?.source ??
    snapshot.sensors.find((sensor) => sensor.reading !== undefined)?.reading?.source ??
    DataSource.NOMINAL
  );
}

export function createLiveMetricsDashboardState(
  historyInput: readonly SystemSnapshot[],
): MetricsDashboardState {
  const parsed = historyInput.map((snapshot) => SystemSnapshotSchema.safeParse(snapshot));
  if (parsed.some((result) => !result.success)) {
    return {
      status: 'invalid',
      model: null,
      message: 'Live session metrics failed contract validation.',
    };
  }
  const history = parsed.flatMap((result) => (result.success ? [result.data] : []));
  const current = history.at(-1);
  if (!current) {
    return {
      status: 'empty',
      model: null,
      message: 'Live session history is unavailable until the first backend snapshot arrives.',
    };
  }

  const dataSource = snapshotSource(current);
  const model: MetricsDashboardModel = {
    fixtureStart: history[0]?.snapshotAt ?? current.snapshotAt,
    fixtureEnd: current.snapshotAt,
    snapshotAt: current.snapshotAt,
    dataSource,
    lamps: current.lamps.map((lamp) => ({
      lampId: lamp.lampId,
      label: displayEntityId(lamp.lampId),
      points: history.flatMap((snapshot) => {
        const point = snapshot.lamps.find((candidate) => candidate.lampId === lamp.lampId);
        if (!point) return [];
        return [
          {
            timestamp: snapshot.snapshotAt,
            brightnessPercent: point.brightnessPercent,
            targetBrightnessPercent: point.targetBrightnessPercent,
            pwmDutyPercent: point.pwmDutyPercent,
            source: snapshotSource(snapshot),
            quality: MetricQuality.GOOD,
          },
        ];
      }),
    })),
    ambientLight: history.flatMap((snapshot) =>
      snapshot.lux === null
        ? []
        : [
            {
              timestamp: snapshot.snapshotAt,
              value: snapshot.lux.value,
              unit: MetricUnit.LX,
              source: snapshot.lux.source,
              quality: snapshot.lux.quality,
            },
          ],
    ),
    sensors: current.sensors
      .filter((sensor) => sensor.active !== undefined)
      .map((sensor) => ({
        sensorId: sensor.sensorId,
        label: displayEntityId(sensor.sensorId),
        points: history.flatMap((snapshot) => {
          const point = snapshot.sensors.find(
            (candidate) => candidate.sensorId === sensor.sensorId,
          );
          if (point?.active === undefined) return [];
          return [
            {
              timestamp: snapshot.snapshotAt,
              value: point.active ? (1 as const) : (0 as const),
              source: point.reading?.source ?? snapshotSource(snapshot),
              quality: point.reading?.quality ?? MetricQuality.GOOD,
            },
          ];
        }),
      })),
    communication: current.nodes.map((node) => ({
      nodeId: node.nodeId,
      label: displayEntityId(node.nodeId),
      communicationHealth: node.communication.health,
      nodeHealth: node.health,
      latestTimestamp: node.communication.lastHeartbeatAt ?? current.snapshotAt,
      source: dataSource,
    })),
    electricalAvailable: current.lamps.some(
      (lamp) =>
        lamp.electrical.current !== null ||
        lamp.electrical.voltage !== null ||
        lamp.electrical.power !== null,
    ),
  };

  return {
    status: 'ready',
    model,
    message: `Live session history contains ${history.length} validated snapshot${
      history.length === 1 ? '' : 's'
    }.`,
  };
}
