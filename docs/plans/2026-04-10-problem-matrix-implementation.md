# Problem-to-Professional Matrix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the ad-hoc AI prompt with a structured problem matrix (29 professions × 227 problems), auto-generated Gemini prompt, and urgency-driven search aggressiveness in the worker.

**Architecture:** Single TypeScript data file (`src/constants/problemMatrix.ts`) is the source of truth. A prompt generator builds the Gemini prompt from it. The worker reads urgency to adjust search radius/provider count. All existing profession maps in `googlePlaces.ts` and `prompts.ts` are replaced by imports from the matrix.

**Tech Stack:** TypeScript, Jest (app tests), Node test runner (worker tests), Gemini 2.5-flash, Cloudflare Workers.

---

## Task 1: Create the Professions data

**Files:**
- Create: `src/constants/problemMatrix.ts`
- Test: `src/constants/problemMatrix.test.ts`

**Step 1: Write the failing test**

```typescript
// src/constants/problemMatrix.test.ts
import { PROFESSIONS, PROBLEM_MATRIX, type ProfessionKey } from './problemMatrix';

describe('problemMatrix data integrity', () => {
  test('has exactly 29 professions', () => {
    expect(PROFESSIONS).toHaveLength(29);
  });

  test('every profession has a non-empty labelHe and hebrewSearchQuery', () => {
    for (const p of PROFESSIONS) {
      expect(p.labelHe.length).toBeGreaterThan(0);
      expect(p.hebrewSearchQuery.length).toBeGreaterThan(0);
    }
  });

  test('no duplicate profession keys', () => {
    const keys = PROFESSIONS.map(p => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('has exactly 10 domain categories', () => {
    expect(PROBLEM_MATRIX).toHaveLength(10);
  });

  test('total problems across all domains is >= 200', () => {
    const total = PROBLEM_MATRIX.reduce((sum, d) => sum + d.problems.length, 0);
    expect(total).toBeGreaterThanOrEqual(200);
  });

  test('every problem references valid profession keys', () => {
    const validKeys = new Set(PROFESSIONS.map(p => p.key));
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        for (const profKey of problem.professions) {
          expect(validKeys.has(profKey)).toBe(true);
        }
      }
    }
  });

  test('every problem has at least one profession', () => {
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        expect(problem.professions.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('every problem has a valid urgency', () => {
    const validUrgencies = new Set(['urgent', 'normal', 'flexible']);
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        expect(validUrgencies.has(problem.urgency)).toBe(true);
      }
    }
  });

  test('no duplicate problem IDs across all domains', () => {
    const ids: string[] = [];
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        ids.push(problem.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('urgent problems are <= 15% of total', () => {
    let total = 0;
    let urgent = 0;
    for (const domain of PROBLEM_MATRIX) {
      for (const problem of domain.problems) {
        total++;
        if (problem.urgency === 'urgent') urgent++;
      }
    }
    expect(urgent / total).toBeLessThanOrEqual(0.15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd C:\Users\roeea\OneDrive\Documents\Github\ai-fixly && npx jest src/constants/problemMatrix.test.ts`
Expected: FAIL with "Cannot find module './problemMatrix'"

**Step 3: Write the full problemMatrix.ts**

Create `src/constants/problemMatrix.ts` with:
- The `ProfessionKey` union type (29 members)
- The `Urgency`, `Profession`, `Problem`, `DomainCategory` interfaces
- The `PROFESSIONS` array (29 entries) — populate from the design doc's profession table
- The `PROBLEM_MATRIX` array (10 domains, ~227 problems total) — populate from the design doc's domain tables

The file is large (~800-1000 lines) but purely data. Each profession entry:
```typescript
{ key: 'plumber', labelHe: 'אינסטלטור', googlePlacesType: 'plumber', hebrewSearchQuery: 'אינסטלטור' },
```

Each problem entry:
```typescript
{ id: 'burst_pipe', descriptionHe: 'צינור פרוץ', descriptionEn: 'Burst pipe',
  keywords: ['צינור', 'פרוץ', 'הצפה', 'burst', 'pipe'],
  professions: ['plumber'], urgency: 'urgent' },
```

**IMPORTANT:** Populate ALL 227 problems from the approved design (10 domains × their problems). Do not skip any. Use UTF-8 encoding for Hebrew strings.

**Step 4: Run test to verify it passes**

Run: `cd C:\Users\roeea\OneDrive\Documents\Github\ai-fixly && npx jest src/constants/problemMatrix.test.ts`
Expected: PASS (all 10 assertions green)

