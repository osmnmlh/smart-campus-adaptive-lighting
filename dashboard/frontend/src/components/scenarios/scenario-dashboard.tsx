'use client';

import { useReducer } from 'react';
import { ScenarioControls } from './scenario-controls';
import { ScenarioEventList } from './scenario-event-list';
import { ScenarioProgress } from './scenario-progress';
import { ScenarioSelector } from './scenario-selector';
import { ScenarioSnapshotPreview } from './scenario-snapshot-preview';
import { ScenarioStage } from './scenario-stage';
import { DisclosurePanel } from '@/components/ui/disclosure-panel';
import { scenarioCatalog } from '@/features/scenarios/scenario-fixtures';
import {
  createScenarioControllerState,
  scenarioControllerReducer,
} from '@/features/scenarios/scenario-reducer';
import { selectSnapshotPreview } from '@/features/scenarios/scenario-selectors';
import type { ScenarioTransitionError } from '@/features/scenarios/scenario-model';
import { useLocalization } from '@/features/localization/use-localization';

export function ScenarioErrorNotice({ error }: Readonly<{ error: ScenarioTransitionError }>) {
  return (
    <div className="scenario-error" role="status" aria-live="polite">
      <strong>{error.code}</strong>
      <span>{error.message}</span>
    </div>
  );
}

export function ScenarioDashboard() {
  const { t } = useLocalization();
  const [state, dispatch] = useReducer(scenarioControllerReducer, undefined, () =>
    createScenarioControllerState(null),
  );
  const snapshot = selectSnapshotPreview(state);
  const selectionLocked = state.lifecycle === 'RUNNING' || state.lifecycle === 'PAUSED';

  return (
    <div className="scenario-dashboard">
      <header className="scenario-header">
        <div>
          <p className="eyebrow">{t('scenarios.eyebrow')}</p>
          <h1>{t('scenarios.title')}</h1>
          <p>{t('scenarios.description')}</p>
        </div>
        <div className="scenario-header-state">
          <span>{t('scenarios.lifecycle')}</span>
          <strong aria-live="polite">{state.lifecycle}</strong>
        </div>
      </header>

      <aside className="scenario-local-warning" aria-label={t('scenarios.notice')}>
        <strong>{t('scenarios.localOnly')}</strong>
        <p>{t('scenarios.noCommands')}</p>
      </aside>

      {state.lastError === null ? null : <ScenarioErrorNotice error={state.lastError} />}

      <ScenarioSelector
        items={scenarioCatalog}
        selectedId={state.selectedScenarioId}
        disabled={selectionLocked}
        onSelect={(scenarioId) => dispatch({ type: 'SELECT_SCENARIO', scenarioId })}
      />
      {state.selectedScenarioId === null ? (
        <section className="scenario-initial-empty" aria-labelledby="scenario-empty-title">
          <p className="eyebrow">{t('scenarios.noneSelected')}</p>
          <h2 id="scenario-empty-title">{t('scenarios.chooseToBegin')}</h2>
          <p>{t('scenarios.catalogLocal')}</p>
        </section>
      ) : null}
      <ScenarioControls lifecycle={state.lifecycle} speed={state.speed} dispatch={dispatch} />

      <ScenarioStage state={state} />

      <div className="scenario-two-column">
        <ScenarioProgress state={state} />
        <DisclosurePanel
          title={t('scenarios.snapshotTitle')}
          description={t('scenarios.snapshotDescription')}
          className="scenario-snapshot-disclosure"
        >
          <ScenarioSnapshotPreview snapshot={snapshot} />
        </DisclosurePanel>
      </div>
      <ScenarioEventList events={state.recentEvents} />
    </div>
  );
}
