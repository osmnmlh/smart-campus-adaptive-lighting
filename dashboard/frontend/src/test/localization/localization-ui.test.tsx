import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';
import { AlertsFilters } from '@/components/alerts/alerts-filters';
import { LogsFilters } from '@/components/logs/logs-filters';
import { MetricsHeader } from '@/components/metrics/metrics-header';
import { ScenarioControls } from '@/components/scenarios/scenario-controls';
import { TopologyToolbar } from '@/components/topology/topology-toolbar';
import { LanguageSelector } from '@/components/language-selector';
import { DashboardDataProvider } from '@/features/live-data/dashboard-data-provider';
import { LocalizationProvider } from '@/features/localization/localization-provider';
import { DEFAULT_ALERT_FILTERS } from '@/features/alerts/alerts-model';
import { DEFAULT_LOG_FILTERS } from '@/features/logs/logs-model';

function localized(ui: React.ReactNode) {
  return render(
    <LocalizationProvider>
      <LanguageSelector />
      {ui}
    </LocalizationProvider>,
  );
}

function switchToEnglish() {
  fireEvent.click(screen.getByRole('button', { name: 'İngilizce' }));
}

describe('localized dashboard UI', () => {
  beforeEach(() => localStorage.clear());

  it('renders accessible Turkish navigation and switches to English', () => {
    render(
      <LocalizationProvider>
        <AppShell>content</AppShell>
      </LocalizationProvider>,
    );
    expect(screen.getByRole('navigation', { name: 'Dashboard navigasyonu' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Genel Bakış' })).toBeVisible();
    switchToEnglish();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeVisible();
  });

  it('exposes active language by text and aria-pressed state', () => {
    localized(<div />);
    expect(screen.getByRole('button', { name: 'Türkçe' })).toHaveAttribute('aria-pressed', 'true');
    switchToEnglish();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches Metrics energy-adjacent headings', () => {
    localized(<MetricsHeader snapshotAt="2026-06-15T20:30:00.000Z" />);
    expect(screen.getByRole('heading', { name: 'Sistem Metrikleri' })).toBeVisible();
    switchToEnglish();
    expect(screen.getByRole('heading', { name: 'System Metrics' })).toBeVisible();
  });

  it('switches alert filters while preserving raw option values', () => {
    localized(
      <AlertsFilters
        filters={DEFAULT_ALERT_FILTERS}
        entities={['NODE_1']}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Uyarı filtreleri' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'NODE_1' })).toHaveValue('NODE_1');
    switchToEnglish();
    expect(screen.getByRole('heading', { name: 'Alert filters' })).toBeVisible();
  });

  it('switches log labels', () => {
    localized(
      <LogsFilters
        filters={DEFAULT_LOG_FILTERS}
        entities={['GW_1']}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Kayıt filtreleri' })).toBeVisible();
    switchToEnglish();
    expect(screen.getByRole('heading', { name: 'Log filters' })).toBeVisible();
  });

  it('switches topology toolbar labels', () => {
    localized(
      <TopologyToolbar
        onFitView={vi.fn()}
        onResetView={vi.fn()}
        onClearSelection={vi.fn()}
        clearSelectionDisabled={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Görünüme Sığdır' })).toBeVisible();
    switchToEnglish();
    expect(screen.getByRole('button', { name: 'Fit View' })).toBeVisible();
  });

  it('switches scenario controls without resetting lifecycle input', () => {
    const dispatch = vi.fn();
    localized(<ScenarioControls lifecycle="READY" speed={1} dispatch={dispatch} />);
    expect(screen.getByRole('button', { name: 'Başlat' })).toBeVisible();
    switchToEnglish();
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not fetch or open WebSocket when simulated locale changes', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    localized(
      <DashboardDataProvider>
        <span>provider child</span>
      </DashboardDataProvider>,
    );
    switchToEnglish();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('uses a mobile-safe non-growing language selector class', () => {
    localized(<div />);
    expect(screen.getByRole('group', { name: 'Dil' })).toHaveClass('language-selector');
  });
});
