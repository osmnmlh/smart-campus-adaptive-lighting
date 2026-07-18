import type {
  AlertCode,
  AlertSeverity,
  AlertStatus,
  DataSource,
  EntityType,
} from '@smart-campus/contracts';
import type { TimeRange } from '@/features/activity/activity-model';

export type AlertRecord = Readonly<{
  id: string;
  code: AlertCode;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  entityType: EntityType;
  entityId: string;
  createdAt: string;
  resolvedAt: string | null;
  scenarioId: string | null;
  dataSource: DataSource;
  sequence: number;
  probableCause: string;
  recommendedAction: string;
}>;

export type AlertSeverityFilter = 'ALL' | AlertSeverity;
export type AlertStatusFilter = 'ALL' | AlertStatus;

export type AlertFilters = Readonly<{
  severity: AlertSeverityFilter;
  status: AlertStatusFilter;
  entityId: 'ALL' | string;
  timeRange: TimeRange;
}>;

export const DEFAULT_ALERT_FILTERS: AlertFilters = {
  severity: 'ALL',
  status: 'ALL',
  entityId: 'ALL',
  timeRange: 'all',
};

export type AlertSummary = Readonly<{
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  latestAlertTimestamp: string | null;
}>;
