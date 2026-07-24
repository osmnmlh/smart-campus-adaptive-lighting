import { render, screen } from '@testing-library/react';
import { AlertSummary } from '@/components/dashboard/alert-summary';
import { createOverviewModel } from '@/features/overview/overview-adapter';
import { overviewSnapshot } from '@/features/overview/overview-fixture';
import type { OverviewAlert } from '@/features/overview/overview-model';

const model = createOverviewModel(overviewSnapshot);

describe('AlertSummary', () => {
  it('renders active count, highest severity, and alert metadata', () => {
    render(<AlertSummary alerts={model.alerts} summary={model.summary} />);

    expect(screen.getByLabelText('Active alert summary')).toHaveTextContent('1 active');
    expect(screen.getByLabelText('Active alert summary')).toHaveTextContent('Warning');
    expect(screen.getByText('Yön doğrulama süresi aşıldı')).toBeVisible();
    expect(screen.getByText('Warning')).toBeVisible();
    expect(screen.getByText(/IR1/)).toBeVisible();
    expect(screen.getByText(/Jun 15, 2026, 8:29 PM UTC/)).toBeVisible();
  });

  it('renders at most three alert rows', () => {
    const template = model.alerts[0] as OverviewAlert;
    const alerts = Array.from({ length: 4 }, (_, index) => ({
      ...template,
      id: `alert-${index}`,
      title: `Mock alert ${index + 1}`,
    }));

    render(
      <AlertSummary
        alerts={alerts}
        summary={{ activeAlerts: 4, highestAlertSeverity: 'WARNING' }}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Mock alert 1')).toBeVisible();
    expect(screen.getByText('Mock alert 3')).toBeVisible();
    expect(screen.queryByText('Mock alert 4')).not.toBeInTheDocument();
  });

  it('renders an accessible empty state when no active alert exists', () => {
    render(
      <AlertSummary alerts={[]} summary={{ activeAlerts: 0, highestAlertSeverity: 'NONE' }} />,
    );

    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No active alerts in this simulated snapshot.',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
