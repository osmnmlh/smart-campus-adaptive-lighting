import { vi } from 'vitest';
import { fetchInitialLiveData } from '@/features/live-data/live-http-client';
import { createSimulatedLiveDataState } from '@/features/live-data/live-data-state';
import { overviewSnapshot } from '@/features/overview/overview-fixture';
import { simulatedEnergySummary } from '@/features/metrics/energy-fixture';

const state = createSimulatedLiveDataState();

function response(data: unknown, ok = true, status = 200) {
  return { ok, status, json: vi.fn(async () => data) };
}

describe('fetchInitialLiveData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and validates all four REST resources', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ data: overviewSnapshot, meta: {} }))
      .mockResolvedValueOnce(response({ data: state.alerts, meta: {} }))
      .mockResolvedValueOnce(response({ data: state.logs, meta: {} }))
      .mockResolvedValueOnce(response({ data: simulatedEnergySummary, meta: {} }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchInitialLiveData(
      'http://localhost:3101',
      new AbortController().signal,
    );
    expect(result.snapshot).toEqual(overviewSnapshot);
    expect(result.alerts).toHaveLength(state.alerts.length);
    expect(result.logs).toHaveLength(state.logs.length);
    expect(result.energySummary).toEqual(simulatedEnergySummary);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('requests bounded all-history lists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ data: overviewSnapshot }))
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ data: simulatedEnergySummary }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchInitialLiveData('http://localhost:3101', new AbortController().signal);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([
        'http://localhost:3101/api/v1/alerts?timeRange=all&limit=100',
        'http://localhost:3101/api/v1/logs?timeRange=all&limit=100',
        'http://localhost:3101/api/v1/energy/summary',
      ]),
    );
  });

  it('rejects a non-success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, false, 503)));
    await expect(
      fetchInitialLiveData('http://localhost:3101', new AbortController().signal),
    ).rejects.toThrow('status 503');
  });

  it('rejects an invalid response envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ snapshot: overviewSnapshot })));
    await expect(
      fetchInitialLiveData('http://localhost:3101', new AbortController().signal),
    ).rejects.toThrow('envelope');
  });

  it('rejects a payload that fails shared contract validation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { invalid: true } })));
    await expect(
      fetchInitialLiveData('http://localhost:3101', new AbortController().signal),
    ).rejects.toThrow('contract validation');
  });

  it('propagates cancellation to every request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(true);
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      fetchInitialLiveData('http://localhost:3101', controller.signal),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
