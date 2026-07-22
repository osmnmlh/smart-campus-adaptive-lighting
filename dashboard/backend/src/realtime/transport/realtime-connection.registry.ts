import type { WebSocket } from 'ws';

interface ConnectionState {
  invalidMessageCount: number;
  unsubscribe?: () => void;
}

export class RealtimeConnectionRegistry {
  private readonly connections = new Map<WebSocket, ConnectionState>();

  register(client: WebSocket): boolean {
    if (this.connections.has(client)) return false;
    this.connections.set(client, { invalidMessageCount: 0 });
    return true;
  }

  attachSubscription(client: WebSocket, unsubscribe: () => void): void {
    const state = this.connections.get(client);
    if (state === undefined) {
      unsubscribe();
      return;
    }
    state.unsubscribe?.();
    state.unsubscribe = unsubscribe;
  }

  incrementInvalidMessageCount(client: WebSocket): number {
    const state = this.connections.get(client);
    if (state === undefined) return 0;
    state.invalidMessageCount += 1;
    return state.invalidMessageCount;
  }

  remove(client: WebSocket): void {
    const state = this.connections.get(client);
    if (state === undefined) return;
    this.connections.delete(client);
    state.unsubscribe?.();
  }

  get activeCount(): number {
    return this.connections.size;
  }
}
