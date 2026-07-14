import { render, screen } from '@testing-library/react';
import { EnvironmentStatus } from '@/components/environment-status';
import { publicEnv } from '@/lib/env';

describe('EnvironmentStatus', () => {
  it('public API URL değerini gösterir', () => {
    render(<EnvironmentStatus />);

    expect(screen.getByText(publicEnv.apiUrl)).toBeVisible();
  });

  it('public WebSocket URL değerini gösterir', () => {
    render(<EnvironmentStatus />);

    expect(screen.getByText(publicEnv.webSocketUrl)).toBeVisible();
  });
});
