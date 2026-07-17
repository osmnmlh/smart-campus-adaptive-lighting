'use client';

import { useReducer } from 'react';
import { ScenarioControls } from './scenario-controls';
import { ScenarioEventList } from './scenario-event-list';
import { ScenarioProgress } from './scenario-progress';
import { ScenarioSelector } from './scenario-selector';
import { ScenarioSnapshotPreview } from './scenario-snapshot-preview';
import { scenarioCatalog } from '@/features/scenarios/scenario-fixtures';
import {
  createScenarioControllerState,
  scenarioControllerReducer,
} from '@/features/scenarios/scenario-reducer';
import { selectSnapshotPreview } from '@/features/scenarios/scenario-selectors';

export function ScenarioDashboard() {
  const [state, dispatch] = useReducer(scenarioControllerReducer, undefined, () =>
    createScenarioControllerState(),
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

      {state.errorMessage === null ? null : (
        <div className="scenario-error" role="alert">
          {state.errorMessage}
        </div>
      )}

      <ScenarioSelector
        items={scenarioCatalog}
        selectedId={state.selectedScenarioId}
        disabled={selectionLocked}
        onSelect={(scenarioId) => dispatch({ type: 'SELECT_SCENARIO', scenarioId })}
      />
      <ScenarioControls lifecycle={state.lifecycle} speed={state.speed} dispatch={dispatch} />

      <div className="scenario-two-column">
        <ScenarioProgress state={state} />
        <ScenarioSnapshotPreview snapshot={snapshot} />
      </div>
      <ScenarioEventList events={state.recentEvents} />
    </div>
  );
}