**Step 5: Commit**

```bash
git add src/constants/problemMatrix.ts src/constants/problemMatrix.test.ts
git commit -m "feat: add problem-to-professional matrix (29 professions, 227 problems)"
```

---

## Task 2: Create the prompt generator

**Files:**
- Create: `src/services/ai/promptGenerator.ts`
- Test: `src/services/ai/promptGenerator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/ai/promptGenerator.test.ts
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

  test('includes all 10 domain category headers', () => {
    for (const d of PROBLEM_MATRIX) {
      expect(prompt).toContain(d.labelHe);
    }
  });

  test('includes problem examples from each domain', () => {
    for (const d of PROBLEM_MATRIX) {
      // At least the first problem from each domain should appear
      expect(prompt).toContain(d.problems[0].descriptionHe);
    }
  });

  test('includes disambiguation rules section', () => {
    expect(prompt).toContain('seamstress');
    expect(prompt).toContain('solar_water_heater_tech');
    expect(prompt).toContain('metalworker');
  });

  test('requests JSON response with professions + problemId + urgency', () => {
    expect(prompt).toContain('"professions"');
    expect(prompt).toContain('"problemId"');
    expect(prompt).toContain('"urgency"');
  });

  test('prompt is under 15000 tokens (rough estimate: 4 chars per token)', () => {
    const estimatedTokens = prompt.length / 4;
    expect(estimatedTokens).toBeLessThan(15000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/ai/promptGenerator.test.ts`
Expected: FAIL with "Cannot find module './promptGenerator'"

**Step 3: Implement promptGenerator.ts**

```typescript
// src/services/ai/promptGenerator.ts
import { PROFESSIONS, PROBLEM_MATRIX } from '../../constants/problemMatrix';

export function generateAnalysisPrompt(): string {
  const professionsList = PROFESSIONS
    .map(p => `- ${p.key} (${p.labelHe})`)
    .join('\n');

  const domainSections = PROBLEM_MATRIX
    .map(domain => {
      const header = `## ${domain.labelHe} (${domain.labelEn})`;
      const problems = domain.problems
        .map(p => {
          const profs = p.professions.join(', ');
          const urgencyTag = p.urgency === 'urgent' ? ' ⚠️ URGENT' : '';
          return `- ${p.id}: ${p.descriptionHe} → [${profs}]${urgencyTag}`;
        })
        .join('\n');
      return `${header}\n${problems}`;
    })
    .join('\n\n');

  const disambiguationRules = buildDisambiguationRules();

  return `You are a profession-identifier AI for a home-services marketplace in Israel.

Your ONLY job is to look at the image(s) and description and identify which PROFESSIONS should be contacted. Do NOT explain the problem, do NOT diagnose it, do NOT give advice.

Return a JSON object with exactly these fields:
{
  "professions": ["array of 1-3 profession keys from the list below, most relevant first"],
  "professionLabelsHe": ["Hebrew labels for the professions, same order"],
  "problemId": "the closest matching problem ID from the reference below, or null if no close match",
  "urgency": "urgent | normal | flexible — based on the matched problem, or 'normal' if unsure",
  "shortSummary": "A short (1 sentence, max 15 words) neutral description in Hebrew"
}

PROFESSIONS (use these EXACT keys):
${professionsList}

PROBLEM REFERENCE (use as examples for matching — pick the closest match):

${domainSections}

DISAMBIGUATION RULES:
${disambiguationRules}

General rules:
- Return 1-3 professions, ordered by relevance.
- Pick the MOST SPECIFIC profession. Only use "handyman" if truly generic.
- If multiple professions could help, list the most likely first.
- If truly unclear, default to ["handyman"] with urgency "normal".
- shortSummary: neutral, factual, 1 sentence, Hebrew.
- Always respond with valid JSON only, no markdown code fences.`;
}

