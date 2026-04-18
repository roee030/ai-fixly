# scrape-providers — populate providers-seed.csv

Collects up to 20 real service providers per profession from Google
Places (across 10 Israeli cities), dedupes, writes to a Hebrew-friendly
CSV at `scripts/providers-seed.csv`.

## Prerequisites

- Node 20+ with `tsx` available (install once: `npm i -g tsx`).
- A Google Places API key with the **Places API (New)** enabled. If you
  don't have one, create a restricted key at
  https://console.cloud.google.com/apis/credentials — set an application
  restriction to your own IP and an API restriction to "Places API (New)".

## Run

```bash
export GOOGLE_PLACES_API_KEY=your_key_here    # PowerShell: $env:GOOGLE_PLACES_API_KEY="..."
npx tsx scripts/scrape-providers.ts
```

Runs ~10–20 minutes for the full 80-profession × 10-city sweep. Writes
incrementally (append-per-profession), so a Ctrl-C or crash doesn't lose
earlier work — just rename / delete the partial CSV if you want a clean
restart.

## Output

- `scripts/providers-seed.csv` — UTF-8 with BOM, opens cleanly in Excel
  with Hebrew rendering. Columns:

  ```
  שם עסק, מקצוע, טלפון, עיר, דירוג בגוגל
  ```

- Progress lines stream to stderr:

  ```
  [places] profession=אינסטלטור city=תל אביב found=12
  [scraper] ✓ אינסטלטור                    rows=20 (total=20)
  ```

  Redirect them to a file if you want a permanent run log:

  ```bash
  npx tsx scripts/scrape-providers.ts 2> run.log
  ```

## Expected coverage

- The 10 cities cover ~80% of Israel's population. Mainstream professions
  (אינסטלטור, חשמלאי, מנעולן, טכנאי מיזוג) will comfortably hit 20.
- Niche professions in `PROFESSIONS` (snake_catcher, glass_design,
  mouse_catcher, stone_polishing, parquet_installer, etc.) will return
  fewer — sometimes 0 — because Google Places doesn't have them
  categorised. That's listed by the script at the end:

  ```
  [scraper] Professions with < 10 rows:
    - לוכד נחשים            1 rows
    - עיצוב זכוכית            0 rows
  ```

  Either accept the gap or expand to more cities (edit `CITIES` in the
  script).

## Cost

Google gives you $200/month free Places credit (~6250 text-search
calls). A full run is `80 × 10 = 800` calls, or about $25-30 worth of
credit. Well under free tier unless you run it repeatedly in the same
month.

## What's intentionally NOT included

- **No midrag / b-hol-miktzoa HTML scraping.** Those sites are
  JS-rendered with anti-bot measures; selectors rot quickly. The
  Google Places-only pipeline gives us 80-100% of what we need with
  zero maintenance burden.
- **No phone normalisation.** The CSV keeps what Places returned
  (international E.164 when available). If you need `+972...` formatting
  enforced, normalise in a follow-up pass.
- **No Google-Maps URL column.** Not asked for; can add in 30 s if useful.
