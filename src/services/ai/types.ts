/**
 * AI analysis result. Kept minimal by design:
 * - professions: Google Places business types (used for search)
 * - professionLabelsHe: Hebrew labels (for display)
 * - shortSummary: neutral 1-sentence description for the customer
 *
 * We deliberately do NOT have the AI diagnose the problem or provide urgency.
 * The professional sees the media and description directly.
 */
export interface AIAnalysisResult {
  professions: string[];
  professionLabelsHe: string[];
  shortSummary: string;
}

export interface AIAnalysisInput {
  images: string[];
  textDescription?: string;
}

export interface AIAnalysisService {
  analyzeIssue(input: AIAnalysisInput): Promise<AIAnalysisResult>;
}
