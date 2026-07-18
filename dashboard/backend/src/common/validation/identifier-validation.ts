import { invalidIdentifier } from '../http/api-errors.js';

const ALERT_ID = /^ALERT_SIM_\d{3}$/;
const LOG_ID = /^LOG_SIM_\d{3}$/;
const SCENARIO_ID = /^[a-z]+(?:-[a-z]+)*$/;

const parseIdentifier = (
  value: unknown,
  field: string,
  pattern: RegExp,
  maxLength: number,
): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value ||
    !pattern.test(value)
  ) {
    throw invalidIdentifier(field);
  }
  return value;
};

export const parseAlertId = (value: unknown): string =>
  parseIdentifier(value, 'alertId', ALERT_ID, 13);

export const parseLogId = (value: unknown): string => parseIdentifier(value, 'logId', LOG_ID, 11);

export const parseScenarioId = (value: unknown): string =>
  parseIdentifier(value, 'scenarioId', SCENARIO_ID, 64);
