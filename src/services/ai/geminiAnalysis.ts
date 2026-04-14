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
    // MINIMAL analysis: the AI only routes to a profession key. We removed
    // shortSummary / problemId / urgency to cut response size and latency
    // — the customer's own text becomes the description shown to providers.
    const textPart = input.textDescription
      ? `\n\nCustomer description: "${input.textDescription}"`
      : '';

    const content = [ANALYSIS_PROMPT + textPart];

    let lastError: Error | null = null;
    for (const modelName of MODELS) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(content);
        const text = result.response.text();
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        const professions: string[] = Array.isArray(parsed.professions) && parsed.professions.length > 0
          ? parsed.professions
          : ['handyman'];

        return {
          professions,
          // Kept for backwards compatibility with existing Firestore docs
          // and components that still read it. Frontend localizes via
          // localizeProfession() so the contents here are essentially unused.
          professionLabelsHe: professions,
          shortSummary: '',
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
