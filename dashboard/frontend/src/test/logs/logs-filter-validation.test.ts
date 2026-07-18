import { describe, expect, it } from 'vitest';
import { parseLogFilters } from '@/features/logs/logs-filter-validation';
import { DEFAULT_LOG_FILTERS } from '@/features/logs/logs-model';

const entities = ['system', 'lamp-3'] as const;

describe('parseLogFilters', () => {
  it('accepts the default filter payload', () => {
    expect(parseLogFilters(DEFAULT_LOG_FILTERS, entities)).toEqual({
      ok: true,
      filters: DEFAULT_LOG_FILTERS,
    });
  });
  it('accepts a fully selected valid payload', () => {
    const filters = {
      category: 'LAMP',
      level: 'WARNING',
      entityId: 'lamp-3',
      timeRange: '60m',
    };
    expect(parseLogFilters(filters, entities)).toEqual({ ok: true, filters });
  });
  it.each([null, undefined, 'filters', 1, []])('rejects non-object payload %s', (payload) => {
    expect(parseLogFilters(payload, entities)).toMatchObject({ ok: false });
  });
  it.each(['NETWORK', '', 7, null])('rejects unknown category %s', (category) => {
    expect(parseLogFilters({ ...DEFAULT_LOG_FILTERS, category }, entities)).toEqual({
      ok: false,
      message: 'Select a supported log category.',
    });
  });
  it.each(['DEBUG', '', 7])('rejects unknown level %s', (level) => {
    expect(parseLogFilters({ ...DEFAULT_LOG_FILTERS, level }, entities)).toEqual({
      ok: false,
      message: 'Select a supported log level.',
    });
  });
  it.each(['node-99', '', 7])('rejects unavailable entity %s', (entityId) => {
    expect(parseLogFilters({ ...DEFAULT_LOG_FILTERS, entityId }, entities)).toEqual({
      ok: false,
      message: 'Select an entity from the simulated dataset.',
    });
  });
  it.each(['30m', '', 7])('rejects unknown time range %s', (timeRange) => {
    expect(parseLogFilters({ ...DEFAULT_LOG_FILTERS, timeRange }, entities)).toEqual({
      ok: false,
      message: 'Select a supported deterministic time range.',
    });
  });
});
