# AI analysis latency — design

## Goal

Cut the visible "Analyzing…" wait from ~20 s to near-zero for the majority
of requests without sacrificing classification quality.

## Root cause

Images are picked at `quality: 0.8` from expo-image-picker but never
resized. A 4K photo → 2–4 MB base64 → slow upload to Gemini. Model
latency is a small share.

## Changes

1. **Image resize** — install expo-image-manipulator. Before each call to
   Gemini, resize every image to `maxDim=1024 px, quality=0.6`. Expected
   payload drop: 10–30×.

2. **Parallel kickoff** — fire `aiAnalysisService.analyzeIssue()` from the
   capture screen's handleAnalyze, BEFORE navigating to /capture/confirm.
   Result lives in a module-scope `analysisStore`. Confirm mounts and
   subscribes; renders instantly if the promise is already settled.

3. **Better waiting UI** — replace rotating tips with a centrepiece that
   cycles through the main professions (plumber / electrician / locksmith /
   HVAC / handyman) with icon + Hebrew label, smoothly fading. Progress
   text below cycles "מזהה את הבעיה…" → "מחפש התאמות…" → "כמעט שם…" on
   time, not real phases.

4. **Model fallback** — extend the existing three-model fallback to also
   log each failure prominently with a `[gemini-fallback]` tag + duration
   so we notice if the primary model is chronically sick. On FINAL failure
   (all three models down) ship a Sentry breadcrumb + a visible admin alert
   WhatsApp so we know to intervene.

5. **Performance logging** — wrap the whole analyzeIssue call with
   `Date.now()`, emit `[perf] gemini.analyzeIssue Xms imgs=N payloadKB=Y
   model=gemini-2.5-flash`. These show up in the Metro log AND in Sentry
   breadcrumbs.

## Explicitly NOT doing

- **Not downgrading the model.** 2.5-flash is newer and faster than 1.5-
  flash; the user asked to stay on the existing model and that's what we'll
  do.
- **No manual-choice chips** per user decision.
- **No local model / on-device inference.** Out of scope.

## Expected latency after changes

| Scenario | Before | After |
|---|---|---|
| 3 photos, good network | ~20 s | ~2 s actual, ~0-1 s visible |
| 3 photos, slow network | ~40 s | ~4 s actual, ~2 s visible |
| 1 photo | ~10 s | ~1 s actual, invisible |
