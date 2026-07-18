import { getActivityEntityLabel } from './activity-model';

export const formatActivityTimestamp = (timestamp: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp)) + ' UTC';

export const formatActivityEntity = (entityId: string): string => getActivityEntityLabel(entityId);

export const formatActivityValue = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
