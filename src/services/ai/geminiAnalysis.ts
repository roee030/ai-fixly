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
    const imageParts = input.images.map((base64) => ({
      inlineData: { mimeType: 'image/jpeg' as const, data: base64 },
    }));

    const textPart = input.textDescription
      ? `\n\nCustomer description: "${input.textDescription}"`
      : '';

    const content = [ANALYSIS_PROMPT + textPart, ...imageParts];

    // Try models in order, fallback on 503/429
    let lastError: Error | null = null;
    for (const modelName of MODELS) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(content);
        const text = result.response.text();
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        return {
          categories: Array.isArray(parsed.categories) ? parsed.categories : [parsed.categories || parsed.category || 'general'],
          summary: parsed.summary || '',
          proFacingSummary: parsed.proFacingSummary || '',
          urgency: parsed.urgency || 'medium',
          confidence: parsed.confidence || 0.5,
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
