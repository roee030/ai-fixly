# ai-fixly — מדריך תפעול וסביבה

מסמך יחיד עם כל המידע על איך מפעילים את המערכות, מה השירותים החיצוניים, ומה צריך להגדיר לכל אחד.

---

## 1. אימות טלפון (Phone OTP) — איך לגרום שזה יעבוד בפלאפון

### איך זה עובד היום
- **Web** (`firebaseAuth.web.ts`) → משתמש ב-**invisible reCAPTCHA** של Firebase Auth
- **Native** (`firebaseAuth.ts`) → משתמש ב-`@react-native-firebase/auth` שדורש:
  - **Android**: Play Integrity API (מופעל אוטומטית דרך SHA-1 fingerprint)
  - **iOS**: APNs silent push (דורש ה-push notification certificate)

### למה OTP אולי לא מגיע אליך בפלאפון

**בדיקה 1: האם המספר שלך ברשימה ה"authorized" של Firebase?**

בזמן development, Firebase דורש שכל מספר טלפון שאתה שולח אליו OTP יהיה ב-**Phone numbers for testing** אלא אם כן כבר נרשמת דרך אותו מספר לפני כן.

1. לך ל-https://console.firebase.google.com/
2. בחר את הפרויקט **fixly-c4040**
3. Authentication → Sign-in method → **Phone**
4. גלול למטה ל-**Phone numbers for testing (optional)**
5. הוסף את המספר שלך + קוד OTP קבוע (למשל: `+972501234567` → `123456`)
6. עכשיו כשתיכנס עם המספר הזה, תוכל להזין את הקוד הקבוע בלי שיישלח באמת SMS

**בדיקה 2: האם יש לך SHA-1 רשום ב-Firebase (Android)?**

לבניית APK/AAB לdebug ולproduction, שתיהן צריכות SHA-1 רשום:

```bash
# SHA-1 של מפתח ה-debug (לריצה מקומית)
cd /c/Users/roeea/.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# SHA-1 של EAS (לבילד production)
eas credentials
```

אחרי שיש לך SHA-1, ב-Firebase Console:
- Project settings → General → Your apps → Android app → **Add fingerprint** → הדבק SHA-1

**בדיקה 3: iOS — APNs Authentication Key**

עבור iOS, Firebase דורש APNs Authentication Key מ-Apple Developer:
1. Apple Developer → Keys → `+` → Apple Push Notifications service (APNs)
2. הורד את `.p8`
3. Firebase Console → Project settings → Cloud Messaging → iOS app → **APNs Authentication Key** → Upload

**בדיקה 4: App quota / billing**
- Firebase Auth מספק **10K בדיקות בחינם בחודש** ב-Spark plan. מעבר לזה — דרוש Blaze.

---

## 2. WhatsApp — הגדרות מלאות

### מה זה משתמש בו
**Twilio WhatsApp Business API** — ה-Cloudflare Worker (`workers/broker`) שולח הודעות דרך Twilio.

### מה צריך להיות מוגדר

