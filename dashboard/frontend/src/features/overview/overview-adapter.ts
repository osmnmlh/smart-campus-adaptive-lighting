import {
  AlertSeverity,
  AlertStatus,
  DataSource,
  LampOperatingState,
  MetricQuality,
  SensorHealth,
  SystemSnapshotSchema,
  type SystemSnapshot,
} from '@smart-campus/contracts';
import type { OverviewModel } from './overview-model';
import {
  alertSeverityLabel,
  communicationHealthLabel,
  dataSourceLabel,
  displayEntityId,
  formatUtcTimestamp,
  healthTone,
  lampHealthLabel,
  lampIdsForNode,
  lampOperatingStateLabel,
  metricQualityLabel,
  nodeHealthLabel,
  sensorHealthLabel,
  sensorTypeFor,
  sensorTypeLabel,
  severityRank,
  systemModeLabel,
} from './overview-selectors';

function highestSeverity(severities: readonly AlertSeverity[]): AlertSeverity | 'NONE' {
  return severities.reduce<AlertSeverity | 'NONE'>((highest, severity) => {
    if (highest === 'NONE' || severityRank[severity] > severityRank[highest]) return severity;
    return highest;
  }, 'NONE');
}

function snapshotDataSource(snapshot: SystemSnapshot): DataSource {
  return (
    snapshot.lux?.source ??
    snapshot.sensors.find((sensor) => sensor.reading)?.reading?.source ??
    DataSource.SIMULATED
  );
}

export function createOverviewModel(snapshot: SystemSnapshot): OverviewModel {
  const activeAlerts = snapshot.activeAlerts.filter((alert) => alert.status === AlertStatus.ACTIVE);
  const source = snapshotDataSource(snapshot);

  const nodes = [...snapshot.nodes]
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
    .map((node) => {
      const updatedAt = node.communication.lastHeartbeatAt ?? snapshot.snapshotAt;
      return {
        id: displayEntityId(node.nodeId),
        contractId: node.nodeId,
        health: node.health,
        healthLabel: nodeHealthLabel(node.health),
        healthTone: healthTone(node.health),
        online: node.online,
        communicationHealth: node.communication.health,
        communicationLabel: communicationHealthLabel(node.communication.health),
        communicationTone: healthTone(node.communication.health),
        lampIds: lampIdsForNode(node.nodeId, snapshot),
        updatedAt,
        updatedAtLabel: formatUtcTimestamp(updatedAt),
      };
    });

  const lamps = [...snapshot.lamps]
    .sort((left, right) => left.lampId.localeCompare(right.lampId))
    .map((item) => ({
      id: displayEntityId(item.lampId),
      contractId: item.lampId,
      operatingState: item.operatingState,
      operatingStateLabel: lampOperatingStateLabel(item.operatingState),
      operatingStateTone: healthTone(item.operatingState),
      health: item.health,
      healthLabel: lampHealthLabel(item.health),
      healthTone: healthTone(item.health),
      brightnessPercent: item.brightnessPercent,
      targetBrightnessPercent: item.targetBrightnessPercent,
      pwmDutyPercent: item.pwmDutyPercent,
    }));

  const sensors = [...snapshot.sensors]
    .sort((left, right) => left.sensorId.localeCompare(right.sensorId))
    .map((item) => {
      const type = sensorTypeFor(item.sensorId);
      const dataSource = item.reading?.source ?? DataSource.SIMULATED;
      const quality = item.reading?.quality ?? MetricQuality.GOOD;
      const active = item.active ?? null;

      return {
        id: displayEntityId(item.sensorId),
        contractId: item.sensorId,
        type,
        typeLabel: sensorTypeLabel(type),
        health: item.health,
        healthLabel: sensorHealthLabel(item.health),
        healthTone: healthTone(item.health),
        active,
        activityLabel: active === null ? 'Not applicable' : active ? 'Active' : 'Inactive',
        dataSource,
        dataSourceLabel: dataSourceLabel(dataSource),
        metricQuality: quality,
        metricQualityLabel: metricQualityLabel(quality),
      };
    });

  const alerts = [...activeAlerts]
    .sort((left, right) => {
      const severityDifference = severityRank[right.severity] - severityRank[left.severity];
      return severityDifference || right.startedAt.localeCompare(left.startedAt);
    })
    .map((alert) => ({
      id: alert.id,
      title: alert.message,
      severity: alert.severity,
      severityLabel: alertSeverityLabel(alert.severity),
      severityTone: healthTone(alert.severity),
      entityReference: displayEntityId(alert.sourceEntity.entityId),
      timestamp: alert.startedAt,
      timestampLabel: formatUtcTimestamp(alert.startedAt),
    }));

  return {
    systemMode: snapshot.systemMode,
    systemModeLabel: systemModeLabel(snapshot.systemMode),
    systemModeTone: healthTone(snapshot.systemMode),
    snapshotAt: snapshot.snapshotAt,
    snapshotAtLabel: formatUtcTimestamp(snapshot.snapshotAt),
    dataSource: source,
    dataSourceLabel: dataSourceLabel(source),
    summary: {
      totalNodes: snapshot.nodes.length,
      onlineNodes: snapshot.nodes.filter((node) => node.online).length,
      offlineNodes: snapshot.nodes.filter((node) => !node.online).length,
      totalLamps: snapshot.lamps.length,
      activeLamps: snapshot.lamps.filter(
        (item) => item.operatingState === LampOperatingState.ACTIVE,
      ).length,
      preLightLamps: snapshot.lamps.filter(
        (item) => item.operatingState === LampOperatingState.PRE_LIGHT,
      ).length,
      standbyLamps: snapshot.lamps.filter(
        (item) => item.operatingState === LampOperatingState.STANDBY,
      ).length,
      offLamps: snapshot.lamps.filter((item) => item.operatingState === LampOperatingState.OFF)
        .length,
      totalSensors: snapshot.sensors.length,
      healthySensors: snapshot.sensors.filter((item) => item.health === SensorHealth.HEALTHY)
        .length,
      warningSensors: snapshot.sensors.filter((item) => item.health === SensorHealth.WARNING)
        .length,
      faultSensors: snapshot.sensors.filter((item) => item.health === SensorHealth.FAULT).length,
      unknownSensors: snapshot.sensors.filter((item) => item.health === SensorHealth.UNKNOWN)
        .length,
      activeAlerts: activeAlerts.length,
      highestAlertSeverity: highestSeverity(activeAlerts.map((alert) => alert.severity)),
    },
    nodes,
    lamps,
    sensors,
    alerts,
  };
}

export function createValidatedOverviewModel(input: unknown): OverviewModel {
  return createOverviewModel(SystemSnapshotSchema.parse(input));
}
