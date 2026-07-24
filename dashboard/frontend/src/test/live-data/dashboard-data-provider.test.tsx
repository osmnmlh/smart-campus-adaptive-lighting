import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  DashboardDataProvider,
  useDashboardData,
} from '@/features/live-data/dashboard-data-provider';
import { createLiveMetricsDashboardState } from '@/features/live-data/live-metrics-adapter';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

function Probe() {
  const state = useDashboardData();
  return <span>{state.transportStatus}</span>;
}

describe('DashboardDataProvider', () => {
  it('performs zero network activity in the default simulated mode', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <DashboardDataProvider>
        <Probe />
      </DashboardDataProvider>,
    );
    expect(screen.getByText('SIMULATED')).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('creates only real browser-session points for live metrics', () => {
    const state = createLiveMetricsDashboardState([overviewSnapshot]);
    expect(state.status).toBe('ready');
    expect(state.model?.lamps[0]?.points).toHaveLength(1);
    expect(state.message).toContain('1 validated snapshot');
  });
});
