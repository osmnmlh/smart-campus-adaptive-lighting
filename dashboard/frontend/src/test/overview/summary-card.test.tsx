import { render, screen } from '@testing-library/react';
import { SummaryCard } from '@/components/dashboard/summary-card';

describe('SummaryCard', () => {
  it('renders metric, detail, and textual status', () => {
    render(
      <SummaryCard
        label="Nodes"
        value={3}
        detail="3 online"
        statusLabel="All connected"
        tone="ready"
      />,
    );

    const card = screen.getByLabelText('Nodes summary');
    expect(card).toBeVisible();
    expect(card).toHaveTextContent('Nodes');
    expect(card).toHaveTextContent('3');
    expect(card).toHaveTextContent('3 online');
    expect(card).toHaveTextContent('All connected');
  });

  it('keeps a useful text label when no status badge is supplied', () => {
    render(<SummaryCard label="Data Source" value="SIMULATED" detail="Simulated fixture" />);

    expect(screen.getByLabelText('Data Source summary')).toHaveTextContent('SIMULATED');
    expect(screen.getByLabelText('Data Source summary')).toHaveTextContent('Simulated fixture');
  });
});
