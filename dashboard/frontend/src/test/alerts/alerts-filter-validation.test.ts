import { describe, expect, it } from 'vitest';
import { parseAlertFilters } from '@/features/alerts/alerts-filter-validation';
import { DEFAULT_ALERT_FILTERS } from '@/features/alerts/alerts-model';

const entities = ['node-1', 'sensor-ir-2'] as const;

describe('parseAlertFilters', () => {
  it('accepts the default filter payload', () => {
    expect(parseAlertFilters(DEFAULT_ALERT_FILTERS, entities)).toEqual({
      ok: true,
      filters: DEFAULT_ALERT_FILTERS,
    });
  });
  it('accepts a fully selected valid payload', () => {
    const filters = {
      severity: 'CRITICAL',
      status: 'ACTIVE',
      entityId: 'node-1',
      timeRange: '15m',
    };
    expect(parseAlertFilters(filters, entities)).toEqual({ ok: true, filters });
  });
  it.each([null, undefined, 'filters', 1, []])('rejects non-object payload %s', (payload) => {
    expect(parseAlertFilters(payload, entities)).toMatchObject({ ok: false });
  });
  it.each(['SEVERE', '', 7, null])('rejects unknown severity %s', (severity) => {
    expect(parseAlertFilters({ ...DEFAULT_ALERT_FILTERS, severity }, entities)).toEqual({
      ok: false,
      message: 'Select a supported alert severity.',
    });
  });
  it.each(['ACKNOWLEDGED', '', 7])('rejects unknown status %s', (status) => {
    expect(parseAlertFilters({ ...DEFAULT_ALERT_FILTERS, status }, entities)).toEqual({
      ok: false,
      message: 'Select a supported alert status.',
    });
  });
  it.each(['node-99', '', 7])('rejects unavailable entity %s', (entityId) => {
    expect(parseAlertFilters({ ...DEFAULT_ALERT_FILTERS, entityId }, entities)).toEqual({
      ok: false,
      message: 'Select an entity from the simulated dataset.',
    });
  });
  it.each(['30m', '', 7])('rejects unknown time range %s', (timeRange) => {
    expect(parseAlertFilters({ ...DEFAULT_ALERT_FILTERS, timeRange }, entities)).toEqual({
      ok: false,
      message: 'Select a supported deterministic time range.',
    });
  });
});
