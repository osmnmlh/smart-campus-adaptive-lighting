import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricsDataTable } from '@/components/metrics/metrics-data-table';
import { createMetricsDashboardModel } from '@/features/metrics/metrics-adapter';
import { metricsTelemetryFixture } from '@/features/metrics/metrics-fixture';
import {
  ambientMetricSeries,
  lampMetricSeries,
  metricsTableRows,
  sensorActivityMetricSeries,
} from '@/features/metrics/metrics-selectors';

const model = createMetricsDashboardModel(metricsTelemetryFixture);
const rows = metricsTableRows(
  lampMetricSeries(model, 'lamp-2', '5m'),
  ambientMetricSeries(model, '5m'),
  sensorActivityMetricSeries(model, 'sensor-ir-2', '5m'),
);

describe('MetricsDataTable', () => {
  it('renders semantic headers and a caption', () => {
    render(<MetricsDataTable rows={rows} caption="L2 and IR2 selected metrics" />);
    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.getByText('L2 and IR2 selected metrics')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Timestamp' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Metric' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Unit' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Data source' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Metric quality' })).toBeVisible();
  });

  it('shows timestamp, value, unit, source, and quality text', () => {
    render(<MetricsDataTable rows={rows} caption="Selected metrics" />);
    expect(screen.getAllByText('2026-06-15 20:30 UTC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SIMULATED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GOOD').length).toBeGreaterThan(0);
  });

  it('marks stale and invalid rows with visible text', () => {
    render(<MetricsDataTable rows={rows} caption="Selected metrics" />);
    expect(screen.getAllByText('STALE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('INVALID').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('tr[data-quality="stale"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('tr[data-quality="invalid"]').length).toBe(1);
  });

  it('renders a safe empty table state', () => {
    render(<MetricsDataTable rows={[]} caption="Empty metrics" />);
    expect(screen.getByRole('heading', { name: 'Accessible metric data' })).toBeVisible();
    expect(screen.getByText('No metric rows are available for this selection.')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
