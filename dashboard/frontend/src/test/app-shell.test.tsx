import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';
import { AppShell } from '@/components/app-shell';
import { StatusBadge } from '@/components/ui/status-badge';

describe('AppShell', () => {
  it('başlığı ve ana içeriği render eder', () => {
    render(
      <AppShell>
        <p>Test içeriği</p>
      </AppShell>,
    );

    expect(screen.getByText('Smart Campus Adaptive Lighting Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Test içeriği');
  });

  it('StatusBadge durum bilgisini metin etiketiyle gösterir', () => {
    render(<StatusBadge label="Hazır" tone="ready" />);

    expect(screen.getByText('Hazır')).toBeVisible();
  });

  it('backend bağlantısının henüz aktif olmadığını gösterir', () => {
    render(<HomePage />);

    expect(screen.getByText(/backend connection is not active yet/i)).toBeVisible();
  });

  it('uydurma enerji veya finansal ölçüm göstermez', () => {
    render(<HomePage />);

    expect(screen.queryByText(/kwh|watt|energy saving|maliyet|cost/i)).not.toBeInTheDocument();
  });
});
