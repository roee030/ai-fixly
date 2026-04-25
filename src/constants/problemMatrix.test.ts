import {
  PROFESSIONS,
  PROBLEM_MATRIX,
  type ProfessionKey,
  type Urgency,
  type Problem,
  type DomainCategory,
  type Profession,
} from './problemMatrix';

describe('problemMatrix', () => {
  test('PROFESSIONS list keeps growing — never shrinks below the floor', () => {
    // The matrix is intentionally allowed to grow as we add specialties.
    // We assert a floor (and a sane ceiling) instead of a fixed number so
    // a normal addition doesn't fail the build.
    expect(PROFESSIONS.length).toBeGreaterThanOrEqual(29);
    expect(PROFESSIONS.length).toBeLessThan(200);
  });

  test('every profession has required fields', () => {
    for (const p of PROFESSIONS) {
      expect(p.key).toBeTruthy();
      expect(p.labelHe).toBeTruthy();
      expect(p.hebrewSearchQuery).toBeTruthy();
      expect(typeof p.googlePlacesType === 'string' || p.googlePlacesType === null).toBe(true);
    }
  });

  test('profession keys are unique', () => {
    const keys = PROFESSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('PROBLEM_MATRIX has exactly 10 domain categories', () => {
    expect(PROBLEM_MATRIX).toHaveLength(10);
  });

  test('total problems count is >= 200', () => {
    const total = PROBLEM_MATRIX.reduce(
      (sum, domain) => sum + domain.problems.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(200);
  });

  test('every problem has unique id across all domains', () => {
    const ids = PROBLEM_MATRIX.flatMap((d) => d.problems.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every problem has 3-5 keywords', () => {
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        expect(problem.keywords.length).toBeGreaterThanOrEqual(3);
        expect(problem.keywords.length).toBeLessThanOrEqual(5);
      }
    }
  });

  test('every problem references valid profession keys', () => {
    const validKeys = new Set(PROFESSIONS.map((p) => p.key));
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        expect(problem.professions.length).toBeGreaterThanOrEqual(1);
        expect(problem.professions.length).toBeLessThanOrEqual(3);
        for (const key of problem.professions) {
          expect(validKeys.has(key)).toBe(true);
        }
      }
    }
  });

  test('every keyword is a non-empty trimmed string', () => {
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        for (const kw of problem.keywords) {
          expect(typeof kw).toBe('string');
          expect(kw.trim().length).toBeGreaterThan(0);
          expect(kw).toBe(kw.trim());
        }
      }
    }
  });

  test('urgent problems are <= 15% of total', () => {
    const allProblems = PROBLEM_MATRIX.flatMap((d) => d.problems);
    const urgentCount = allProblems.filter((p) => p.urgency === 'urgent').length;
    expect(urgentCount / allProblems.length).toBeLessThanOrEqual(0.15);
  });

  test('critical profession reassignments are correct', () => {
    const allProblems = PROBLEM_MATRIX.flatMap((d) => d.problems);
    const find = (id: string) => allProblems.find((p) => p.id === id)!;

    expect(find('gas_stove_smell').professions[0]).toBe('gas_technician');
    expect(find('water_heater_leak').professions[0]).toBe('solar_water_heater_tech');
    expect(find('tile_broken').professions[0]).toBe('tiler');
    expect(find('drywall_hole').professions[0]).toBe('plasterer');
    expect(find('fence_broken').professions[0]).toBe('metalworker');
    expect(find('door_stuck').professions[0]).toBe('door_installer');
  });

  test('every problem has a valid urgency value', () => {
    const validUrgencies: Urgency[] = ['urgent', 'normal', 'flexible'];
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        expect(validUrgencies).toContain(problem.urgency);
      }
    }
  });

  test('every domain has required fields', () => {
    for (const domain of PROBLEM_MATRIX) {
      expect(domain.id).toBeTruthy();
      expect(domain.labelHe).toBeTruthy();
      expect(domain.labelEn).toBeTruthy();
      expect(domain.problems.length).toBeGreaterThan(0);
    }
  });
});
