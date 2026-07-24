'use client';

import type { DataSource } from '@smart-campus/contracts';
import type { ReactNode } from 'react';
import { createGaugeMeterModel } from './gauge-meter-model';
import type { StatusTone } from './status-badge';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type GaugeMeterProps = Readonly<{
  value: number;
  max: number;
  label: string;
  unit?: string;
  icon?: ReactNode;
  tone?: StatusTone;
  dataSource?: DataSource;
  description?: string;
  className?: string;
}>;

export function GaugeMeter({
  value,
  max,
  label,
  unit = '',
  icon,
  tone = 'neutral',
  dataSource,
  description,
  className,
}: GaugeMeterProps) {
  const { locale, t } = useLocalization();
  const model = createGaugeMeterModel(value, max);
  const classes = ['gauge-meter', className].filter(Boolean).join(' ');

  if (!model.valid) {
    return (
      <div className={classes} data-tone={tone} data-valid="false" role="status">
        <div className="gauge-meter-heading">
          {icon === undefined ? null : <span aria-hidden="true">{icon}</span>}
          <span>{label}</span>
        </div>
        <strong>{t('common.unavailable')}</strong>
        <small>{model.reason}</small>
        {dataSource === undefined ? null : (
          <span className="data-provenance">
            {t('common.source', { source: displayEnumLabel(locale, dataSource) })}
          </span>
        )}
      </div>
    );
  }

  const accessibleValue = `${label}: ${model.displayValue}${unit}${
    description === undefined ? '' : `. ${description}`
  }`;
  return (
    <div
      className={classes}
      data-tone={tone}
      data-valid="true"
      role="meter"
      aria-label={accessibleValue}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="gauge-meter-visual">
        <svg viewBox="0 0 112 112" aria-hidden="true" focusable="false">
          <circle className="gauge-meter-track" cx="56" cy="56" r="44" />
          <circle
            className="gauge-meter-progress"
            cx="56"
            cy="56"
            r="44"
            style={{
              strokeDasharray: model.strokeDasharray,
              strokeDashoffset: model.strokeDashoffset,
            }}
          />
        </svg>
        <strong className="gauge-meter-value">
          {model.displayValue}
          {unit}
        </strong>
      </div>
      <div className="gauge-meter-copy">
        <div className="gauge-meter-heading">
          {icon === undefined ? null : <span aria-hidden="true">{icon}</span>}
          <span>{label}</span>
        </div>
        {description === undefined ? null : <small>{description}</small>}
        {dataSource === undefined ? null : (
          <span className="data-provenance">
            {t('common.source', { source: displayEnumLabel(locale, dataSource) })}
          </span>
        )}
      </div>
    </div>
  );
}
