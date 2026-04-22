import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIAnalysisService, AIAnalysisInput, AIAnalysisResult } from './types';
import { ANALYSIS_PROMPT } from './prompts';
import { logger } from '../logger';
import { reportAiFullFailure } from './alertAiFailure';

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'];

/**
 * Thrown when Gemini's safety classifier flags the user's media or text.
 * Caught on the confirm screen to show a polite Hebrew message instead of
 * a generic error.
 */
export class ContentModerationError extends Error {
  category: string;
  constructor(category: string, message?: string) {
    super(message || `Content blocked: ${category}`);
    this.name = 'ContentModerationError';
    this.category = category;
  }
}

// Safety ratings at these levels block the request. Gemini returns one of
// NEGLIGIBLE / LOW / MEDIUM / HIGH per category. We block at MEDIUM or HIGH;
// LOW is common for any photo with skin tones and would over-reject.
const BLOCKING_PROBABILITIES = new Set(['MEDIUM', 'HIGH']);

class GeminiAnalysisService implements AIAnalysisService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeIssue(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    // The analyzer routes to a profession key. We pass images through as
    // inlineData so the safety classifier can inspect them AND the routing
    // has visual context for edge cases ("the photo shows a leaking pipe"
    // is a stronger signal than "water problem" alone).
    const textPart = input.textDescription
      ? `\n\nCustomer description: "${input.textDescription}"`
      : '';

    // Shape content[] to match the SDK expectation: string parts + inlineData
    // objects. We cap at the first 5 images — more than enough context and
    // keeps the request small.
    const content: Array<
      | string
      | { inlineData: { mimeType: string; data: string } }
    > = [ANALYSIS_PROMPT + textPart];
    for (const b64 of (input.images || []).slice(0, 5)) {
      content.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } });
    }

    const totalStart = Date.now();
    const payloadKB = (input.images || []).reduce(
      (acc, b) => acc + Math.round((b.length * 3) / 4 / 1024),
      0,
    );

    let lastError: Error | null = null;
    const modelTimings: Array<{ model: string; ms: number; ok: boolean; reason?: string }> = [];
    for (const modelName of MODELS) {
      const t0 = Date.now();
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(content as any);

        // ── Content moderation ───────────────────────────────────────────
        // If the prompt itself was blocked upstream, the SDK populates
        // promptFeedback.blockReason. Otherwise we inspect safetyRatings on
        // the response candidate — MEDIUM/HIGH in any category kicks it
        // back with a ContentModerationError so the UI shows the polite
        // "image isn't suitable" message instead of a generic parse error.
        const blockReason = result.response.promptFeedback?.blockReason;
        if (blockReason) {
          throw new ContentModerationError(blockReason);
        }
        const ratings =
          result.response.candidates?.[0]?.safetyRatings ||
          result.response.promptFeedback?.safetyRatings ||
          [];
        const flagged = ratings.find((r: any) =>
          BLOCKING_PROBABILITIES.has(r.probability),
        );
        if (flagged) {
          throw new ContentModerationError(flagged.category);
        }

        const text = result.response.text();
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        const professions: string[] = Array.isArray(parsed.professions) && parsed.professions.length > 0
          ? parsed.professions
          : ['handyman'];

        const ms = Date.now() - t0;
        modelTimings.push({ model: modelName, ms, ok: true });
        logger.info('[perf] gemini.analyzeIssue', {
          model: modelName,
          ms: String(ms),
          totalMs: String(Date.now() - totalStart),
          imgs: String((input.images || []).length),
          payloadKB: String(payloadKB),
          professions: professions.join(','),
        });

        return {
          professions,
          // Kept for backwards compatibility with existing Firestore docs
          // and components that still read it. Frontend localizes via
          // localizeProfession() so the contents here are essentially unused.
          professionLabelsHe: professions,
          shortSummary: '',
          // Perf telemetry for the admin service-timeline. Confirm screen
          // re-emits this as a `gemini` event once the real requestId exists.
          __perf: {
            model: modelName,
            ms,
            imageCount: (input.images || []).length,
            payloadKB,
          },
        };
      } catch (err: any) {
        // Never retry a moderation block — it's deterministic.
        if (err instanceof ContentModerationError) throw err;
        lastError = err;
        const ms = Date.now() - t0;
        const reason = String(err?.message || err).slice(0, 140);
        modelTimings.push({ model: modelName, ms, ok: false, reason });
        const is503or429 = err?.message?.includes('503') || err?.message?.includes('429');
        logger.warn('[gemini-fallback]', {
          model: modelName,
          ms: String(ms),
          retrying: String(is503or429),
          reason,
        });
        if (is503or429) continue;
        throw err;
      }
    }

    // All models failed — raise a visible admin alert so the owner knows
    // something is genuinely wrong (all 3 Gemini variants 503'd or the
    // API key was revoked). Fire-and-forget, never block the error surface.
    logger.error('[gemini-fallback] ALL MODELS FAILED', lastError as Error);
    reportAiFullFailure({
      timings: modelTimings,
      payloadKB,
      imageCount: (input.images || []).length,
      lastError: lastError?.message || 'unknown',
    }).catch(() => {});

    throw lastError || new Error('All AI models failed');
  }
}

export const aiAnalysisService: AIAnalysisService = new GeminiAnalysisService();
