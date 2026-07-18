import { Direction, type ScenarioEvent } from '@smart-campus/contracts';
import {
  createBaselineLampStates,
  getScenarioCatalogItem,
  isScenarioId,
} from './scenario-fixtures';
import { formatEventType } from './scenario-formatters';
import {
  SCENARIO_SPEEDS,
  isSensorEvent,
  type PresentationEvent,
  type ScenarioActionType,
  type ScenarioControllerState,
  type ScenarioId,
  type ScenarioSpeed,
  type ScenarioTransitionErrorCode,
} from './scenario-model';

const MAX_RECENT_EVENTS = 10;
const SENSOR_ORDER = [
  'sensor-ir-1',
  'sensor-ir-2',
  'sensor-ir-3',
  'sensor-ir-4',
  'sensor-ir-5',
  'sensor-bh1750-1',
] as const;

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

const transitionError = (
  state: ScenarioControllerState,
  action: ScenarioActionType,
  code: ScenarioTransitionErrorCode,
  message: string,
): ScenarioControllerState => ({
  ...state,
  lastError: { code, action, lifecycle: state.lifecycle, message },
});

const invalidTransition = (
  state: ScenarioControllerState,
  action: ScenarioActionType,
): ScenarioControllerState =>
  transitionError(
    state,
    action,
    'INVALID_TRANSITION',
    `${action} is not available while the scenario is ${state.lifecycle}.`,
  );

const createIdleState = (): ScenarioControllerState => ({
  definition: null,
  selectedScenarioId: null,
  lifecycle: 'IDLE',
  speed: 1,
  elapsedMs: 0,
  direction: Direction.NONE,
  lamps: createBaselineLampStates(),
  activeSensorIds: [],
  offlineNodeIds: [],
  processedEventCount: 0,
  presentationSequence: 0,
  recentEvents: [],
  lastError: null,
});

const createReadyState = (
  scenarioId: ScenarioId,
  speed: ScenarioSpeed,
): ScenarioControllerState => {
  const definition = getScenarioCatalogItem(scenarioId).definition;
  return {
    definition,
    selectedScenarioId: scenarioId,
    lifecycle: 'READY',
    speed,
    elapsedMs: 0,
    direction: Direction.NONE,
    lamps: createBaselineLampStates(),
    activeSensorIds: [],
    offlineNodeIds: [],
    processedEventCount: 0,
    presentationSequence: 0,
    recentEvents: [],
    lastError: null,
  };
};

export const createScenarioControllerState = (
  scenarioId: ScenarioId | null = null,
): ScenarioControllerState =>
  scenarioId === null ? createIdleState() : createReadyState(scenarioId, 1);

export const isPlaybackSpeed = (value: unknown): value is ScenarioSpeed =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  (SCENARIO_SPEEDS as readonly number[]).includes(value);

export const selectScenario = (
  state: ScenarioControllerState,
  scenarioId: unknown,
): ScenarioControllerState => {
  if (!isScenarioId(scenarioId)) {
    return transitionError(
      state,
      'SELECT_SCENARIO',
      'UNKNOWN_SCENARIO',
      'The selected local scenario is not available.',
    );
  }

  try {
    return createReadyState(scenarioId, state.speed);
  } catch {
    return transitionError(
      state,
      'SELECT_SCENARIO',
      'SCENARIO_LOAD_FAILED',
      'The selected local scenario could not be loaded.',
    );
  }
};

export const startScenario = (state: ScenarioControllerState): ScenarioControllerState => {
  if (state.lifecycle !== 'READY') return invalidTransition(state, 'START');
  return {
    ...state,
    lifecycle: 'RUNNING',
    presentationSequence: state.presentationSequence + 1,
    recentEvents: appendEvent(
      state.recentEvents,
      lifecycleEvent(state, 'SCENARIO_STARTED', 'running'),
    ),
    lastError: null,
  };
};

export const pauseScenario = (state: ScenarioControllerState): ScenarioControllerState => {
  if (state.lifecycle !== 'RUNNING') return invalidTransition(state, 'PAUSE');
  return {
    ...state,
    lifecycle: 'PAUSED',
    presentationSequence: state.presentationSequence + 1,
    recentEvents: appendEvent(
      state.recentEvents,
      lifecycleEvent(state, 'SCENARIO_PAUSED', 'paused'),
    ),
    lastError: null,
  };
};

