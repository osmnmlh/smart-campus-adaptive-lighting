import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';

import { RealtimeConnectionRegistry } from '../../src/realtime/transport/realtime-connection.registry.js';

const client = (): WebSocket => ({}) as WebSocket;

describe('RealtimeConnectionRegistry', () => {
  it('registers a new connection once', () => {
    const registry = new RealtimeConnectionRegistry();
    const socket = client();
    expect(registry.register(socket)).toBe(true);
    expect(registry.register(socket)).toBe(false);
  });

  it('tracks active connection count', () => {
    const registry = new RealtimeConnectionRegistry();
    registry.register(client());
    registry.register(client());
    expect(registry.activeCount).toBe(2);
  });

  it('increments invalid message count per connection', () => {
    const registry = new RealtimeConnectionRegistry();
    const socket = client();
    registry.register(socket);
    expect(registry.incrementInvalidMessageCount(socket)).toBe(1);
    expect(registry.incrementInvalidMessageCount(socket)).toBe(2);
  });

  it('does not create state while incrementing an unknown connection', () => {
    const registry = new RealtimeConnectionRegistry();
    expect(registry.incrementInvalidMessageCount(client())).toBe(0);
    expect(registry.activeCount).toBe(0);
  });

  it('unsubscribes when a connection is removed', () => {
    const registry = new RealtimeConnectionRegistry();
    const socket = client();
    const unsubscribe = vi.fn();
    registry.register(socket);
    registry.attachSubscription(socket, unsubscribe);
    registry.remove(socket);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('unsubscribes the previous subscription when it is replaced', () => {
    const registry = new RealtimeConnectionRegistry();
    const socket = client();
    const first = vi.fn();
    registry.register(socket);
    registry.attachSubscription(socket, first);
    registry.attachSubscription(socket, vi.fn());
    expect(first).toHaveBeenCalledOnce();
  });

  it('immediately unsubscribes a subscription for an unknown connection', () => {
    const registry = new RealtimeConnectionRegistry();
    const unsubscribe = vi.fn();
    registry.attachSubscription(client(), unsubscribe);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('makes repeated removal idempotent', () => {
    const registry = new RealtimeConnectionRegistry();
    const socket = client();
    const unsubscribe = vi.fn();
    registry.register(socket);
    registry.attachSubscription(socket, unsubscribe);
    registry.remove(socket);
    registry.remove(socket);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(registry.activeCount).toBe(0);
  });
});
