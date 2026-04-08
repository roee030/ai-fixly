export interface AIAnalysisResult {
  categories: string[];
  summary: string;
  proFacingSummary: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface AIAnalysisInput {
  images: string[];
  textDescription?: string;
}

export interface AIAnalysisService {
  analyzeIssue(input: AIAnalysisInput): Promise<AIAnalysisResult>;
}