export const resumeScenario = (state: ScenarioControllerState): ScenarioControllerState => {
  if (state.lifecycle !== 'PAUSED') return invalidTransition(state, 'RESUME');
  return {
    ...state,
    lifecycle: 'RUNNING',
    presentationSequence: state.presentationSequence + 1,
    recentEvents: appendEvent(
      state.recentEvents,
      lifecycleEvent(state, 'SCENARIO_RESUMED', 'running'),
    ),
    lastError: null,
  };
};

export const resetScenario = (state: ScenarioControllerState): ScenarioControllerState => {
  if (state.selectedScenarioId === null) return { ...createIdleState(), speed: state.speed };
  return createReadyState(state.selectedScenarioId, state.speed);
};

export const setPlaybackSpeed = (
  state: ScenarioControllerState,
  value: unknown,
): ScenarioControllerState => {
  if (!isPlaybackSpeed(value)) {
    return transitionError(
      state,
      'SET_SPEED',
      'INVALID_SPEED',
      'Virtual speed must be 0.5x, 1x, 2x, or 5x.',
    );
  }
  return {
    ...state,
    speed: value,
    lastError: state.lifecycle === 'ERROR' ? state.lastError : null,
  };
};

const sortSensorIds = (sensorIds: readonly string[]): readonly string[] =>
  [...new Set(sensorIds)].sort((left, right) => {
    const leftIndex = SENSOR_ORDER.indexOf(left as (typeof SENSOR_ORDER)[number]);
    const rightIndex = SENSOR_ORDER.indexOf(right as (typeof SENSOR_ORDER)[number]);
    return (
      (leftIndex === -1 ? SENSOR_ORDER.length : leftIndex) -
        (rightIndex === -1 ? SENSOR_ORDER.length : rightIndex) || left.localeCompare(right)
    );
  });

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
    activeSensorIds = [...sortSensorIds(activeSensorIds)];
  }

  if (event.type === 'SET_NODE_ONLINE') {
    offlineNodeIds = offlineNodeIds.filter((nodeId) => nodeId !== event.target.entityId);
    if (!event.payload.online) offlineNodeIds.push(event.target.entityId);
  }

  if (state.selectedScenarioId === null) {
    throw new Error('A loaded scenario must retain its selected scenario ID');
  }
  const item = getScenarioCatalogItem(state.selectedScenarioId);
  const presentationEffect = item.effects[index];

  return {
    ...state,
    activeSensorIds,
    offlineNodeIds,
    lamps: presentationEffect?.lamps?.map((lamp) => ({ ...lamp })) ?? state.lamps,
    direction: presentationEffect?.direction ?? state.direction,
    processedEventCount: index + 1,
    presentationSequence: state.presentationSequence + 1,
    recentEvents: appendEvent(state.recentEvents, presentationEvent(state, event)),
  };
};

export const advanceScenario = (
  state: ScenarioControllerState,
  deltaMs: unknown,
  action: 'STEP' | 'ADVANCE' = 'ADVANCE',
): ScenarioControllerState => {
  if (state.lifecycle !== 'RUNNING' || state.definition === null) {
    return invalidTransition(state, action);
  }
  if (
    typeof deltaMs !== 'number' ||
    !Number.isFinite(deltaMs) ||
    !Number.isInteger(deltaMs) ||
    deltaMs < 0
  ) {
    return transitionError(
      state,
      action,
      'INVALID_DELTA',
      'Virtual time delta must be a non-negative integer number of milliseconds.',
    );
  }
  if (deltaMs === 0) return { ...state, lastError: null };

  const virtualDeltaMs = Math.round(deltaMs * state.speed);
  const targetMs = Math.min(state.definition.durationMs, state.elapsedMs + virtualDeltaMs);
  let next: ScenarioControllerState = { ...state, lastError: null };

  try {
    state.definition.events.forEach((event, index) => {
      if (index >= state.processedEventCount && event.atMs <= targetMs) {
        next = applyEvent(next, event, index);
      }
    });
  } catch {
    return {
      ...state,
      lifecycle: 'ERROR',
      lastError: {
        code: 'SCENARIO_LOAD_FAILED',
        action,
        lifecycle: state.lifecycle,
        message: 'The local scenario could not be processed safely.',
      },
    };
  }

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