function buildDisambiguationRules(): string {
  return [
    '- Clothing/fabric items → seamstress (NOT handyman)',
    '- Sofa/cushioned furniture → upholsterer (NOT carpenter)',
    '- Wooden furniture → carpenter (NOT handyman)',
    '- Metal fences, gates, railings → metalworker (NOT handyman)',
    '- Solar water heater (דוד שמש) → solar_water_heater_tech (NOT plumber)',
    '- Gas smell or gas appliance → gas_technician (NOT home_appliance_repair)',
    '- Shutters (תריסים) → shutter_technician (NOT handyman, NOT electrician)',
    '- Broken glass/windows → glazier (NOT handyman)',
    '- Phones/tablets → mobile_repair (NOT computer_repair)',
    '- TVs/projectors → tv_repair (NOT home_appliance_repair)',
    '- Tiles/flooring → tiler (NOT handyman)',
    '- Drywall/plaster → plasterer (NOT painter)',
    '- Cockroaches/ants/mice → exterminator (NOT cleaning_service)',
    '- Door installation → door_installer (NOT carpenter, NOT locksmith)',
    '- Waterproofing (walls, roof, balcony) → waterproofing_specialist',
    '- Security cameras → security_camera_installer (NOT electrician)',
    '- General renovation → renovator (if the job spans multiple trades)',
  ].join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/services/ai/promptGenerator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ai/promptGenerator.ts src/services/ai/promptGenerator.test.ts
git commit -m "feat: add auto-generated AI prompt from problem matrix"
```

---

## Task 3: Wire the prompt generator into the AI analysis service

**Files:**
- Modify: `src/services/ai/prompts.ts` — replace hardcoded prompt with import
- Modify: `src/services/ai/geminiAnalysis.ts` — use the new prompt

**Step 1: Update prompts.ts**

Replace the entire `ANALYSIS_PROMPT` export:

```typescript
// src/services/ai/prompts.ts
import { generateAnalysisPrompt } from './promptGenerator';

/**
 * The analysis prompt is auto-generated from the problem matrix.
 * Do NOT edit this manually — update problemMatrix.ts instead.
 */
export const ANALYSIS_PROMPT = generateAnalysisPrompt();
```

**Step 2: Verify existing tests still pass**

Run: `npx jest --passWithNoTests`
Expected: All existing tests pass (no behavioral change for consumers of ANALYSIS_PROMPT)

**Step 3: Commit**

```bash
git add src/services/ai/prompts.ts
git commit -m "refactor: wire AI prompt to auto-generated matrix prompt"
```

---

## Task 4: Replace worker profession maps with matrix data

**Files:**
- Create: `workers/broker/src/professionConfig.ts` — profession → Google type + Hebrew query + urgency config
- Modify: `workers/broker/src/googlePlaces.ts` — replace local maps
- Modify: `workers/broker/src/index.ts` — read urgency, adjust search params
- Test: `workers/broker/src/professionConfig.test.ts`

**Step 1: Write the failing test**

```typescript
// workers/broker/src/professionConfig.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGooglePlacesType,
  getHebrewSearchQuery,
  getUrgencyConfig,
} from './professionConfig';

test('getGooglePlacesType: plumber returns "plumber"', () => {
  assert.equal(getGooglePlacesType('plumber'), 'plumber');
});

test('getGooglePlacesType: seamstress returns null (text search)', () => {
  assert.equal(getGooglePlacesType('seamstress'), null);
});

test('getHebrewSearchQuery: plumber returns אינסטלטור', () => {
  assert.equal(getHebrewSearchQuery('plumber'), 'אינסטלטור');
});

test('getHebrewSearchQuery: metalworker returns מסגר', () => {
  assert.equal(getHebrewSearchQuery('metalworker'), 'מסגר');
});

test('getUrgencyConfig: urgent returns wider radius', () => {
  const config = getUrgencyConfig('urgent');
  assert.equal(config.radiusMeters, 40000);
  assert.equal(config.maxProviders, 10);
});

test('getUrgencyConfig: normal returns default radius', () => {
  const config = getUrgencyConfig('normal');
  assert.equal(config.radiusMeters, 20000);
  assert.equal(config.maxProviders, 5);
});

test('getUrgencyConfig: flexible returns smaller radius', () => {
  const config = getUrgencyConfig('flexible');
  assert.equal(config.radiusMeters, 15000);
  assert.equal(config.maxProviders, 5);
});

test('getUrgencyConfig: unknown defaults to normal', () => {
  const config = getUrgencyConfig('banana' as any);
  assert.equal(config.radiusMeters, 20000);
});
```

**Step 2: Run test to verify it fails**

Run: `cd workers/broker && npm test`
Expected: FAIL with "Cannot find module './professionConfig'"

**Step 3: Implement professionConfig.ts**

```typescript
// workers/broker/src/professionConfig.ts

/**
 * Profession configuration for the worker. This is a COPY of the relevant
 * fields from the app's problemMatrix.ts, kept in sync manually for now.
 *
 * Why a copy? The worker bundles independently from the app (Wrangler vs
 * Metro). Sharing a file across both requires a monorepo package, which is
 * YAGNI for now. The data changes rarely (new professions are added maybe
 * once a month).
 */

