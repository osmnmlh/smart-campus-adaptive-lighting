import { fireEvent, render, screen, within } from '@testing-library/react';
import { Info } from 'lucide-react';
import { DisclosurePanel } from '@/components/ui/disclosure-panel';

const renderPanel = (props: Partial<React.ComponentProps<typeof DisclosurePanel>> = {}) =>
  render(
    <DisclosurePanel
      title="Advanced system details"
      description="Show or hide detailed data."
      {...props}
    >
      <p>Preserved technical content</p>
    </DisclosurePanel>,
  );

const details = () => screen.getByText('Advanced system details').closest('details')!;
const summary = () => screen.getByText('Advanced system details').closest('summary')!;

describe('DisclosurePanel', () => {
  it('is closed by default', () => {
    renderPanel();
    expect(details()).not.toHaveAttribute('open');
    expect(screen.getByText('Preserved technical content')).not.toBeVisible();
  });

  it('supports an initially open panel', () => {
    renderPanel({ defaultOpen: true });
    expect(details()).toHaveAttribute('open');
    expect(screen.getByText('Preserved technical content')).toBeVisible();
  });

  it('renders its title and optional description in the summary', () => {
    renderPanel();
    expect(within(summary()).getByText('Advanced system details')).toBeVisible();
    expect(within(summary()).getByText('Show or hide detailed data.')).toBeVisible();
  });

  it('keeps child content mounted while closed', () => {
    renderPanel();
    expect(details()).toContainElement(screen.getByText('Preserved technical content'));
  });

  it('uses native keyboard-focusable details and summary elements', () => {
    renderPanel();
    expect(details().tagName).toBe('DETAILS');
    expect(summary().tagName).toBe('SUMMARY');
    expect(summary().tabIndex).toBe(0);
  });

  it('opens and closes through the native summary control', () => {
    renderPanel();
    fireEvent.click(summary());
    expect(details()).toHaveAttribute('open');
    fireEvent.click(summary());
    expect(details()).not.toHaveAttribute('open');
  });

  it('marks the chevron as decorative and non-focusable', () => {
    const { container } = renderPanel();
    const chevron = container.querySelector('.disclosure-panel__chevron');
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
    expect(chevron).toHaveAttribute('focusable', 'false');
  });

  it('preserves custom panel and content classes', () => {
    const { container } = renderPanel({
      className: 'custom-panel',
      contentClassName: 'custom-content',
    });
    expect(container.querySelector('details')).toHaveClass('disclosure-panel', 'custom-panel');
    expect(container.querySelector('.disclosure-panel__content')).toHaveClass('custom-content');
  });

  it('renders a supplied count without changing the accessible title', () => {
    renderPanel({ count: 12 });
    expect(within(summary()).getByText('12')).toBeVisible();
    expect(within(summary()).getByText('Advanced system details')).toBeVisible();
  });

  it('keeps a supplied icon decorative and exposes the reduced-motion chevron class contract', () => {
    const { container } = renderPanel({ icon: <Info data-testid="panel-icon" /> });
    expect(screen.getByTestId('panel-icon').closest('.disclosure-panel__icon')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(container.querySelector('.disclosure-panel__chevron')).toBeInTheDocument();
  });
});
