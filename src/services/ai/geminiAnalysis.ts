import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIAnalysisService, AIAnalysisInput, AIAnalysisResult } from './types';
import { ANALYSIS_PROMPT } from './prompts';

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
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imageParts = input.images.map((base64) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64,
      },
    }));

    const textPart = input.textDescription
      ? `\n\nCustomer description: "${input.textDescription}"`
      : '';

    const result = await model.generateContent([
      ANALYSIS_PROMPT + textPart,
      ...imageParts,
    ]);

    const response = result.response;
    const text = response.text();

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      category: parsed.category || 'general',
      summary: parsed.summary || '',
      proFacingSummary: parsed.proFacingSummary || '',
      urgency: parsed.urgency || 'medium',
      confidence: parsed.confidence || 0.5,
    };
  }
}

export const aiAnalysisService: AIAnalysisService = new GeminiAnalysisService();
