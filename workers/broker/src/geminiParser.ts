/**
 * Gemini-based parser for provider WhatsApp replies.
 *
 * When a provider replies like "yes 350 shekels, tomorrow morning", we send
 * the text to Gemini which extracts structured data: price, availability
 * text, a concrete ISO timestamp for the availability, and whether they're
 * interested at all.
 *
 * We use the REST API directly (no SDK) to minimize bundle size in the worker.
 */

export interface ParsedReply {
  interested: boolean;
  price: number | null;
  /** Raw availability text from the reply, e.g. "מחר בבוקר" */
  availability: string | null;
  /**
   * Best-effort ISO 8601 timestamp (UTC) for when the provider said they
   * could start. Computed by Gemini relative to `nowInIsrael` in the prompt.
   * May be null if the reply is vague (e.g. "this week") or can't be parsed.
   */
  availabilityStartAt: string | null;
  rawText: string;
}

// formatNowForPrompt and isIsraelDst are defined below — kept at the bottom
// so we can reference them from buildPrompt without a forward-declaration
// dance. They're implemented after the TDD cycle for these helpers.

function buildPrompt(nowInIsrael: string): string {
  return `You are parsing a WhatsApp reply from a home services provider (in Hebrew or English).

The provider received a job offer and is replying. Extract structured data.

Current time in Israel: ${nowInIsrael}

Return ONLY a JSON object with these exact fields:
{
  "interested": true | false,
  "price": number or null (in ILS/shekels, just the number),
  "availability": "short string describing when they can come, in Hebrew" or null,
  "availabilityStartAt": "ISO 8601 timestamp in UTC (Z suffix) representing the start of the time window the provider mentioned, or null if unclear",
  "reasoning": "brief explanation"
}

Rules for availabilityStartAt:
- Compute relative to the "Current time in Israel" given above
- "תוך שעתיים" / "in 2 hours" → now + 2h, in UTC
- "מחר בבוקר" / "tomorrow morning" → next day at 09:00 Israel time, in UTC
- "מחר אחה״צ" / "tomorrow afternoon" → next day at 15:00 Israel time, in UTC
- "מחר בערב" / "tomorrow evening" → next day at 19:00 Israel time, in UTC
- "היום בערב" / "today evening" → today at 19:00 Israel time, in UTC
- "יום ראשון" / "Sunday" → next Sunday (default 09:00 if no time given), in UTC
- Exact time like "מחר ב-10:30" → next day 10:30 Israel time, in UTC
- If the provider says "today" and it's already past that time of day, pick tomorrow
- If unclear (just "this week"), return null
- IMPORTANT: Convert to UTC! If Israel time is 09:00 and DST is on (+3), UTC is 06:00.

General rules:
- If the provider clearly declines (לא, לא מעוניין, busy, cannot) → interested: false
- If they give a price, extract just the number (350 from "350 שקל")
- availability text should be short and natural Hebrew: "מחר בבוקר", "יום ראשון אחה״צ", "תוך שעתיים"

Reply with JSON only, no markdown, no code fences.`;
}

export async function parseProviderReply(params: {
  apiKey: string;
  replyText: string;
  now?: Date; // injectable for testability
}): Promise<ParsedReply> {
  const { apiKey, replyText } = params;
  const now = params.now || new Date();

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${buildPrompt(formatNowForPrompt(now))}\n\nProvider reply: "${replyText}"`,
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      interested?: boolean;
      price?: number | null;
      availability?: string | null;
      availabilityStartAt?: string | null;
    };

    return {
      interested: parsed.interested ?? false,
      price: typeof parsed.price === 'number' ? parsed.price : null,
      availability: parsed.availability || null,
      availabilityStartAt: validateIsoOrNull(parsed.availabilityStartAt),
      rawText: replyText,
    };
  } catch {
    // If AI response is malformed, return a minimal result
    return {
      interested: true,
      price: null,
      availability: null,
      availabilityStartAt: null,
      rawText: replyText,
    };
  }
}

// =============================================================================
// Pure helpers — implemented test-first. See geminiParser.test.ts.
// =============================================================================

/**
 * True if the given UTC moment is during Israel DST.
 *
 * Israel DST is last Friday of March through last Sunday of October. Rather
 * than encoding the exact rule (which is only relevant for a few days per
 * year), we use a simple month-based approximation that's sufficient for
 * anchoring "now" in the Gemini prompt.
 */
function isIsraelDst(d: Date): boolean {
  const month = d.getUTCMonth(); // 0-indexed: 0=Jan, 11=Dec
  // Clearly winter months
  if (month < 2 || month > 9) return false;
  // Clearly summer months
  if (month > 2 && month < 9) return true;
  // Edge months (March, October): rough cutoff around the middle-end of month
  return month === 2 ? d.getUTCDate() >= 25 : d.getUTCDate() < 25;
}

/**
 * Format a UTC Date as an Israel-local wall-clock string for the Gemini
 * prompt. Output shape: `YYYY-MM-DD HH:MM (DayName, Israel time, UTC+N)`
 *
 * Worker runtime is UTC, so we manually shift by Israel's offset.
 */
function formatNowForPrompt(now: Date): string {
  const offsetHours = isIsraelDst(now) ? 3 : 2;
  const shifted = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = shifted.getUTCFullYear();
  const month = pad(shifted.getUTCMonth() + 1);
  const day = pad(shifted.getUTCDate());
  const hour = pad(shifted.getUTCHours());
  const minute = pad(shifted.getUTCMinutes());

  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday',
  ];
  const dayName = dayNames[shifted.getUTCDay()];

  return `${year}-${month}-${day} ${hour}:${minute} (${dayName}, Israel time, UTC+${offsetHours})`;
}

/**
 * Accept any value, return a canonical UTC ISO string if it parses as a
 * valid date, or null otherwise. Used to sanitize Gemini responses —
 * the model sometimes returns malformed timestamps or non-string values.
 */
function validateIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Private helpers exposed ONLY for unit tests. Do not import from runtime code.
 */
export const __test__ = {
  formatNowForPrompt,
  isIsraelDst,
  validateIsoOrNull,
};
