/**
 * Worker-side event accumulator. Collects per-call events during a
 * broadcast handler, then flushes them all as one Firestore batchWrite
 * inside `ctx.waitUntil(...)` so the HTTP response returns fast.
 *
 * The client has its own per-call logger in
 * `src/services/observability/eventLogger.ts`.
 */

import type { FirestoreClient } from './firestore';

export interface WorkerEvent {
  type: string;
  ok: boolean;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class EventBatcher {
  private events: WorkerEvent[] = [];

  push(ev: WorkerEvent): void {
    this.events.push(ev);
  }

  size(): number {
    return this.events.length;
  }

  async flush(firestore: FirestoreClient, requestId: string): Promise<void> {
    if (this.events.length === 0) return;
    await firestore.batchWriteEvents(requestId, this.events);
    this.events = [];
  }
}
