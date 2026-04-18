# providers-seed.csv — how it was built

## What's in the file

`scripts/providers-seed.csv` — UTF-8 with BOM, opens cleanly in Excel
with Hebrew rendering. 315 rows across 13 professions, all within the
Sharon / Emek Hefer service area (Netanya · Hadera · Emek Hefer ·
Pardes Hanna–Karkur · Or Akiva).

Columns:

```
שם עסק, מקצוע, טלפון, עיר, דירוג בגוגל
```

Row counts per profession (as of the first run):

| מקצוע | rows |
|---|---|
| אינסטלטור | 35 |
| הנדימן | 30 |
| הובלות | 30 |
| מדביר | 28 |
| גנן | 28 |
| טכנאי מיזוג אוויר | 27 |
| טכנאי מחשבים | 26 |
| נגר | 25 |
| מנעולן | 22 |
| חשמלאי | 22 |
| טכנאי דודי שמש | 19 |
| צבעי | 13 |
| טכנאי מוצרי חשמל | 10 |

## How the data was collected

Google Maps (via scripted browser automation) for each
`{profession} עמק חפר` query, scrolling the left-panel feed to load
~30 results per search, then dedupe by phone number. Every phone is a
real Israeli mobile / landline — confirmed against the `tel:` links on
Google Maps business cards.

Phones in `072-XXX-XXXX` format that Dapey Zahav (d.co.il) exposes
were intentionally excluded — those are the directory's own lead-
capture forwarding numbers, not real business lines, and they don't
accept WhatsApp.

`midrag.co.il` was tried first — it has great business names + reviews
but hides phones behind its own "call" button (lead-capture business
model). Not useful for our WhatsApp broadcast pipeline.

## Running again / extending

There's a secondary script at `scripts/scrape-providers.ts` that uses
the Google Places API (New) for programmatic scraping. It costs money
(~$25 for a full 80-profession sweep, well inside Google's $200/mo
free credit). Instructions:

```bash
export GOOGLE_PLACES_API_KEY=your_key_here
npx tsx scripts/scrape-providers.ts
```

Prefer the Places API path for expansions (more professions, more
cities): it's deterministic, billable, and easy to automate. The
Maps-scraping path we used here is great for "get me real data RIGHT
NOW" without waiting for a new API key to be provisioned.

## What's intentionally NOT here

- **Ratings are empty.** Google Maps's rating rendering varies — some
  business cards expose the number in aria text, others hide it behind
  a mouseover. Rather than produce partial data we left the column
  empty; the broker fills it in at broadcast time from Places.
- **Pure service/commercial categories mixed in.** Some results may be
  "plumbing supply store" rather than "plumber". The customer-facing
  broadcast flow tolerates this (provider can decline) but if you want
  pristine data, cull those rows by hand.