interface ProfessionConfig {
  googlePlacesType: string | null;
  hebrewSearchQuery: string;
}

const PROFESSION_MAP: Record<string, ProfessionConfig> = {
  plumber:                    { googlePlacesType: 'plumber',            hebrewSearchQuery: 'אינסטלטור' },
  electrician:                { googlePlacesType: 'electrician',        hebrewSearchQuery: 'חשמלאי' },
  hvac_contractor:            { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי מיזוג אוויר' },
  locksmith:                  { googlePlacesType: 'locksmith',          hebrewSearchQuery: 'מנעולן' },
  home_appliance_repair:      { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי מוצרי חשמל' },
  computer_repair:            { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי מחשבים' },
  mobile_repair:              { googlePlacesType: null,                 hebrewSearchQuery: 'תיקון טלפונים סלולריים' },
  tv_repair:                  { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי טלוויזיות' },
  painter:                    { googlePlacesType: 'painter',            hebrewSearchQuery: 'צבעי' },
  cleaning_service:           { googlePlacesType: null,                 hebrewSearchQuery: 'חברת ניקיון' },
  moving_company:             { googlePlacesType: 'moving_company',     hebrewSearchQuery: 'חברת הובלות' },
  roofer:                     { googlePlacesType: 'roofing_contractor', hebrewSearchQuery: 'גגן' },
  carpenter:                  { googlePlacesType: null,                 hebrewSearchQuery: 'נגר' },
  gardener:                   { googlePlacesType: null,                 hebrewSearchQuery: 'גנן' },
  seamstress:                 { googlePlacesType: null,                 hebrewSearchQuery: 'תופרת' },
  upholsterer:                { googlePlacesType: null,                 hebrewSearchQuery: 'רפד' },
  glazier:                    { googlePlacesType: null,                 hebrewSearchQuery: 'זגג' },
  handyman:                   { googlePlacesType: 'general_contractor', hebrewSearchQuery: 'הנדימן' },
  gas_technician:             { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי גז' },
  exterminator:               { googlePlacesType: null,                 hebrewSearchQuery: 'הדברה' },
  shutter_technician:         { googlePlacesType: null,                 hebrewSearchQuery: 'תריסים תיקון' },
  waterproofing_specialist:   { googlePlacesType: null,                 hebrewSearchQuery: 'איטום' },
  tiler:                      { googlePlacesType: null,                 hebrewSearchQuery: 'רצף אריחים' },
  plasterer:                  { googlePlacesType: null,                 hebrewSearchQuery: 'טייח גבס שפכטל' },
  metalworker:                { googlePlacesType: null,                 hebrewSearchQuery: 'מסגר' },
  solar_water_heater_tech:    { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי דודי שמש' },
  renovator:                  { googlePlacesType: null,                 hebrewSearchQuery: 'שיפוצניק קבלן שיפוצים' },
  door_installer:             { googlePlacesType: null,                 hebrewSearchQuery: 'התקנת דלתות' },
  security_camera_installer:  { googlePlacesType: null,                 hebrewSearchQuery: 'התקנת מצלמות אבטחה' },
};

export function getGooglePlacesType(profession: string): string | null {
  return PROFESSION_MAP[profession]?.googlePlacesType ?? null;
}

export function getHebrewSearchQuery(profession: string): string {
  return PROFESSION_MAP[profession]?.hebrewSearchQuery ?? profession;
}

interface UrgencySearchConfig {
  radiusMeters: number;
  maxProviders: number;
  tonePrefix: string;
}

const URGENCY_CONFIGS: Record<string, UrgencySearchConfig> = {
  urgent:   { radiusMeters: 40000, maxProviders: 10, tonePrefix: '⚠️ בקשה דחופה — ' },
  normal:   { radiusMeters: 20000, maxProviders: 5,  tonePrefix: '' },
  flexible: { radiusMeters: 15000, maxProviders: 5,  tonePrefix: '' },
};

export function getUrgencyConfig(urgency: string): UrgencySearchConfig {
  return URGENCY_CONFIGS[urgency] ?? URGENCY_CONFIGS['normal'];
}
```

**Step 4: Run tests to verify they pass**

Run: `cd workers/broker && npm test`
Expected: All pass (existing 39 + new ~8 = 47)

**Step 5: Update googlePlaces.ts to use professionConfig**

Replace the local `PROFESSION_TO_GOOGLE_TYPE` and `PROFESSION_HEBREW_QUERY` maps with imports:

```typescript
// In googlePlaces.ts, replace the two local maps with:
import { getGooglePlacesType, getHebrewSearchQuery } from './professionConfig';

// And in findNearbyProviders:
const googleType = getGooglePlacesType(params.profession);
// ...
const textQuery = getHebrewSearchQuery(params.profession);
```

**Step 6: Update index.ts broadcast handler to use urgency**

In `handleBroadcast`, after the AI response comes back, read urgency and adjust:

```typescript
import { getUrgencyConfig } from './professionConfig';

// In handleBroadcast, replace hardcoded maxProviders/radiusMeters with:
const urgency = body.urgency || 'normal';  // from the AI analysis via the app
const urgencyConfig = getUrgencyConfig(urgency);
const maxProviders = urgencyConfig.maxProviders;
const radiusMeters = urgencyConfig.radiusMeters;
```

Also prepend the tone prefix to the WhatsApp message for urgent requests:
```typescript
const tonePrefix = urgencyConfig.tonePrefix;
const message = tonePrefix + buildProviderMessage(body);
```

**Step 7: Run worker tests + typecheck**

Run: `cd workers/broker && npm test && npx tsc --noEmit`
Expected: All pass

**Step 8: Commit**

```bash
git add workers/broker/src/professionConfig.ts workers/broker/src/professionConfig.test.ts
git add workers/broker/src/googlePlaces.ts workers/broker/src/index.ts
git commit -m "refactor: replace hardcoded profession maps with professionConfig + urgency"
```

---

## Task 5: Update the app to pass urgency to the worker

**Files:**
- Modify: `src/services/broadcast/broadcastService.ts` — add urgency to BroadcastInput
- Modify: `app/capture/confirm.ts` — pass urgency from AI response to broadcast

**Step 1: Update BroadcastInput interface**

```typescript
export interface BroadcastInput {
  requestId: string;
  professions: string[];
  shortSummary: string;
  mediaUrls: string[];
  location: { lat: number; lng: number; address: string };
  urgency?: string;  // NEW: from AI analysis
}
```

**Step 2: Update confirm.tsx to pass urgency**

In the confirm screen where `broadcastToProviders` is called, add the urgency field from the AI analysis result:

```typescript
broadcastToProviders({
  requestId: request.id,
  professions: aiResult.professions,
  shortSummary: aiResult.shortSummary,
  mediaUrls: mediaUrls,
  location: userLocation,
  urgency: aiResult.urgency || 'normal',  // NEW
});
```

**Step 3: Run app typecheck**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: clean

**Step 4: Commit**

```bash
git add src/services/broadcast/broadcastService.ts app/capture/confirm.tsx
git commit -m "feat: pass urgency from AI analysis to worker broadcast"
```

---

## Task 6: Deploy and verify end-to-end

**Step 1: Deploy the worker**

```bash
cd workers/broker && npx wrangler deploy
```

**Step 2: Run full test suites**

```bash
# App
cd C:\Users\roeea\OneDrive\Documents\Github\ai-fixly
npx jest

# Worker
cd workers/broker
npm test
```

Expected: All tests pass in both.

**Step 3: Manual verification via wrangler tail**

1. Start `npx wrangler tail`
2. Create a request in the app for "ברז מטפטף" (dripping faucet)
3. Verify the log shows `professions=plumber` and `urgency=flexible`
4. Create a request for "הצפה בבית" (flooding)
5. Verify the log shows `professions=plumber` and `urgency=urgent`
6. Verify the urgent request uses `radiusMeters=40000` and `maxProviders=10`
7. Create a request for "שמלה קרועה" (torn dress)
8. Verify the log shows `professions=seamstress` (NOT handyman)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete problem matrix implementation — 29 professions, 227 problems, urgency-driven search"
```

---

## Summary of deliverables

| Task | What | Tests |
|------|------|-------|
| 1 | `problemMatrix.ts` — 29 professions, 227 problems, 10 domains | 10 data integrity tests |
| 2 | `promptGenerator.ts` — auto-generated Gemini prompt | 6 tests |
| 3 | Wire prompt into AI service | Existing tests stay green |
| 4 | `professionConfig.ts` — worker profession/urgency config | 8 tests |
| 5 | App passes urgency to worker | Typecheck |
| 6 | Deploy + manual verification | 3 manual test cases |

**Total new tests:** ~24
**Total problems populated:** ~227
**Total professions:** 29
