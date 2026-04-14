# Problem-to-Professional Matrix — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a single source of truth mapping ~227 specific home-service problems to 29 professions, with urgency levels that drive search aggressiveness. Replace the current ad-hoc AI prompt hints with a comprehensive, structured knowledge base.

**Architecture:** One TypeScript data file (`src/constants/problemMatrix.ts`) defines all professions, domain categories, and problems. A prompt generator (`src/services/ai/promptGenerator.ts`) auto-generates the Gemini prompt from this data. The worker reads urgency from the same data (via a shared constants import or inline lookup) to adjust search radius and provider count.

**Tech Stack:** TypeScript (shared types), Gemini 2.5-flash (AI classification), Cloudflare Worker (search aggressiveness).

---

## 1. Data Model

### Profession (29 total)

```typescript
export type Urgency = 'urgent' | 'normal' | 'flexible';

export type ProfessionKey =
  | 'plumber' | 'electrician' | 'hvac_contractor' | 'locksmith'
  | 'home_appliance_repair' | 'computer_repair' | 'mobile_repair'
  | 'tv_repair' | 'painter' | 'cleaning_service' | 'moving_company'
  | 'roofer' | 'carpenter' | 'gardener' | 'seamstress'
  | 'upholsterer' | 'glazier' | 'handyman'
  | 'gas_technician' | 'exterminator' | 'shutter_technician'
  | 'waterproofing_specialist' | 'tiler' | 'plasterer'
  | 'metalworker' | 'solar_water_heater_tech' | 'renovator'
  | 'door_installer' | 'security_camera_installer';

export interface Profession {
  key: ProfessionKey;
  labelHe: string;
  googlePlacesType: string | null;
  hebrewSearchQuery: string;
}
```

### Problem (~227 total, grouped into 10 domains)

```typescript
export interface Problem {
  id: string;
  descriptionHe: string;
  descriptionEn: string;
  keywords: string[];
  professions: ProfessionKey[];
  urgency: Urgency;
}

export interface DomainCategory {
  id: string;
  labelHe: string;
  labelEn: string;
  problems: Problem[];
}
```

### Exported constants

```typescript
export const PROFESSIONS: Profession[] = [ ... ];       // 29 entries
export const PROBLEM_MATRIX: DomainCategory[] = [ ... ]; // 10 domains
```

## 2. Domain Categories

| # | Domain ID | Hebrew | English | Problem Count |
|---|-----------|--------|---------|--------------|
| 1 | water | אינסטלציה ומים | Water & Plumbing | 22 |
| 2 | electrical | חשמל | Electrical | 20 |
| 3 | hvac | מיזוג אוויר | HVAC & Cooling | 16 |
| 4 | appliances | מוצרי חשמל | Appliances | 20 |
| 5 | furniture | רהיטים ונגרות | Furniture & Wood | 18 |
| 6 | renovation | שיפוצים וצבע | Renovation & Walls | 22 |
| 7 | tech | מחשבים וסלולר | Tech & Mobile | 18 |
| 8 | locks | מנעולנות | Locks & Keys | 10 |
| 9 | outdoors | גינון וחצר | Outdoors & Gardening | 14 |
| 10 | general | בד, זכוכית ושונות | Fabric, Glass & General | 67 |

**Total: ~227 problems across 29 professions.**

## 3. Urgency Logic

Urgency is INTERNAL — never shown to the customer. Drives worker search behavior:

| Urgency | Meaning | Search Radius | Max Providers | WhatsApp Tone |
|---------|---------|--------------|---------------|---------------|
| `urgent` | Delay causes damage (flood, fire, gas, locked out, food spoilage) | 40km | 10 | "בקשה דחופה — הלקוח צריך עזרה מהר" |
| `normal` | Needs attention soon, no active damage | 20km (default) | 5 | Standard message |
| `flexible` | Planned/cosmetic, can wait days | 15km | 5 | Standard message |

**Distribution:** urgent ~10%, normal ~30%, flexible ~60%.

