/**
 * Gemini-based parser for provider WhatsApp replies.
 *
 * When a provider replies like "yes 350 shekels, tomorrow morning", we send
 * the text to Gemini which extracts structured data: price, availability,
 * and whether they're interested at all.
 *
 * We use the REST API directly (no SDK) to minimize bundle size in the worker.
 */

export interface ParsedReply {
  interested: boolean;
  price: number | null;
  availability: string | null;
  rawText: string;
}

const PARSER_PROMPT = `You are parsing a WhatsApp reply from a home services provider (in Hebrew or English).

The provider received a job offer and is replying. Extract structured data.

Return ONLY a JSON object with these exact fields:
{
  "interested": true | false,
  "price": number or null (in ILS/shekels, just the number),
  "availability": "short string describing when they can come" or null,
  "reasoning": "brief explanation of what the provider said"
}

Rules:
- If the provider clearly declines (לא, לא מעוניין, busy, cannot) -> interested: false
- If they give a price, extract just the number (350 from "350 שקל")
- Availability should be short: "מחר בבוקר", "יום ראשון אחה״צ", "תוך שעתיים"
- If unclear, set fields to null but still return interested: true if they seem to want the job

Reply with JSON only, no markdown, no code fences.`;

export async function parseProviderReply(params: {
  apiKey: string;
  replyText: string;
}): Promise<ParsedReply> {
  const { apiKey, replyText } = params;

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: `${PARSER_PROMPT}\n\nProvider reply: "${replyText}"` },
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
    };

    return {
      interested: parsed.interested ?? false,
      price: typeof parsed.price === 'number' ? parsed.price : null,
      availability: parsed.availability || null,
      rawText: replyText,
    };
  } catch {
    // If AI response is malformed, return a minimal result
    return {
      interested: true,
      price: null,
      availability: null,
      rawText: replyText,
    };
  }
}
