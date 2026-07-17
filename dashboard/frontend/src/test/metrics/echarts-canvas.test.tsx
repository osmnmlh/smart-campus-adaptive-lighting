import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EchartsCanvas } from '@/components/metrics/echarts-canvas';

const chartMocks = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  init: vi.fn(),
}));

vi.mock('echarts', () => ({
  init: chartMocks.init.mockImplementation(() => ({
    setOption: chartMocks.setOption,
    resize: chartMocks.resize,
    dispose: chartMocks.dispose,
  })),
}));

describe('EchartsCanvas resize lifecycle', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const observerMocks = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
  let resizeCallback: ResizeObserverCallback | null = null;
  const callbackObserver: ResizeObserver = {
    observe() {},
    unobserve() {},
    disconnect() {},
  };

  class LifecycleResizeObserver implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback;
    }

    observe(target: Element) {
      observerMocks.observe(target);
    }

    unobserve(target: Element) {
      observerMocks.unobserve(target);
    }

    disconnect() {
      observerMocks.disconnect();
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resizeCallback = null;
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: LifecycleResizeObserver,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: originalResizeObserver,
    });
  });

  it('observes, resizes, disconnects, disposes, and ignores callbacks after unmount', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const { unmount } = render(
      <EchartsCanvas
        option={{ animation: false }}
        ariaLabel="Resize lifecycle chart"
        description="Resize lifecycle description"
      />,
    );

    const chartContainer = screen.getByRole('img', { name: 'Resize lifecycle chart' });
    await waitFor(() => expect(chartMocks.init).toHaveBeenCalledTimes(1));
    expect(chartMocks.setOption).toHaveBeenCalledTimes(1);
    expect(observerMocks.observe).toHaveBeenCalledWith(chartContainer);
    expect(resizeCallback).not.toBeNull();
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('resize', expect.any(Function));

    act(() => {
      resizeCallback?.([], callbackObserver);
    });
    expect(chartMocks.resize).toHaveBeenCalledTimes(1);

    unmount();
    expect(observerMocks.disconnect).toHaveBeenCalledTimes(1);
    expect(chartMocks.dispose).toHaveBeenCalledTimes(1);

    act(() => {
      resizeCallback?.([], callbackObserver);
    });
    expect(chartMocks.resize).toHaveBeenCalledTimes(1);
  });
});
