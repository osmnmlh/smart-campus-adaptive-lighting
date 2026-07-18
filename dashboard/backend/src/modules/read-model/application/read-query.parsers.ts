import { AlertSeverity, AlertStatus } from '@smart-campus/contracts';

import { invalidQuery } from '../../../common/http/api-errors.js';
import { parsePagination } from '../../../common/pagination/pagination-parser.js';
import {
  assertAllowedQueryKeys,
  parseOptionalEnum,
  readOptionalQueryString,
} from '../../../common/validation/query-validation.js';
import {
  ACTIVITY_ENTITY_IDS,
  LOG_CATEGORIES,
  LOG_LEVELS,
  TIME_RANGES,
  type ActivityEntityId,
  type AlertListQuery,
  type LogListQuery,
} from '../domain/read-model-models.js';

const ALERT_QUERY_KEYS = ['severity', 'status', 'entityId', 'timeRange', 'offset', 'limit'];
const LOG_QUERY_KEYS = ['category', 'level', 'entityId', 'timeRange', 'offset', 'limit'];

const parseEntityId = (query: Readonly<Record<string, unknown>>): ActivityEntityId | undefined => {
  const entityId = readOptionalQueryString(query, 'entityId');
  if (entityId === undefined) return undefined;
  if (!(ACTIVITY_ENTITY_IDS as readonly string[]).includes(entityId))
    throw invalidQuery('entityId');
  return entityId as ActivityEntityId;
};

export const parseAlertListQuery = (query: Readonly<Record<string, unknown>>): AlertListQuery => {
  assertAllowedQueryKeys(query, ALERT_QUERY_KEYS);
  const severity = parseOptionalEnum(query, 'severity', Object.values(AlertSeverity));
  const status = parseOptionalEnum(query, 'status', Object.values(AlertStatus));
  const entityId = parseEntityId(query);
  return {
    ...parsePagination(query),
    ...(severity === undefined ? {} : { severity }),
    ...(status === undefined ? {} : { status }),
    ...(entityId === undefined ? {} : { entityId }),
    timeRange: parseOptionalEnum(query, 'timeRange', TIME_RANGES) ?? 'all',
  };
};

export const parseLogListQuery = (query: Readonly<Record<string, unknown>>): LogListQuery => {
  assertAllowedQueryKeys(query, LOG_QUERY_KEYS);
  const category = parseOptionalEnum(query, 'category', LOG_CATEGORIES);
  const level = parseOptionalEnum(query, 'level', LOG_LEVELS);
  const entityId = parseEntityId(query);
  return {
    ...parsePagination(query),
    ...(category === undefined ? {} : { category }),
    ...(level === undefined ? {} : { level }),
    ...(entityId === undefined ? {} : { entityId }),
    timeRange: parseOptionalEnum(query, 'timeRange', TIME_RANGES) ?? 'all',
  };
};
