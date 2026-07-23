import { describe, expect, it } from 'vitest';

import { loadEnvironment } from '../../src/common/config/environment.js';
import {
  OriginMessageDeduplicationStore,
  buildCanonicalFingerprint,
} from '../../src/mqtt/application/origin-message-deduplication.store.js';

const createStore = (capacity = 2) =>
  new OriginMessageDeduplicationStore(loadEnvironment({ MQTT_DEDUP_CAPACITY: String(capacity) }));

describe('OriginMessageDeduplicationStore', () => {
  it('classifies a first message as new', () =>
    expect(createStore().inspect('message-1', { value: 1 }).kind).toBe('NEW'));

  it('classifies the same id and payload as duplicate after remember', () => {
    const store = createStore();
    const first = store.inspect('message-1', { value: 1 });
    store.remember('message-1', first.fingerprint);
    expect(store.inspect('message-1', { value: 1 }).kind).toBe('DUPLICATE');
  });

  it('classifies the same id and different payload as conflict', () => {
    const store = createStore();
    const first = store.inspect('message-1', { value: 1 });
    store.remember('message-1', first.fingerprint);
    expect(store.inspect('message-1', { value: 2 }).kind).toBe('CONFLICT');
  });

  it('canonicalizes object key order deterministically', () => {
    expect(buildCanonicalFingerprint({ a: 1, b: 2 })).toBe(
      buildCanonicalFingerprint({ b: 2, a: 1 }),
    );
  });

  it('canonicalizes nested arrays and objects deterministically', () => {
    expect(buildCanonicalFingerprint({ items: [{ a: 1, b: 2 }] })).toBe(
      buildCanonicalFingerprint({ items: [{ b: 2, a: 1 }] }),
    );
  });

  it('does not mutate fingerprint input', () => {
    const input = { nested: { b: 2, a: 1 } };
    buildCanonicalFingerprint(input);
    expect(Object.keys(input.nested)).toEqual(['b', 'a']);
  });

  it('evicts the oldest entry at capacity', () => {
    const store = createStore(2);
    for (const id of ['first', 'second', 'third']) {
      const inspection = store.inspect(id, { id });
      store.remember(id, inspection.fingerprint);
    }
    expect(store.size).toBe(2);
    expect(store.inspect('first', { id: 'first' }).kind).toBe('NEW');
    expect(store.inspect('second', { id: 'second' }).kind).toBe('DUPLICATE');
  });

  it('does not replace an existing fingerprint', () => {
    const store = createStore();
    const first = store.inspect('message-1', { value: 1 });
    store.remember('message-1', first.fingerprint);
    store.remember('message-1', buildCanonicalFingerprint({ value: 2 }));
    expect(store.inspect('message-1', { value: 1 }).kind).toBe('DUPLICATE');
  });

  it('clears state explicitly', () => {
    const store = createStore();
    const first = store.inspect('message-1', { value: 1 });
    store.remember('message-1', first.fingerprint);
    store.clear();
    expect(store.size).toBe(0);
  });
});
