# providers-seed.csv — how it was built

## What's in the file

`scripts/providers-seed.csv` — UTF-8 with BOM, opens cleanly in Excel
with Hebrew rendering. **1,320 rows across 77 professions**, every single
one inside the Netanya → Caesarea corridor (south → north).

Cities represented (from actual `formattedAddress`, not from the search
query):

| עיר | שורות |
|---|---|
| נתניה | 400 |
| חדרה | 276 |
| פרדס חנה / כרכור | 139 |
| אור עקיבא | 113 |
| כפר יונה | 107 |
| אבן יהודה | 83 |
| קדימה / צורן | 75 |
| תל מונד | 53 |
| קיסריה | 37 |
| עמק חפר וכפרים (בת חפר, משמר השרון, כפר ויתקין, עין החורש, מכמורת, חופית, עולש, גן יאשיה, בית חרות) | 37 |

Columns:

```
שם עסק, מקצוע, טלפון, עיר, דירוג בגוגל
```

## How the data was collected

**`scripts/scrape-providers.ts`** — Google Places API v1 (`searchText`).
For each of the 77 professions in `src/constants/problemMatrix.ts`, we
queried each of the 10 corridor cities (770 total searches). Every
result is filtered against `ALLOWED_CITY_TOKENS` based on the actual
`formattedAddress` Google returns — so a Tel Aviv locksmith that
Google helpfully surfaces for "מנעולן נתניה" gets rejected.

## Why not the old Maps-scraping approach

The previous iteration used Playwright to scroll
`google.com/maps/search/{profession} עמק חפר` and grab names + phones
from the left feed. It produced 1,202 rows — about 3/4 of which were
mis-tagged with "עמק חפר" because the scraper used the *search query*
as the city rather than reading the business's actual address. Businesses
from Tel Aviv, Haifa, and elsewhere slipped in when Google's relevance
score spilled over the geographic intent.

The old file is preserved at `scripts/providers-seed.OLD-maps-scrape.csv`
for reference.

## Running again / extending

```bash
export GOOGLE_PLACES_API_KEY=your_key_here
npx tsx scripts/scrape-providers.ts
```

Cost: ~$3-5 per full run on the Places API (Basic tier, 77 professions
× 10 cities × ~10-20 results). Well inside Google's $200/month free
credit, so in practice free. Runs ~5 minutes end-to-end with 5-way
concurrency.

To expand the service zone: edit the `CITIES` array (the search targets)
AND `ALLOWED_CITY_TOKENS` (the post-filter whitelist). Both live at the
top of `scripts/scrape-providers.ts`. Add new neighborhoods as literal
Hebrew strings that appear in formattedAddresses.

## Row counts per profession

| מקצוע | rows |  | מקצוע | rows |
|---|---|---|---|---|
| אינסטלטור | 20 | | חשמלאי | 20 |
| טכנאי מיזוג אוויר | 20 | | מנעולן | 20 |
| טכנאי מוצרי חשמל | 20 | | טכנאי מחשבים | 20 |
| טכנאי סלולר | 20 | | טכנאי טלוויזיה | 20 |
| צבעי | 20 | | חברת ניקיון | 20 |
| חברת הובלות | 20 | | גגן | 20 |
| נגר | 20 | | גנן | 20 |
| תופרת | 20 | | רפד | 20 |
| זגג | 20 | | מדביר | 20 |
| טכנאי תריסים | 20 | | קבלן איטום | 20 |
| רצף | 20 | | טייח / קבלן גבס | 20 |
| מסגר | 20 | | שיפוצניק | 20 |
| מתקין דלתות | 20 | | אינטרקום | 20 |
| דודי חשמל | 20 | | התקנת מטבחים | 20 |
| יועץ משכנתאות | 20 | | עבודות אלומיניום | 20 |
| פרגולות עץ | 20 | | דקים | 20 |
| מערכות אזעקה | 20 | | חברת אחזקה | 20 |
| מפקח בניה | 20 | | קונסטרוקטור | 20 |
| מעצב בית | 20 | | שירותי מנוף | 20 |
| שיש | 20 | | שמאי מקרקעין | 20 |
| שמאי רכוש | 20 | | תיקון שטיחים | 20 |
| מנעולן רכב | 20 | | הסרת עובש | 20 |
| מקלחונים | 20 | | עיצוב זכוכית | 20 |
| ניקוי ספות | 20 | | ניקוי שטיחים | 20 |
| מיניבוס | 20 | | ניקוי מזגנים | 20 |
| הובלות קטנות | 20 | | קולטי שמש | 20 |
| מתקין מצלמות | 19 | | ליטוש אבן | 19 |
| ניקיון משרדים | 19 | | איתור נזילות | 18 |
| טכנאי גז | 17 | | התקנת פרקטים | 17 |
| כריתת עצים | 17 | | מערכות סולאריות | 15 |
| רשתות לחלונות | 15 | | לוכד עכברים | 14 |
| צלחות לווין | 13 | | טכנאי דודי שמש | 12 |
| סוככים | 10 | | זיפות גגות | 10 |
| התקנת שטיחים מקיר לקיר | 9 | | בדק בית | 9 |
| הנדימן | 8 | | רשתות יתושים | 8 |
| מרחיק יונים | 7 | | סיוד | 6 |
| שערים ומחסומים | 5 | | לוכד נחשים | 4 |
| מחסום חשמלי | 4 | | רטיבות תת רצפתית | 4 |
| קידוח בטון | 1 |  |  |  |

Anything under 10 is a real gap — these niche trades genuinely have
few dedicated businesses in a small geographic corridor. The broker
can fall back to `הנדימן` for most of them when no dedicated provider
is available.
