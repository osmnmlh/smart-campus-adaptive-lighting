import type { ScenarioEvent } from '@smart-campus/contracts';
import { DEFAULT_SCENARIO_ID, getScenarioDefinition } from './scenario-fixtures';
import { formatEventType } from './scenario-formatters';
import {
  isSensorEvent,
  type PresentationEvent,
  type ScenarioControllerAction,
  type ScenarioControllerState,
  type ScenarioId,
} from './scenario-model';

const MAX_RECENT_EVENTS = 10;

const appendEvent = (
  recentEvents: readonly PresentationEvent[],
  nextEvent: PresentationEvent,
): readonly PresentationEvent[] => [...recentEvents, nextEvent].slice(-MAX_RECENT_EVENTS);

const lifecycleEvent = (
  state: ScenarioControllerState,
  type: string,
  label: string,
): PresentationEvent => ({
  id: `${state.selectedScenarioId ?? 'scenario'}-presentation-${state.presentationSequence + 1}`,
  atMs: state.elapsedMs,
  type,
  label,
  detail: `Lifecycle changed to ${label.toUpperCase()}.`,
});

const presentationEvent = (
  state: ScenarioControllerState,
  event: ScenarioEvent,
): PresentationEvent => ({
  id: `${state.selectedScenarioId ?? 'scenario'}-presentation-${state.presentationSequence + 1}`,
  atMs: event.atMs,
  type: event.type,
  label: event.label,
  detail:
    'target' in event && event.target !== undefined
      ? `${formatEventType(event.type)} · ${event.target.entityId}`
      : formatEventType(event.type),
});

export function createScenarioControllerState(
  scenarioId: ScenarioId | null = DEFAULT_SCENARIO_ID,
): ScenarioControllerState {
  if (scenarioId === null) {
    return {
      definition: null,
      selectedScenarioId: null,
      lifecycle: 'IDLE',
      speed: 1,
      elapsedMs: 0,
      activeSensorIds: [],
      offlineNodeIds: [],
      processedEventCount: 0,
      presentationSequence: 0,
      recentEvents: [],
      errorMessage: null,
    };
  }

  try {
    return {
      definition: getScenarioDefinition(scenarioId),
      selectedScenarioId: scenarioId,
      lifecycle: 'READY',
      speed: 1,
      elapsedMs: 0,
      activeSensorIds: [],
      offlineNodeIds: [],
      processedEventCount: 0,
      presentationSequence: 0,
      recentEvents: [],
      errorMessage: null,
    };
  } catch {
    return {
      ...createScenarioControllerState(null),
      lifecycle: 'ERROR',
      errorMessage: 'The selected local scenario could not be loaded.',
    };
  }
}

const applyEvent = (
  state: ScenarioControllerState,
  event: ScenarioEvent,
  index: number,
): ScenarioControllerState => {
  let activeSensorIds = [...state.activeSensorIds];
  let offlineNodeIds = [...state.offlineNodeIds];

  if (isSensorEvent(event)) {
    activeSensorIds = activeSensorIds.filter((sensorId) => sensorId !== event.target.entityId);
    if (event.type === 'SENSOR_ACTIVATED') activeSensorIds.push(event.target.entityId);
  }

  if (event.type === 'SET_NODE_ONLINE') {
    offlineNodeIds = offlineNodeIds.filter((nodeId) => nodeId !== event.target.entityId);
    if (!event.payload.online) offlineNodeIds.push(event.target.entityId);
  }

  return {
    ...state,
    activeSensorIds,
    offlineNodeIds,
    processedEventCount: index + 1,
    presentationSequence: state.presentationSequence + 1,
    recentEvents: appendEvent(state.recentEvents, presentationEvent(state, event)),
  };
};

const advance = (state: ScenarioControllerState, baseDeltaMs: number): ScenarioControllerState => {
  if (state.lifecycle !== 'RUNNING' || state.definition === null) return state;

  const targetMs = Math.min(
    state.definition.durationMs,
    state.elapsedMs + Math.round(baseDeltaMs * state.speed),
  );
  let next: ScenarioControllerState = state;

  state.definition.events.forEach((event, index) => {
    if (index >= state.processedEventCount && event.atMs <= targetMs) {
      next = applyEvent(next, event, index);
    }
  });

  next = { ...next, elapsedMs: targetMs };
  if (targetMs === state.definition.durationMs) {
    next = {
      ...next,
      lifecycle: 'COMPLETED',
      presentationSequence: next.presentationSequence + 1,
      recentEvents: appendEvent(
        next.recentEvents,
        lifecycleEvent(next, 'SCENARIO_COMPLETED', 'completed'),
      ),
    };
  }
  return next;
};

export function scenarioControllerReducer(
  state: ScenarioControllerState,
  action: ScenarioControllerAction,
): ScenarioControllerState {
  switch (action.type) {
    case 'SELECT_SCENARIO':
      return createScenarioControllerState(action.scenarioId);
    case 'START':
      if (state.lifecycle !== 'READY') return state;
      return {
        ...state,
        lifecycle: 'RUNNING',
        presentationSequence: state.presentationSequence + 1,
        recentEvents: appendEvent(
          state.recentEvents,
          lifecycleEvent(state, 'SCENARIO_STARTED', 'running'),
        ),
      };
    case 'PAUSE':
      if (state.lifecycle !== 'RUNNING') return state;
      return {
        ...state,
        lifecycle: 'PAUSED',
        presentationSequence: state.presentationSequence + 1,
        recentEvents: appendEvent(
          state.recentEvents,
          lifecycleEvent(state, 'SCENARIO_PAUSED', 'paused'),
        ),
      };
    case 'RESUME':
      if (state.lifecycle !== 'PAUSED') return state;
      return {
        ...state,
        lifecycle: 'RUNNING',
        presentationSequence: state.presentationSequence + 1,
        recentEvents: appendEvent(
          state.recentEvents,
          lifecycleEvent(state, 'SCENARIO_RESUMED', 'running'),
        ),
      };
    case 'RESET':
      if (state.selectedScenarioId === null) return createScenarioControllerState(null);
      return createScenarioControllerState(state.selectedScenarioId);
    case 'STEP':
      return advance(state, 1_000);
    case 'ADVANCE':
      return advance(state, 5_000);
    case 'SET_SPEED':
      return { ...state, speed: action.speed };
  }
}
