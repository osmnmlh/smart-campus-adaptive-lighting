import {
  RealtimeServerMessageV1Schema,
  type RealtimeServerMessageV1,
} from '@smart-campus/contracts';

export type RealtimeClientCallbacks = Readonly<{
  onConnecting: (reconnecting: boolean) => void;
  onMessage: (message: RealtimeServerMessageV1) => void;
  onClosed: (reconnecting: boolean) => void;
}>;

type WebSocketFactory = (url: string) => WebSocket;
type TimerApi = Readonly<{
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (timerId: number) => void;
}>;

const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000] as const;

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private stopped = false;

  constructor(
    private readonly url: string,
    private readonly callbacks: RealtimeClientCallbacks,
    private readonly createSocket: WebSocketFactory = (socketUrl) => new WebSocket(socketUrl),
    private readonly timerApi: TimerApi = {
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (timerId) => window.clearTimeout(timerId),
    },
    private readonly isOnline: () => boolean = () => navigator.onLine,
  ) {}

  start(): void {
    if (this.stopped || this.socket !== null || this.reconnectTimer !== null) return;
    this.connect(false);
  }

  notifyOnline(): void {
    if (this.stopped || this.socket !== null || this.reconnectTimer !== null) return;
    this.connect(this.reconnectAttempt > 0);
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      this.timerApi.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket !== null) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
  }

  private connect(reconnecting: boolean): void {
    if (this.stopped || !this.isOnline()) {
      this.callbacks.onClosed(false);
      return;
    }
    this.callbacks.onConnecting(reconnecting);
    let socket: WebSocket;
    try {
      socket = this.createSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {};
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      let value: unknown;
      try {
        value = JSON.parse(event.data);
      } catch {
        return;
      }
      const parsed = RealtimeServerMessageV1Schema.safeParse(value);
      if (parsed.success) {
        if (parsed.data.messageType === 'SERVER_READY') this.reconnectAttempt = 0;
        this.callbacks.onMessage(parsed.data);
      }
    };
    socket.onerror = () => {
      // Browsers follow an error with close; close owns reconnect scheduling.
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== null) return;
    if (!this.isOnline()) {
      this.callbacks.onClosed(false);
      return;
    }
    const delay =
      RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)] ?? 10_000;
    this.reconnectAttempt += 1;
    this.callbacks.onClosed(true);
    this.reconnectTimer = this.timerApi.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(true);
    }, delay);
  }
}
