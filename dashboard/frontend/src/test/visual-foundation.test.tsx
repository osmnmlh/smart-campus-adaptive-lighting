import { render, screen } from '@testing-library/react';
import { DataSource } from '@smart-campus/contracts';
import { Info } from 'lucide-react';
import { GaugeMeter } from '@/components/ui/gauge-meter';
import { createGaugeMeterModel } from '@/components/ui/gauge-meter-model';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';

describe('StatusBadge visual foundation', () => {
  it.each<StatusTone>(['ready', 'pending', 'neutral', 'warning', 'critical'])(
    'renders a decorative default icon for %s',
    (tone) => {
      const { container } = render(<StatusBadge label={`${tone} status`} tone={tone} />);
      const badge = screen.getByText(`${tone} status`).closest('.status-badge');
      const icon = badge?.querySelector('svg.status-indicator');

      expect(badge).toHaveAttribute('data-tone', tone);
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
      expect(container.querySelectorAll('svg')).toHaveLength(1);
    },
  );

  it('preserves visible status text and the existing class contract', () => {
    render(<StatusBadge label="Ready for review" tone="ready" />);
    const badge = screen.getByText('Ready for review').closest('span.status-badge');

    expect(badge).toBeVisible();
    expect(badge).toHaveAttribute('data-tone', 'ready');
    expect(badge?.querySelector('.status-indicator')).not.toBeNull();
  });

  it('supports a decorative icon override without adding it to the accessibility tree', () => {
    render(<StatusBadge label="Custom status" tone="pending" icon={Info} />);

    const badge = screen.getByText('Custom status').closest('.status-badge');
    expect(badge?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(badge?.querySelector('svg')).toHaveAttribute('focusable', 'false');
    expect(screen.getByText('Custom status')).toBeVisible();
  });
});

describe('GaugeMeter model', () => {
  it.each([
    [0, 100, 0],
    [35, 100, 35],
    [100, 100, 100],
    [25, 50, 50],
  ])('maps value %s of max %s to %s percent', (value, max, expectedPercent) => {
    const model = createGaugeMeterModel(value, max);
    expect(model.valid).toBe(true);
    if (model.valid) expect(model.percent).toBe(expectedPercent);
  });

  it.each([
    [10, 0, 'Maximum must be above zero.'],
    [10, -1, 'Maximum must be above zero.'],
    [Number.NaN, 100, 'Value must be finite.'],
    [Number.POSITIVE_INFINITY, 100, 'Value must be finite.'],
    [-1, 100, 'Value cannot be negative.'],
    [101, 100, 'Value exceeds maximum.'],
  ])('returns a safe unavailable state for value %s and max %s', (value, max, reason) => {
    expect(createGaugeMeterModel(value, max)).toEqual({
      valid: false,
      displayValue: 'Unavailable',
      reason,
    });
  });

  it('produces deterministic SVG stroke values', () => {
    expect(createGaugeMeterModel(60, 100)).toEqual(createGaugeMeterModel(60, 100));
  });
});

describe('GaugeMeter component', () => {
  it('exposes meter semantics, visible unit, label, and source', () => {
    render(
      <GaugeMeter
        value={60}
        max={100}
        label="Brightness"
        unit="%"
        dataSource={DataSource.SIMULATED}
      />,
    );

    const meter = screen.getByRole('meter', { name: 'Brightness: 60%' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByText('60%')).toBeVisible();
    expect(screen.getByText('Brightness')).toBeVisible();
    expect(screen.getByText('Source: SIMULATED')).toBeVisible();
  });

  it('keeps estimated provenance distinct from measured provenance', () => {
    render(
      <GaugeMeter value={30} max={100} label="Target" unit="%" dataSource={DataSource.ESTIMATED} />,
    );

    expect(screen.getByText('Source: ESTIMATED')).toBeVisible();
    expect(screen.queryByText('Source: MEASURED')).not.toBeInTheDocument();
  });

  it('supports a custom maximum without changing the visible value', () => {
    render(<GaugeMeter value={25} max={50} label="Duty range" unit="%" />);
    const meter = screen.getByRole('meter', { name: 'Duty range: 25%' });

    expect(meter).toHaveAttribute('aria-valuemax', '50');
    expect(meter).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('25%')).toBeVisible();
  });

  it('renders an explicit unavailable status instead of clamping invalid input', () => {
    render(
      <GaugeMeter
        value={120}
        max={100}
        label="Brightness"
        unit="%"
        dataSource={DataSource.SIMULATED}
      />,
    );

    expect(screen.getByRole('status')).toHaveAttribute('data-valid', 'false');
    expect(screen.getByText('Unavailable')).toBeVisible();
    expect(screen.getByText('Value exceeds maximum.')).toBeVisible();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('keeps its SVG decorative because the containing meter owns the semantics', () => {
    const { container } = render(<GaugeMeter value={0} max={100} label="Brightness" unit="%" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(container.querySelector('.gauge-meter-progress')).not.toBeNull();
  });
});
