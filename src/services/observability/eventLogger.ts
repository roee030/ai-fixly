import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from '../firestore/imports';
import type { RequestEventType } from '../../types';

/**
 * Writes one event doc to `serviceRequests/{requestId}/events/*` per
 * service call. Fire-and-forget: failures swallow silently so an
 * observability problem never breaks the user's flow.
 *
 * Worker has its own batched implementation in
 * `workers/broker/src/eventLogger.ts`.
 */

export interface ClientEventInput {
  type: RequestEventType;
  ok: boolean;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

async function log(requestId: string, input: ClientEventInput): Promise<void> {
  if (!requestId) return;
  try {
    const db = getFirestore();
    await addDoc(collection(db, 'serviceRequests', requestId, 'events'), {
      ...input,
      startedAt: serverTimestamp(),
    });
  } catch {
    // Never propagate — observability must not break the user's flow.
  }
}

export const eventLogger = { log };
