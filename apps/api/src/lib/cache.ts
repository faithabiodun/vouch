/**
 * Tiny in-process TTL cache. Reports are cached 60s (§13); /stats is never
 * cached. No external dependency — this must not add latency or a failure mode.
 */
interface Entry<T> {
  value: T;
  expires: number;
}

export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();
  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}
