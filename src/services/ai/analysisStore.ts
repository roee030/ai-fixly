import { aiAnalysisService } from './index';
import type { AIAnalysisResult } from './types';
import { ContentModerationError } from './geminiAnalysis';
import { logger } from '../logger';

/**
 * Tiny module-scope store that holds a single in-flight AI analysis so the
 * capture screen can kick it off the moment the user taps "send", and the
 * confirm screen — which mounts seconds later — can consume the same
 * result instead of firing the call again.
 *
 * Lifecycle:
 *   1. startAnalysis({ images, text, requestKey })
 *        → fires aiAnalysisService.analyzeIssue(), stashes the promise.
 *   2. awaitAnalysis(requestKey)
 *        → returns the resolved result / throws the resolved error.
 *   3. clearAnalysis()
 *        → wipes the slot. Call when the user backs out or submits, so
 *          the next request starts from a clean slate.
 *
 * `requestKey` is any string the caller picks (we use a Date.now() stamp
 * from capture) and is used to detect stale reads: if the capture screen
 * is reused for a new problem, the prior analysis is invalidated.
 *
 * This is deliberately module-scope / global. One capture flow at a time
 * on a single device, no concurrent users.
 */

interface PendingAnalysis {
  key: string;
  startedAt: number;
  payloadKB: number;
  imageCount: number;
  /** The promise callers await. */
  promise: Promise<AIAnalysisResult>;
}

let pending: PendingAnalysis | null = null;

export interface StartAnalysisInput {
  /** Stable key the confirm screen will use to retrieve the same promise. */
  requestKey: string;
  /** Already-resized, already-base64 encoded images. */
  base64Images: string[];
  textDescription: string;
  /** Optional total payload size in KB for perf logging. */
  payloadKB?: number;
}

export function startAnalysis(input: StartAnalysisInput): Promise<AIAnalysisResult> {
  // Don't re-fire an identical key — idempotent so StrictMode / navigation
  // double-calls don't double the cost.
  if (pending && pending.key === input.requestKey) {
    return pending.promise;
  }
  const t0 = Date.now();
  logger.info('[perf] analysis.start', {
    key: input.requestKey,
    imgs: String(input.base64Images.length),
    payloadKB: String(input.payloadKB ?? '?'),
  });
  const promise = aiAnalysisService
    .analyzeIssue({
      images: input.base64Images,
      textDescription: input.textDescription,
    })
    .then((result) => {
      logger.info('[perf] analysis.done', {
        key: input.requestKey,
        ms: String(Date.now() - t0),
        professions: String(result.professions?.join(',') || '?'),
      });
      return result;
    })
    .catch((err) => {
      const ms = Date.now() - t0;
      if (err instanceof ContentModerationError) {
        logger.warn('[perf] analysis.blocked', {
          key: input.requestKey,
          ms: String(ms),
          category: err.category,
        });
      } else {
        logger.error('[perf] analysis.failed', err as Error);
      }
      throw err;
    });

  pending = {
    key: input.requestKey,
    startedAt: t0,
    payloadKB: input.payloadKB ?? 0,
    imageCount: input.base64Images.length,
    promise,
  };
  return promise;
}

export function awaitAnalysis(requestKey: string): Promise<AIAnalysisResult> | null {
  if (!pending || pending.key !== requestKey) return null;
  return pending.promise;
}

export function clearAnalysis(): void {
  pending = null;
}

/** Inspect the current slot (for debugging / future telemetry). */
export function peekAnalysis(): Readonly<PendingAnalysis> | null {
  return pending;
}
