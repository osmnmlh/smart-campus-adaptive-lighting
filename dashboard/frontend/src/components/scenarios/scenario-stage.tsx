'use client';

import { Activity, ArrowLeft, ArrowRight, SunMedium, WifiOff } from 'lucide-react';
import { useId } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  selectScenarioStageViewModel,
  type ScenarioStageLampId,
} from '@/features/scenarios/scenario-stage-model';
import type { ScenarioControllerState } from '@/features/scenarios/scenario-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

const motionX: Readonly<Record<ScenarioStageLampId, number>> = {
  L1: 110,
  L2: 270,
  L3: 450,
  L4: 630,
  L5: 790,
};

export function ScenarioStage({ state }: Readonly<{ state: ScenarioControllerState }>) {
  const { locale, t } = useLocalization();
  const model = selectScenarioStageViewModel(state);
  const titleId = useId();
  const descriptionId = useId();
  const headingId = useId();
  const DirectionIcon = model.direction.arrow === 'left' ? ArrowLeft : ArrowRight;

  return (
    <figure className="scenario-stage" aria-labelledby={headingId}>
      <header className="scenario-stage-header">
        <div>
          <p className="eyebrow">{t('scenarios.stageEyebrow')}</p>
          <h2 id={headingId}>{t('scenarios.stageTitle')}</h2>
          <p>{model.scenarioName}</p>
        </div>
        <StatusBadge label={t('common.simulated')} tone="neutral" />
      </header>

      <div className="scenario-stage-status" aria-label={t('scenarios.sceneStatus')}>
        <span>
          <Activity size={16} aria-hidden="true" focusable="false" />
          {model.motionLabel}
        </span>
        <span>
          {model.direction.arrow === null ? null : (
            <DirectionIcon size={16} aria-hidden="true" focusable="false" />
          )}
          {t('scenarios.direction')}: {model.direction.label}
        </span>
        <span>
          <SunMedium size={16} aria-hidden="true" focusable="false" />
          BH1750: {t('scenarios.ambientLightSensor')}
        </span>
      </div>

      <div className="scenario-stage-scroll" data-responsive-behavior="contained-scroll">
        <svg
          className="scenario-stage-svg"
          viewBox="0 0 900 390"
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
          focusable="false"
        >
          <title id={titleId}>{t('scenarios.stageSvgTitle')}</title>
          <desc id={descriptionId}>{model.summary}</desc>
          <defs aria-hidden="true">
            <marker
              id="scenario-arrow-right"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>

          <rect className="scenario-stage-ground" x="20" y="64" width="860" height="290" rx="18" />
          <path className="scenario-road" d="M 46 238 H 854" />
          <path className="scenario-road-center" d="M 60 276 H 840" />

          {model.nodes.map((node) => (
            <g
              key={node.id}
              className="scenario-node-group"
              data-node-id={node.id}
              data-offline={node.offline ? 'true' : 'false'}
            >
              <rect x={node.x} y="82" width={node.width} height="245" rx="12" />
              <text x={node.x + 14} y="105">
                {node.id} · {displayEnumLabel(locale, node.offline ? 'OFFLINE' : 'ONLINE')}
              </text>
            </g>
          ))}

          <g className="scenario-ambient-sensor" data-active={model.ambientSensor.active}>
            <circle cx="450" cy="46" r="15" />
            <path d="M 450 20 V 12 M 424 46 H 416 M 484 46 H 476 M 432 28 L 426 22 M 468 28 L 474 22" />
            <text x="450" y="25" textAnchor="middle">
              BH1750 · AMBIENT
            </text>
          </g>

          {model.lamps.map((lamp) => (
            <g
              key={lamp.id}
              className="scenario-lamp"
              data-lamp-id={lamp.id}
              data-operating-state={lamp.operatingState}
              data-health={lamp.health}
              data-brightness={lamp.brightnessPercent}
            >
              <circle
                className="scenario-lamp-halo"
                cx={lamp.x}
                cy="158"
                r={lamp.haloRadius}
                opacity={lamp.haloOpacity}
              />
              <path className="scenario-lamp-pole" d={`M ${lamp.x} 170 V 232`} />
              <path className="scenario-lamp-arm" d={`M ${lamp.x} 172 V 150 H ${lamp.x + 18}`} />
              <circle className="scenario-lamp-light" cx={lamp.x + 21} cy="153" r="7" />
              <text className="scenario-lamp-id" x={lamp.x} y="128" textAnchor="middle">
                {lamp.id}
              </text>
              <text className="scenario-lamp-state" x={lamp.x} y="251" textAnchor="middle">
                {displayEnumLabel(locale, lamp.operatingState)}
              </text>
              <text className="scenario-lamp-brightness" x={lamp.x} y="266" textAnchor="middle">
                {t('metrics.brightness', { value: lamp.brightnessPercent })}
              </text>
            </g>
          ))}

          {model.sensors.map((sensor) => (
            <g
              key={sensor.id}
              className={`scenario-sensor${sensor.active ? ' is-active' : ''}`}
              data-sensor-id={sensor.id}
              data-active={sensor.active ? 'true' : 'false'}
            >
              <circle className="scenario-sensor-pulse" cx={sensor.x} cy="303" r="19" />
              <circle className="scenario-sensor-dot" cx={sensor.x} cy="303" r="8" />
              <text x={sensor.x} y="322" textAnchor="middle">
                {sensor.id} · {displayEnumLabel(locale, sensor.active ? 'ACTIVE' : 'INACTIVE')}
              </text>
            </g>
          ))}

          {model.motionLampId === null ? null : (
            <g
              className="scenario-motion-marker"
              data-motion-position={model.motionLampId}
              transform={`translate(${motionX[model.motionLampId]} 0)`}
            >
              <circle cx="0" cy="284" r="12" />
              <path d="M -5 284 H 5 M 0 279 V 289" />
              <text x="0" y="347" textAnchor="middle">
                {t('scenarios.motionDetected')}
              </text>
            </g>
          )}

          {model.direction.arrow === null ? null : (
            <g className="scenario-direction-arrow" data-direction={model.direction.value}>
              <line
                x1={model.direction.arrow === 'right' ? 388 : 512}
                y1="214"
                x2={model.direction.arrow === 'right' ? 512 : 388}
                y2="214"
                markerEnd="url(#scenario-arrow-right)"
              />
              <text x="450" y="202" textAnchor="middle">
                {model.direction.label}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="scenario-stage-node-status" aria-label={t('scenarios.nodeCommunication')}>
        {model.nodes.map((node) => (
          <span key={node.id} data-offline={node.offline ? 'true' : 'false'}>
            {node.offline ? <WifiOff size={15} aria-hidden="true" focusable="false" /> : null}
            {node.id}: {displayEnumLabel(locale, node.offline ? 'OFFLINE' : 'ONLINE')} ·{' '}
            {node.lampIds.join(', ')}
          </span>
        ))}
      </div>

      <figcaption>
        {model.summary} {t('common.source', { source: t('common.simulated') })}.
      </figcaption>
    </figure>
  );
}
