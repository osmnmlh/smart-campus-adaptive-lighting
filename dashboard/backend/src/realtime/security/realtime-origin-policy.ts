export class RealtimeOriginPolicy {
  private readonly allowedOrigins: ReadonlySet<string>;

  constructor(allowedOrigins: readonly string[]) {
    this.allowedOrigins = new Set(allowedOrigins);
  }

  isAllowed(origin: string | undefined): boolean {
    return origin !== undefined && this.allowedOrigins.has(origin);
  }
}
