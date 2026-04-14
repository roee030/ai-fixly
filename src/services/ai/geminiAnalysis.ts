import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIAnalysisService, AIAnalysisInput, AIAnalysisResult } from './types';
import { ANALYSIS_PROMPT } from './prompts';

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'];

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
    // TEXT-ONLY analysis for speed. Images/videos are NOT sent to the AI —
    // they're uploaded to Supabase and forwarded to providers as media
    // attachments only. The text description + problem matrix is enough
    // for accurate profession matching, and it's 5x faster (~1s vs ~5s).
    const textPart = input.textDescription
      ? `\n\nCustomer description: "${input.textDescription}"`
      : '';

    const content = [ANALYSIS_PROMPT + textPart];

    // Try models in order, fallback on 503/429
    let lastError: Error | null = null;
    for (const modelName of MODELS) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(content);
        const text = result.response.text();
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        const professions = Array.isArray(parsed.professions) && parsed.professions.length > 0
          ? parsed.professions
          : ['handyman'];
        const professionLabelsHe = Array.isArray(parsed.professionLabelsHe) && parsed.professionLabelsHe.length > 0
          ? parsed.professionLabelsHe
          : ['הנדימן'];

        return {
          professions,
          professionLabelsHe,
          shortSummary: parsed.shortSummary || '',
        };
      } catch (err: any) {
        lastError = err;
        const is503or429 = err?.message?.includes('503') || err?.message?.includes('429');
        if (is503or429) continue;
        throw err;
      }
    }

    throw lastError || new Error('All AI models failed');
  }
}

export const aiAnalysisService: AIAnalysisService = new GeminiAnalysisService();
