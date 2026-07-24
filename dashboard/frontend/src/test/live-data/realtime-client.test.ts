import { vi } from 'vitest';
import { RealtimeClient } from '@/features/live-data/realtime-client';

class FakeSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn();

  emitMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitClose() {
    this.onclose?.();
  }
}

const readyMessage = JSON.stringify({
  messageType: 'SERVER_READY',
  protocolVersion: 1,
  streamId: 'WS_123e4567-e89b-12d3-a456-426614174000',
  cursor: 0,
  serverTime: '2026-06-15T20:30:00.000Z',
  dataMode: 'SIMULATED',
});

describe('RealtimeClient', () => {
  function harness(online = true) {
    const sockets: FakeSocket[] = [];
    const timers: { callback: () => void; delay: number }[] = [];
    const callbacks = {
      onConnecting: vi.fn(),
      onMessage: vi.fn(),
      onClosed: vi.fn(),
    };
    const client = new RealtimeClient(
      'ws://localhost:3101/ws/v1',
      callbacks,
      () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
      {
        setTimeout: (callback, delay) => {
          timers.push({ callback, delay });
          return timers.length;
        },
        clearTimeout: vi.fn(),
      },
      () => online,
    );
    return { client, callbacks, sockets, timers };
  }

  it('opens exactly one socket when start is called repeatedly', () => {
    const test = harness();
    test.client.start();
    test.client.start();
    expect(test.sockets).toHaveLength(1);
    expect(test.callbacks.onConnecting).toHaveBeenCalledWith(false);
  });

  it('accepts a valid shared-contract server message', () => {
    const test = harness();
    test.client.start();
    test.sockets[0]?.emitMessage(readyMessage);
    expect(test.callbacks.onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageType: 'SERVER_READY' }),
    );
  });

  it('ignores malformed JSON and binary frames', () => {
    const test = harness();
    test.client.start();
    test.sockets[0]?.emitMessage('{broken');
    test.sockets[0]?.emitMessage(new ArrayBuffer(4));
    expect(test.callbacks.onMessage).not.toHaveBeenCalled();
  });

  it('schedules 1s, 2s and 5s reconnects before readiness', () => {
    const test = harness();
    test.client.start();
    test.sockets[0]?.emitClose();
    expect(test.timers[0]?.delay).toBe(1_000);
    test.timers[0]?.callback();
    test.sockets[1]?.emitClose();
    expect(test.timers[1]?.delay).toBe(2_000);
    test.timers[1]?.callback();
    test.sockets[2]?.emitClose();
    expect(test.timers[2]?.delay).toBe(5_000);
  });

  it('resets reconnect backoff after SERVER_READY', () => {
    const test = harness();
    test.client.start();
    test.sockets[0]?.emitClose();
    test.timers[0]?.callback();
    test.sockets[1]?.emitMessage(readyMessage);
    test.sockets[1]?.emitClose();
    expect(test.timers[1]?.delay).toBe(1_000);
  });

  it('does not reconnect aggressively while offline', () => {
    const test = harness(false);
    test.client.start();
    expect(test.sockets).toHaveLength(0);
    expect(test.timers).toHaveLength(0);
    expect(test.callbacks.onClosed).toHaveBeenCalledWith(false);
  });

  it('closes its owned socket and prevents reconnect on stop', () => {
    const test = harness();
    test.client.start();
    const socket = test.sockets[0]!;
    test.client.stop();
    expect(socket.close).toHaveBeenCalledOnce();
    socket.emitClose();
    expect(test.timers).toHaveLength(0);
  });
});
