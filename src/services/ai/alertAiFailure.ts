import { logger } from '../logger';

const BROKER_URL = process.env.EXPO_PUBLIC_BROKER_URL || '';

/**
 * Tell the broker that every Gemini model in the fallback chain failed.
 * The broker already has `/feedback/critical` — we piggyback on it so the
 * owner gets a WhatsApp / admin-alert entry the same way user-submitted
 * "something is broken" feedback does.
 *
 * Never throws. If the broker is unreachable (we're offline, Worker is
 * down), silently swallow — the alert is a nice-to-have, not critical
 * path. Logging the error ourselves is pointless because it'd just create
 * a second noise line and the caller has already logged the underlying
 * Gemini failure.
 */
export interface AiFailureReport {
  timings: Array<{ model: string; ms: number; ok: boolean; reason?: string }>;
  payloadKB: number;
  imageCount: number;
  lastError: string;
}

export async function reportAiFullFailure(report: AiFailureReport): Promise<void> {
  if (!BROKER_URL) return;
  try {
    const body = {
      text: `ALL Gemini models failed — images=${report.imageCount}, payload=${report.payloadKB}KB. Last: ${report.lastError.slice(0, 200)}. Timings: ${report.timings
        .map((m) => `${m.model}:${m.ms}ms ${m.ok ? 'OK' : '❌' + (m.reason ? ' ' + m.reason.slice(0, 40) : '')}`)
        .join(' | ')}`,
      screen: 'ai-analysis',
      error: 'gemini-fallback-exhausted',
    };
    await fetch(`${BROKER_URL}/feedback/critical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    logger.info('[gemini-fallback] admin alert dispatched');
  } catch {
    // Intentionally silent — see doc comment.
  }
}
