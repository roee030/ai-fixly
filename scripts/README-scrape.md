# providers-seed.csv — how it was built

## What's in the file

`scripts/providers-seed.csv` — UTF-8 with BOM, opens cleanly in Excel
with Hebrew rendering. **1,202 rows across 77 professions**, all within
the Sharon / Emek Hefer service area (Netanya · Hadera · Emek Hefer ·
Pardes Hanna–Karkur · Or Akiva · Caesarea · Zichron Yaakov · Binyamina
· Kfar Yona · Pardes Hanna · adjacent Sharon towns that surface in the
Maps radius).

Columns:

```
שם עסק, מקצוע, טלפון, עיר, דירוג בגוגל
```

Row counts per profession (full sweep — covers every profession in
`src/constants/problemMatrix.ts`):

| מקצוע | rows |  | מקצוע | rows |
|---|---|---|---|---|
| אינסטלטור | 35 | | שמאי מקרקעין | 19 |
| עבודות אלומיניום | 31 | | שירותי מנוף | 19 |
| הנדימן | 30 | | טכנאי דודי שמש | 19 |
| הובלות | 30 | | זיפות גגות | 19 |
| פרגולות עץ | 29 | | דקים | 19 |
| מדביר | 28 | | שערים ומחסומים | 18 |
| גנן | 28 | | רצף | 17 |
| טכנאי מיזוג אוויר | 27 | | קונסטרוקטור | 17 |
| מעצב בית | 26 | | קבלן איטום | 17 |
| טכנאי מחשבים | 26 | | סוככים | 17 |
| נגר | 25 | | ניקיון משרדים | 17 |
| טכנאי גז | 25 | | ניקוי ספות | 17 |
| שיפוצניק | 24 | | מרחיק יונים | 17 |
| מתקין מצלמות | 23 | | כריתת עצים | 17 |
| מסגר | 22 | | עיצוב זכוכית | 16 |
| מנעולן | 22 | | דודי חשמל | 16 |
| חשמלאי | 22 | | לוכד נחשים | 15 |
| זגג | 22 | | צבעי | 13 |
| התקנת פרקטים | 21 | | רפד | 12 |
| התקנת מטבחים | 21 | | קולטי שמש | 12 |
| איתור נזילות | 21 | | מערכות סולאריות | 12 |
| מפקח בניה | 20 | | תופרת | 11 |
| יועץ משכנתאות | 20 | | סיוד | 11 |
| חברת ניקיון | 20 | | ניקוי שטיחים | 11 |
| חברת אחזקה | 20 | | ניקוי מזגנים | 11 |
| אינטרקום | 20 | | מקלחונים | 11 |
| שמאי רכוש | 19 | | טכנאי סלולר | 11 |
| טכנאי תריסים | 10 | | טכנאי מוצרי חשמל | 10 |
| טייח / קבלן גבס | 10 | | תיקון שטיחים | 9 |
| רשתות יתושים | 8 | | מיניבוס | 8 |
| התקנת שטיחים מקיר לקיר | 8 | | מתקין דלתות | 7 |
| ליטוש אבן | 7 | | מערכות אזעקה | 6 |
| הובלות קטנות | 6 | | שיש | 5 |
| מנעולן רכב | 5 | | הסרת עובש | 5 |
| גגן | 5 | | בדק בית | 5 |
| מחסום חשמלי | 4 | | לוכד עכברים | 4 |
| רשתות לחלונות | 3 | | טכנאי טלוויזיה | 3 |
| רטיבות תת רצפתית | 2 | | קידוח בטון | 2 |
| צלחות לווין | 2 | |  |  |

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