## 4. AI Prompt Generation

### Current state (broken)
The AI prompt in `prompts.ts` has a hardcoded list of 18 professions with ~5-word hints each. Insufficient for accurate matching (dress → handyman bug).

### New state
A function `generateAnalysisPrompt(matrix)` auto-generates the Gemini prompt from the problem matrix data:

1. Lists all 29 professions with their Hebrew labels
2. Groups problems by domain as reference examples
3. Includes explicit disambiguation rules (derived from multi-profession problems)
4. Returns the full prompt string

The prompt template structure:
```
You are a profession-identifier AI...

PROFESSIONS:
- plumber (אינסטלטור)
- electrician (חשמלאי)
...

PROBLEM REFERENCE (use these as examples for matching):

## Water & Plumbing
- burst_pipe (צינור פרוץ) → [plumber] URGENT
- leaking_faucet (ברז מטפטף) → [plumber]
...

## Electrical
- sparking_outlet (שקע מוציא ניצוצות) → [electrician] URGENT
...

DISAMBIGUATION RULES:
- Clothing/fabric → seamstress (NOT handyman)
- Solar water heater → solar_water_heater_tech (NOT plumber)
- Metal fences/gates → metalworker (NOT handyman)
...
```

### Token budget
~227 problems × ~30 tokens each ≈ 7,000 tokens. Plus professions list + rules ≈ 2,000. Total prompt ≈ 9,000 tokens. Gemini 2.5-flash handles this trivially (1M context).

## 5. Worker Integration

### Search aggressiveness
The worker receives `professions` from the AI analysis. It also needs `urgency`. Two options:

**Option A (chosen):** The worker maintains a local lookup `PROBLEM_URGENCY: Record<string, Urgency>` that maps problem IDs to urgency. The AI returns a `problemId` alongside `professions`, and the worker uses it to look up urgency.

**Option B (rejected):** The AI prompt also returns urgency directly. Simpler but puts trust in the AI to classify urgency correctly (we want urgency to be deterministic from the matrix, not AI-guessed).

### AI response schema (updated)
```json
{
  "professions": ["plumber"],
  "professionLabelsHe": ["אינסטלטור"],
  "problemId": "burst_pipe",
  "urgency": "urgent",
  "shortSummary": "צינור פרוץ בחדר רחצה"
}
```

The worker validates `urgency` against the matrix. If the AI returns a valid problemId, use the matrix's urgency. If not, fall back to "normal".

### Broadcast adjustments
```typescript
const config = URGENCY_CONFIG[urgency];
// config = { radiusMeters: 40000, maxProviders: 10, tonePrefix: "בקשה דחופה" }
```

## 6. Files to Create/Modify

### New files
- `src/constants/problemMatrix.ts` — the matrix data (professions + domains + problems)
- `src/services/ai/promptGenerator.ts` — generates Gemini prompt from matrix
- `src/services/ai/promptGenerator.test.ts` — tests for prompt generation
- `workers/broker/src/urgencyConfig.ts` — urgency → search config mapping

### Modified files
- `src/services/ai/prompts.ts` — replace hardcoded prompt with generated one
- `workers/broker/src/googlePlaces.ts` — use PROFESSIONS from matrix for type/query mapping (replaces local maps)
- `workers/broker/src/index.ts` — read urgency from AI response, adjust radius/maxProviders
- `src/services/ai/geminiAnalysis.ts` — update to pass the generated prompt

## 7. Migration

- Old bids/requests in Firestore don't have `problemId`. That's fine — the field is optional.
- The AI prompt change is backward-compatible: it still returns `professions` + `professionLabelsHe` + `shortSummary`.
- New field `problemId` + `urgency` are additive.

## 8. Testing

- **Unit tests:** promptGenerator produces valid prompt string with all professions and problems
- **Unit tests:** urgency config returns correct radius/providers for each level
- **Integration test (manual):** create requests for 10 different problem types, verify correct profession match via wrangler tail
- **Regression test:** the "dress → seamstress" case that originally broke
