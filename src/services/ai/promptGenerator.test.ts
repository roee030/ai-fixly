import { generateAnalysisPrompt } from './promptGenerator';
import { PROFESSIONS, PROBLEM_MATRIX } from '../../constants/problemMatrix';

describe('generateAnalysisPrompt', () => {
  const prompt = generateAnalysisPrompt();

  test('includes all 29 profession keys', () => {
    for (const p of PROFESSIONS) {
      expect(prompt).toContain(p.key);
      expect(prompt).toContain(p.labelHe);
    }
  });

  test('includes all 10 domain category Hebrew headers', () => {
    for (const d of PROBLEM_MATRIX) {
      expect(prompt).toContain(d.labelHe);
    }
  });

  test('includes problem examples from each domain', () => {
    for (const d of PROBLEM_MATRIX) {
      expect(prompt).toContain(d.problems[0].descriptionHe);
    }
  });

  test('includes disambiguation rules for key professions', () => {
    expect(prompt).toContain('seamstress');
    expect(prompt).toContain('solar_water_heater_tech');
    expect(prompt).toContain('metalworker');
    expect(prompt).toContain('tiler');
    expect(prompt).toContain('gas_technician');
    expect(prompt).toContain('shutter_technician');
  });

  test('requests JSON with professions + problemId + urgency', () => {
    expect(prompt).toContain('"professions"');
    expect(prompt).toContain('"problemId"');
    expect(prompt).toContain('"urgency"');
    expect(prompt).toContain('"professionLabelsHe"');
    expect(prompt).toContain('"shortSummary"');
  });

  test('prompt is under 15000 estimated tokens (4 chars per token)', () => {
    const estimatedTokens = prompt.length / 4;
    expect(estimatedTokens).toBeLessThan(15000);
  });
});
