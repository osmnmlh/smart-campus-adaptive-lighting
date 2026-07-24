import { createDashboardDataConfig } from '@/features/live-data/live-data-config';

describe('createDashboardDataConfig', () => {
  it('defaults to simulated mode', () => {
    expect(createDashboardDataConfig({})).toEqual({ ok: true, mode: 'simulated' });
  });

  it('accepts explicit simulated mode without endpoints', () => {
    expect(createDashboardDataConfig({ dataMode: ' simulated ' })).toEqual({
      ok: true,
      mode: 'simulated',
    });
  });

  it('rejects an unknown mode safely', () => {
    const result = createDashboardDataConfig({ dataMode: 'automatic' });
    expect(result.ok).toBe(false);
    expect(result.mode).toBeNull();
  });

  it('uses explicit live endpoints', () => {
    expect(
      createDashboardDataConfig({
        dataMode: 'live',
        httpUrl: 'http://localhost:3101',
        webSocketUrl: 'ws://localhost:3101/ws/v1',
      }),
    ).toEqual({
      ok: true,
      mode: 'live',
      httpUrl: 'http://localhost:3101',
      webSocketUrl: 'ws://localhost:3101/ws/v1',
    });
  });

  it('uses same-origin HTTP when the URL is blank', () => {
    const result = createDashboardDataConfig(
      { dataMode: 'live', httpUrl: '  ', webSocketUrl: 'ws://campus.test/ws/v1' },
      'https://campus.test',
    );
    expect(result).toMatchObject({ ok: true, httpUrl: 'https://campus.test' });
  });

  it('derives a secure same-origin WebSocket URL', () => {
    const result = createDashboardDataConfig(
      { dataMode: 'live', httpUrl: 'https://campus.test' },
      'https://campus.test',
    );
    expect(result).toMatchObject({ ok: true, webSocketUrl: 'wss://campus.test/ws/v1' });
  });

  it('derives an insecure WebSocket URL for an HTTP origin', () => {
    const result = createDashboardDataConfig({ dataMode: 'live' }, 'http://127.0.0.1:3000');
    expect(result).toMatchObject({
      ok: true,
      httpUrl: 'http://127.0.0.1:3000',
      webSocketUrl: 'ws://127.0.0.1:3000/ws/v1',
    });
  });

  it('rejects non-HTTP backend URLs', () => {
    expect(createDashboardDataConfig({ dataMode: 'live', httpUrl: 'file:///tmp/backend' }).ok).toBe(
      false,
    );
  });

  it('rejects credentials embedded in public URLs', () => {
    expect(
      createDashboardDataConfig({
        dataMode: 'live',
        httpUrl: 'https://user:secret@campus.test',
      }).ok,
    ).toBe(false);
  });
});
