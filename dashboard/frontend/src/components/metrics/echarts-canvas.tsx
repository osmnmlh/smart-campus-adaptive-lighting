'use client';

import type { EChartsOption, EChartsType } from 'echarts';
import { useEffect, useRef } from 'react';

type EchartsCanvasProps = Readonly<{
  option: EChartsOption | null;
  ariaLabel: string;
  description: string;
  emptyMessage?: string;
}>;

export function EchartsCanvas({
  option,
  ariaLabel,
  description,
  emptyMessage = 'No metric data is available for this selection.',
}: EchartsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const latestOptionRef = useRef<EChartsOption | null>(option);

  useEffect(() => {
    latestOptionRef.current = option;
    if (option && chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true, lazyUpdate: false });
    }
  }, [option]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const resize = () => chartRef.current?.resize();

    void import('echarts').then((echarts) => {
      if (cancelled) return;
      const chart = echarts.init(container, undefined, { renderer: 'canvas' });
      chartRef.current = chart;
      if (latestOptionRef.current) {
        chart.setOption(latestOptionRef.current, { notMerge: true, lazyUpdate: false });
      }

      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
      } else {
        window.addEventListener('resize', resize);
      }
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <figure className="metrics-chart-figure">
      {option ? (
        <div
          ref={containerRef}
          className="metrics-chart-canvas"
          role="img"
          aria-label={ariaLabel}
        />
      ) : (
        <div className="metrics-chart-empty" role="status">
          {emptyMessage}
        </div>
      )}
      <figcaption>{description}</figcaption>
    </figure>
  );
}