**ב-Twilio Console** (https://console.twilio.com):
1. יש לך כבר account עם:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` — המספר ששולח (sandbox: `whatsapp:+14155238886`)

2. **ב-Sandbox (מצב dev/חינם):**
   - כל בעל מקצוע שאתה רוצה לבדוק איתו חייב **להצטרף לסנדבוקס** לפני שיקבל הודעות
   - הוא שולח ל-`+1 415 523 8886` את ההודעה `join <sandbox-code>` (הקוד ב-Twilio Console)
   - רק אז הוא יקבל הודעות ממך
   - תוקף הסנדבוקס: **72 שעות** מרגע שהוא joined — אחרי זה צריך join מחדש

3. **Production (אחרי אישור):**
   - צריך לעבור את תהליך ה-WhatsApp Business Verification (Meta דרישה)
   - Business verification דרך Meta Business Manager
   - תבקש Phone Number מ-Twilio (לא sandbox)
   - זה נגמר עם `whatsapp:+972XXXXXXXXX` אמיתי

### איך הסקריפט יודע את הפרטים
ה-secrets מוגדרים דרך Wrangler, לא מ-`.env`:

```bash
cd workers/broker
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put TWILIO_WHATSAPP_FROM
```

### DRY_RUN מצב (לבדיקות בלי לשלוח הודעות אמיתיות)
```bash
cd workers/broker
npx wrangler secret put DRY_RUN
# הזן: true
```
במצב זה — ה-worker מחזיר מה היה *אמור* להישלח, בלי באמת לשלוח. מאפשר לבדוק את כל הזרימה בלי להשתמש בהודעות.

### Webhook Configuration
ב-Twilio Console → Messaging → Try it out → WhatsApp Sandbox Settings:
- **When a message comes in:** `https://ai-fixly-broker.mr-roee-angel.workers.dev/whatsapp/incoming`
- Method: POST

בלי ההגדרה הזו, כשבעל מקצוע מגיב ב-WhatsApp — הבקשה לא מגיעה ל-worker ולא נוצר bid באפליקציה.

---

## 3. כל השירותים החיצוניים (סיכום)

### 🔥 Firebase (חשבון `fixly-c4040`)
**למה משתמשים:**
- Authentication (phone OTP)
- Firestore (database)
- Firebase Storage (unused — הוחלף ב-Supabase)
- Cloud Messaging (FCM push notifications)
- Analytics / Crashlytics
- Remote Config (feature flags)

**איך להפעיל/לבדוק:**
- Console: https://console.firebase.google.com/project/fixly-c4040
- כל ההגדרות ב-`.env` עם prefix `EXPO_PUBLIC_FIREBASE_*`
- Firestore rules: `firebase/firestore.rules` → פריסה: `npm run deploy:rules`

### 🗄️ Supabase Storage
**למה:** העלאת תמונות (Firebase Storage היה דורש Blaze plan)

**איך להפעיל:**
- Dashboard: https://supabase.com/dashboard
- Bucket: `media` (ציבורי לקריאה, כתיבה רק עם auth)
- ENV: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 🤖 Gemini AI (Google AI Studio)
**למה:**
- ניתוח תמונות של בעיות
- סיווג למקצועות
- פרסור תשובות בעלי מקצוע מ-WhatsApp

**איך להפעיל:**
- Console: https://aistudio.google.com/apikey
- Key: `EXPO_PUBLIC_GEMINI_API_KEY` ב-`.env`
- גם ב-worker: `npx wrangler secret put GEMINI_API_KEY`

### 📍 Google Places API
**למה:** חיפוש בעלי מקצוע אמיתיים לפי אזור וקטגוריה

**איך להפעיל:**
- Console: https://console.cloud.google.com/apis/credentials
- דרוש **Places API (New)** מופעל
- דרוש **billing מופעל** (אחרת יחזיר errors שקטים)
- Secret ב-worker: `npx wrangler secret put GOOGLE_PLACES_API_KEY`
- ה-cache ב-KV מוריד עלות: `workers/broker/wrangler.toml` → `PLACES_CACHE`

### 📱 Twilio WhatsApp
*(ראה סעיף 2 לעיל)*

### ☁️ Cloudflare Workers (Broker)
**למה:** מתווך בין האפליקציה לשירותים חיצוניים (WhatsApp, Places, Gemini). נמנע מחשיפת keys באפליקציה.

**איך להפעיל:**
- URL: `https://ai-fixly-broker.mr-roee-angel.workers.dev`
- Dashboard: https://dash.cloudflare.com → Workers & Pages → `ai-fixly-broker`
- Deploy: `npm run deploy:worker`
- Secrets: `cd workers/broker && npx wrangler secret put <NAME>`
- KV store: `PLACES_CACHE` (caching)

### ☁️ Cloudflare Pages (Web Deploy)
**למה:** hosting ל-web version של האפליקציה

**איך להפעיל:**
- URL: https://ai-fixly-web.pages.dev
- Dashboard: https://dash.cloudflare.com → Workers & Pages → `ai-fixly-web`
- Deploy: `npm run deploy:web`
- **⚠️ לא מחובר ל-Git** — חייב להריץ deploy ידנית אחרי שינויים

### 🐛 Sentry
**למה:** error tracking (רק native, לא web)

**איך להפעיל:**
- Dashboard: https://sentry.io
- ENV: `EXPO_PUBLIC_SENTRY_DSN` ב-`.env`
- אם DSN ריק → Sentry מושבת (fallback בטוח)

### 🏗️ EAS Build (Expo)
**למה:** בילד של APK/AAB/IPA לחנויות

**איך להפעיל:**
- Config: `eas.json`
- בילד: `eas build --platform android --profile preview`
- OTA update (בלי בילד מחדש): `eas update --branch production`

---

## 4. פקודות יומיומיות

| מה אתה רוצה לעשות | פקודה |
|---|---|
| להריץ את האפליקציה מקומית | `npm start` |
| להריץ על Android | `npm run android` |
| להריץ על iOS | `npm run ios` |
| לבנות web | `npm run build:web` |
| deploy web | `npm run deploy:web` |
| deploy worker (WhatsApp broker) | `npm run deploy:worker` |
| deploy Firestore rules | `npm run deploy:rules` |
| deploy הכל (web + worker) | `npm run deploy:all` |
| בדיקות | `npm test` |
| בדיקות worker | `npm run test:worker` |

---

## 5. Checklist כשפותחים סביבה חדשה (מחשב חדש)

- [ ] `.env` עם כל ה-keys (מהעתק ידני, לא ב-git)
- [ ] `fixly-c4040-firebase-adminsdk-*.json` בתיקייה השורשית (gitignored)
- [ ] `npm install`
- [ ] `cd workers/broker && npm install`
- [ ] `npx wrangler login` (פעם ראשונה בלבד)
- [ ] לבדוק שמספר הטלפון שלך ב-Firebase Auth → Phone → Testing numbers

---

## 6. פתרון תקלות נפוצות

### "OTP לא מגיע"
1. בדוק ש-Firebase Phone Auth מופעל (לא disabled)
2. אם Android — SHA-1 רשום ב-Firebase
3. אם iOS — APNs Key הועלה ל-Firebase
4. בדוק את quota (10K/חודש בחינם)
5. בדוק שהמספר ב-E.164 format (`+972501234567` לא `0501234567`)

### "בעל מקצוע לא מקבל WhatsApp"
1. אם sandbox — ודא שהוא עשה `join <code>` + לא עברו 72h
2. בדוק `DRY_RUN` secret ב-worker — אם `true`, לא נשלח כלום
3. בדוק webhook ב-Twilio Console מצביע ל-worker שלך
4. בדוק secrets ב-worker: `cd workers/broker && npx wrangler secret list`

### "bid לא מופיע באפליקציה אחרי שבעל מקצוע ענה"
1. ודא ש-Twilio webhook מגדיר להגיע ל-`/whatsapp/incoming`
2. בדוק logs של ה-worker: `cd workers/broker && npx wrangler tail`
3. ודא ש-`GEMINI_API_KEY` תקף (פרסור התשובה נעשה דרכו)

### "Deploy web לא מתעדכן"
1. ודא שאתה מריץ `npm run deploy:web` (לא רק push ל-git!)
2. המתן 30-60 שניות ובדוק ב-incognito window (cache)
3. בדוק את ה-etag בהתאם למה שתיארנו — אם לא השתנה, ה-deploy כשל

### "Worker לא מגיב"
1. `cd workers/broker && npx wrangler tail` — רואה request-ים live
2. בדוק `EXPO_PUBLIC_BROKER_URL` ב-`.env` שווה ל-URL של ה-worker
3. בדוק CORS headers בקוד ה-worker

---

## 7. פרטים חשובים להזכיר לעצמך

- **Primary language:** עברית, RTL
- **Target market:** ישראל בלבד (geofence ב-`src/constants/serviceZone.ts`)
- **Production branch:** `main` (ב-Cloudflare Pages)
- **Cloudflare Pages NOT Git-connected** — חייב wrangler deploy ידני
- **Twilio WhatsApp sandbox** — פג תוקף ל-providers אחרי 72h
- **Firebase billing:** Spark (free) — אין Cloud Functions, זה למה worker חיצוני
- **Admin UID** (for dev tools): `6sLBVwm1vyWSDjkrK0DffMIJ2i03`
