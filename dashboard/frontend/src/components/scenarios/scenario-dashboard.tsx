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

export function ScenarioErrorNotice({ error }: Readonly<{ error: ScenarioTransitionError }>) {
  return (
    <div className="scenario-error" role="status" aria-live="polite">
      <strong>{error.code}</strong>
      <span>{error.message}</span>
    </div>
  );
}

export function ScenarioDashboard() {
  const [state, dispatch] = useReducer(scenarioControllerReducer, undefined, () =>
    createScenarioControllerState(null),
  );
  const snapshot = selectSnapshotPreview(state);
  const selectionLocked = state.lifecycle === 'RUNNING' || state.lifecycle === 'PAUSED';

  return (
    <div className="scenario-dashboard">
      <header className="scenario-header">
        <div>
          <p className="eyebrow">Frontend-only scenario workspace</p>
          <h1>Scenario Controls</h1>
          <p>
            Inspect deterministic mock behavior with an explicit virtual clock and no live system
            connection.
          </p>
        </div>
        <div className="scenario-header-state">
          <span>Lifecycle</span>
          <strong aria-live="polite">{state.lifecycle}</strong>
        </div>
      </header>

      <aside className="scenario-local-warning" aria-label="Local simulation notice">
        <strong>Local simulation only</strong>
        <p>
          These controls do not send commands to devices, backend services, MQTT, or WebSocket
          endpoints.
        </p>
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
          <p className="eyebrow">No scenario selected</p>
          <h2 id="scenario-empty-title">Choose a simulated scenario to begin</h2>
          <p>The catalog remains local, deterministic, and disconnected from production devices.</p>
        </section>
      ) : null}
      <ScenarioControls lifecycle={state.lifecycle} speed={state.speed} dispatch={dispatch} />

      <ScenarioStage state={state} />

      <div className="scenario-two-column">
        <ScenarioProgress state={state} />
        <DisclosurePanel
          title="Scenario snapshot details"
          description="Inspect the complete deterministic state and entity breakdown."
          className="scenario-snapshot-disclosure"
        >
          <ScenarioSnapshotPreview snapshot={snapshot} />
        </DisclosurePanel>
      </div>
      <ScenarioEventList events={state.recentEvents} />
    </div>
  );
}
