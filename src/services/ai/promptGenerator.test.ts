import { generateAnalysisPrompt } from './promptGenerator';
import { PROFESSIONS } from '../../constants/problemMatrix';

/**
 * The prompt was rewritten in the routing-only refactor: it no longer
 * extracts diagnoses, urgency, problemId or short summaries — it only
 * returns the matching profession key(s). These tests pin the new
 * contract so the next refactor can't drop a profession key or
 * disambiguation rule by accident.
 */
describe('generateAnalysisPrompt', () => {
  const prompt = generateAnalysisPrompt();

  test('lists every profession key + Hebrew label', () => {
    for (const p of PROFESSIONS) {
      expect(prompt).toContain(p.key);
      expect(prompt).toContain(p.labelHe);
    }
  });

  test('keeps the disambiguation rules that prevent the most common AI mistakes', () => {
    expect(prompt).toContain('seamstress');
    expect(prompt).toContain('solar_water_heater_tech');
    expect(prompt).toContain('metalworker');
    expect(prompt).toContain('tiler');
    expect(prompt).toContain('gas_technician');
    expect(prompt).toContain('shutter_technician');
  });

  test('asks for a JSON envelope with a single `professions` array (routing-only)', () => {
    expect(prompt).toContain('"professions"');
    // The legacy fields (problemId / urgency / shortSummary) were dropped
    // from the prompt to cut tokens. Make sure they don't sneak back.
    expect(prompt).not.toContain('"problemId"');
    expect(prompt).not.toContain('"urgency"');
    expect(prompt).not.toContain('"shortSummary"');
  });

  test('asks for output as JSON, not markdown', () => {
    expect(prompt).toMatch(/JSON/i);
    expect(prompt).toMatch(/no markdown/i);
  });

  test('caps at ~15k tokens (4 chars per token estimate)', () => {
    const estimatedTokens = prompt.length / 4;
    expect(estimatedTokens).toBeLessThan(15000);
  });
});
