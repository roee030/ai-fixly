/**
 * ai-fixly — מצגת משקיעים (עברית).
 *
 * מייצר `ai-fixly-investor-deck.pptx` באותה תיקייה.
 *
 * פלטה: "Deep Indigo & Warm Gold" — כחול אינדיגו עמוק + זהב חם + אלמון רך.
 * עיצוב פרימיום בדמות אפליקציה עצמה: רקעים כהים בשקפי פתיחה/סיום,
 * רקעים בהירים בין לבין (מבנה "סנדוויץ'"), מוטיב עקבי של קלף עם פס דק
 * בצד ימין (כי עברית RTL).
 *
 * גופנים:
 *   - כותרות: Rubik (מודרני, פופולרי בעברית) — נופל ל-Arial אם לא מותקן
 *   - גוף:    Arial (זמין בכל מחשב)
 */

const path = require('path');
const pptxgen = require(path.join(
  'C:\\Users\\roeea\\AppData\\Roaming\\npm\\node_modules',
  'pptxgenjs',
));

// ── פלטה ─────────────────────────────────────────────────────────────────
const C = {
  // Indigo scale
  indigoDeep: '0A0B2E',  // כחול-שחור לרקעים כהים
  indigo:     '1A1B4B',  // אינדיגו ראשי
  indigoSoft: '2D2F6E',  // אינדיגו רך לקלפים כהים
  ice:        'E8ECFC',  // כחול-לבן לטקסט על רקע כהה
  cream:      'F7F3ED',  // קרם חם לרקע בהיר
  paper:      'FBFAF7',  // לבן חמים לקלפים
  // Accent
  gold:       'E5B77A',  // זהב חם — מספרים ומטבעות
  coral:      'F97066',  // אלמון — אזהרות/סטטיסטיקה
  sage:       '84A98C',  // ירוק-שקד — מיתון/"טוב"
  // Neutrals
  ink:        '0F172A',  // טקסט ראשי
  subtext:    '4A5568',  // טקסט משני
  muted:      '94A3B8',  // טקסט עמום
  hairline:   'E2E8F0',  // קו מפריד
};

// כותרת: Rubik (Google Fonts — פופולרי בישראל). אם לא מותקן, נופל ל-Arial.
// גוף: Arial — זמין אוניברסלית.
const FONT_HEAD = 'Rubik';
const FONT_BODY = 'Arial';

// ── צילומי מסך ───────────────────────────────────────────────────────────
const SHOTS = path.resolve(__dirname, '..', 'screenshots');
const shot = (name) => path.join(SHOTS, name);

// המוקאפים מרונדרים 430×900. שומרים את היחס כדי שהטלפון לא ימתח.
const PHONE_RATIO = 430 / 900;
function phoneSize(h) {
  return { w: +(h * PHONE_RATIO).toFixed(3), h };
}

// ── Presentation ─────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'ai-fixly';
pres.title = 'ai-fixly — מצגת משקיעים';
pres.company = 'ai-fixly';
pres.subject = 'מצגת משקיעים: מוצר, שוק, טראקשן, בקשה';

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const TOTAL = 14;

// ── עזרים ────────────────────────────────────────────────────────────────

/**
 * רקע נקי + קו זהב דק במעלה השקף כמוטיב חוזר.
 * כל שקף תוכן מתחיל בזה.
 */
function lightBg(slide) {
  slide.background = { color: C.paper };
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SLIDE_W, h: 0.06,
    fill: { color: C.gold }, line: { color: C.gold },
  });
}

function darkBg(slide) {
  slide.background = { color: C.indigoDeep };
}

/** כותרת + תת-כותרת בפינה הימנית של השקף (RTL). */
function addTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.5, y: 0.35, w: 9, h: 0.8,
    fontSize: 34, fontFace: FONT_HEAD, bold: true, color: C.indigo,
    align: 'right', rtlMode: true, margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.1, w: 9, h: 0.4,
      fontSize: 14, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, margin: 0,
    });
  }
  // גרש דק מתחת לכותרת — מוטיב עקבי.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 8.8, y: 1.6, w: 0.7, h: 0.04,
    fill: { color: C.gold }, line: { color: C.gold },
  });
}

function addFooter(slide, pageNum) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: SLIDE_H - 0.3, w: SLIDE_W, h: 0.3,
    fill: { color: C.indigo }, line: { color: C.indigo },
  });
  slide.addText('ai-fixly', {
    x: SLIDE_W - 2, y: SLIDE_H - 0.3, w: 1.8, h: 0.3,
    fontSize: 10, fontFace: FONT_HEAD, bold: true, color: C.gold,
    align: 'right', valign: 'middle', margin: 0,
  });
  slide.addText(`${pageNum} / ${TOTAL}`, {
    x: 0.4, y: SLIDE_H - 0.3, w: 0.8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.ice,
    align: 'left', valign: 'middle', margin: 0,
  });
}

/** מסגרת טלפון: בזל שחור עגול סביב הצילום. */
function addPhone(slide, imgPath, x, y, h) {
  const { w, h: ph } = phoneSize(h);
  const BEZEL = 0.08;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x - BEZEL, y: y - BEZEL, w: w + BEZEL * 2, h: ph + BEZEL * 2,
    fill: { color: '0A0A0F' }, line: { color: '1F2937', width: 1 },
    rectRadius: 0.22,
    shadow: { type: 'outer', blur: 14, offset: 4, angle: 135, color: '000000', opacity: 0.28 },
  });
  slide.addImage({
    path: imgPath, x, y, w, h: ph,
    sizing: { type: 'cover', w, h: ph },
  });
}

/** קלף מובנה (רקע לבן + צל רך + פס מבטא בימין כי RTL). */
function addCard(slide, x, y, w, h, accentColor) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: C.paper }, line: { color: C.hairline, width: 1 },
    rectRadius: 0.12,
    shadow: { type: 'outer', blur: 10, offset: 2, angle: 135, color: '000000', opacity: 0.06 },
  });
  // פס מבטא בצד ימין (כי קוראים עברית מימין לשמאל)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + w - 0.08, y, w: 0.08, h,
    fill: { color: accentColor || C.gold }, line: { color: accentColor || C.gold },
  });
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 1 — פתיחה
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);

  // "fixly" ענק ברקע — יוצר עומק ויזואלי בלי להתיש.
  s.addText('fixly', {
    x: 0, y: 1.6, w: SLIDE_W, h: 3.3,
    fontSize: 260, fontFace: FONT_HEAD, bold: true, color: C.indigoSoft,
    align: 'center', valign: 'middle', margin: 0, charSpacing: -6,
  });

  // חותמת בפינה העליונה הימנית.
  s.addShape(pres.shapes.RECTANGLE, {
    x: 8.2, y: 0.5, w: 1.2, h: 0.04,
    fill: { color: C.gold }, line: { color: C.gold },
  });
  s.addText('ai-fixly', {
    x: 7, y: 0.55, w: 2.4, h: 0.4,
    fontSize: 15, fontFace: FONT_HEAD, bold: true, color: C.gold,
    align: 'right', letterSpacing: 2, margin: 0,
  });

  // כותרת ראשית — באנגלית כי השם שלנו באנגלית, אבל התת-כותרת בעברית.
  s.addText('האובר של תיקוני הבית.', {
    x: 0.5, y: 2.1, w: 9, h: 1.0,
    fontSize: 54, fontFace: FONT_HEAD, bold: true, color: C.paper,
    align: 'center', rtlMode: true, margin: 0,
  });

  s.addText([
    { text: 'צלם. ', options: { color: C.ice } },
    { text: 'ה-AI מוצא את בעל המקצוע. ', options: { color: C.ice } },
    { text: 'הצעות מחיר תוך דקות.', options: { color: C.gold, bold: true } },
  ], {
    x: 0.5, y: 3.3, w: 9, h: 0.55,
    fontSize: 17, fontFace: FONT_BODY,
    align: 'center', rtlMode: true, margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.7, y: 4.1, w: 0.6, h: 0.04, fill: { color: C.coral }, line: { color: C.coral },
  });

  s.addText('מצגת משקיעים · 2026', {
    x: 0.5, y: 5.0, w: 9, h: 0.4,
    fontSize: 11, fontFace: FONT_HEAD, color: C.muted,
    align: 'center', rtlMode: true, margin: 0, charSpacing: 3,
  });
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 2 — הבעיה
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'למצוא בעל מקצוע — עדיין נוראי.', 'לא השתנה כלום ב-20 שנה.');

  // ארבע נקודות כאב — טור ימני (עברית)
  const pains = [
    ['טלפון-רולטה',     'מתקשרים ל-5, 3 לא עונים, 2 "אחזור אליך" ונעלמו.'],
    ['מחיר מעורפל',    'אין מחיר עד שבעל המקצוע בדלת, ואז מאוחר מדי.'],
    ['טיולי סרק',      'בעל המקצוע מגיע, לא יכול לטפל, גובה דמי קריאה.'],
    ['אין סיגנל אמון', 'דירוג? ביקורות? שום דבר. בוחרים את מי שעונה.'],
  ];
  pains.forEach(([h, b], i) => {
    const y = 1.7 + i * 0.78;
    // עיגול אלמון עם X
    s.addShape(pres.shapes.OVAL, {
      x: 9.1, y: y + 0.1, w: 0.3, h: 0.3,
      fill: { color: C.coral }, line: { color: C.coral },
    });
    s.addText('×', {
      x: 9.1, y: y + 0.07, w: 0.3, h: 0.33,
      fontSize: 16, bold: true, color: C.paper,
      align: 'center', valign: 'middle', margin: 0, fontFace: FONT_HEAD,
    });
    s.addText(h, {
      x: 5.0, y, w: 4.0, h: 0.32,
      fontSize: 16, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'right', rtlMode: true, margin: 0,
    });
    s.addText(b, {
      x: 4.8, y: y + 0.34, w: 4.2, h: 0.44,
      fontSize: 11.5, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  // סטטיסטיקה ענקית בטור שמאל
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.7, w: 4.0, h: 3.1,
    fill: { color: C.indigo }, line: { color: C.indigo },
    rectRadius: 0.18,
  });
  s.addText('73%', {
    x: 0.5, y: 1.85, w: 4.0, h: 1.35,
    fontSize: 96, fontFace: FONT_HEAD, bold: true, color: C.gold,
    align: 'center', valign: 'middle', margin: 0,
  });
  s.addText('מהישראלים דוחים תיקונים בבית', {
    x: 0.5, y: 3.3, w: 4.0, h: 0.4,
    fontSize: 14, fontFace: FONT_HEAD, bold: true, color: C.paper,
    align: 'center', rtlMode: true, margin: 0,
  });
  s.addText('כי למצוא בעל מקצוע אמין זה פשוט מעצבן מדי.', {
    x: 0.5, y: 3.75, w: 4.0, h: 0.7,
    fontSize: 11.5, fontFace: FONT_BODY, italic: true, color: C.ice,
    align: 'center', rtlMode: true, margin: 0,
  });
  s.addText('מחקר פנימי · n=210 · 2025', {
    x: 0.5, y: 4.45, w: 4.0, h: 0.3,
    fontSize: 9, fontFace: FONT_BODY, color: C.muted,
    align: 'center', rtlMode: true, margin: 0,
  });

  addFooter(s, 2);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 3 — הפתרון
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'לחיצה אחת. אפס טפסים.', 'ה-AI הוא המתווך — הלקוח לא בוחר קטגוריה בעצמו.');

  // טלפון מימין (כי RTL)
  addPhone(s, shot('mock-home-he.png'), 6.7, 1.75, 3.2);

  // 3 בלוקים עם מספרים
  const props = [
    { h: 'אפס חיכוך',        b: 'תמונה + שתי מילים. זה כל הטופס.',                    color: C.coral },
    { h: 'ה-AI מבין לבד',    b: 'Gemini קורא את התמונה, מבין את הבעיה, מוצא את המקצועות הרלוונטיים.', color: C.indigo },
    { h: 'הצעות תוך דקות',   b: 'שליחת ואטספ ל-10+ בעלי מקצוע מקומיים ב-60 שניות.',     color: C.sage },
  ];
  props.forEach((p, i) => {
    const y = 1.85 + i * 1.05;
    // עיגול עם מספר
    s.addShape(pres.shapes.OVAL, {
      x: 5.6, y, w: 0.6, h: 0.6,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(String(i + 1), {
      x: 5.6, y: y - 0.02, w: 0.6, h: 0.6,
      fontSize: 22, bold: true, fontFace: FONT_HEAD, color: C.paper,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(p.h, {
      x: 0.5, y, w: 4.9, h: 0.4,
      fontSize: 20, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'right', rtlMode: true, margin: 0,
    });
    s.addText(p.b, {
      x: 0.5, y: y + 0.45, w: 4.9, h: 0.55,
      fontSize: 12.5, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  addFooter(s, 3);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 4 — איך זה עובד (צד הלקוח)
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'צד הלקוח: שלושה מסכים, זהו.', null);

  const shots = [
    { path: shot('mock-capture-he.png'),         cap: '1 · צלם + תאר' },
    { path: shot('mock-confirm-he.png'),         cap: '2 · אשר את ה-AI' },
    { path: shot('mock-request-details-he.png'), cap: '3 · השווה הצעות' },
  ];
  const H = 3.3;
  const W = H * PHONE_RATIO;
  const GAP = (SLIDE_W - W * 3 - 1.0) / 2;
  shots.forEach((entry, i) => {
    const x = 0.5 + i * (W + GAP);
    addPhone(s, entry.path, x, 1.55, H);
    s.addText(entry.cap, {
      x: x - 0.4, y: 1.55 + H + 0.3, w: W + 0.8, h: 0.38,
      fontSize: 15, fontFace: FONT_HEAD, bold: true, color: C.indigo,
      align: 'center', rtlMode: true, margin: 0,
    });
  });

  addFooter(s, 4);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 5 — צד בעל המקצוע
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'צד בעל המקצוע: פשוט ואטספ.', 'אין אפליקציה להתקין. אין אתר להתחבר אליו. אפס עלות הצטרפות.');

  // טלפון מימין
  addPhone(s, shot('mock-whatsapp-msg-he.png'), 6.7, 1.75, 3.2);

  const points = [
    ['שולחים DM',             'תמונות, סיכום AI קצר, לינק "הצע מחיר".'],
    ['הם עונים במחיר',         'או לוחצים על הטופס האינטרנטי — שניהם עובדים.'],
    ['אנחנו מפרקים + מסננים', 'הלקוח רואה "בעל מקצוע 1 · 350₪ · מחר 10:00".'],
    ['נבחרת? חושפים',          'שני הצדדים מקבלים פרטי קשר, לא לפני.'],
  ];
  points.forEach(([h, b], i) => {
    const y = 1.75 + i * 0.82;
    addCard(s, 0.5, y, 5.0, 0.68, C.coral);
    s.addText(h, {
      x: 0.7, y: y + 0.05, w: 4.5, h: 0.3,
      fontSize: 14, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'right', rtlMode: true, margin: 0,
    });
    s.addText(b, {
      x: 0.7, y: y + 0.34, w: 4.5, h: 0.32,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  addFooter(s, 5);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 6 — סיור במוצר
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'המוצר חי בפרודקשן.', 'כל המסכים רצים כרגע על iOS / אנדרואיד / Web.');

  const grid = [
    { p: shot('mock-home-he.png'),            cap: 'בית' },
    { p: shot('mock-my-requests-he.png'),     cap: 'הקריאות שלי' },
    { p: shot('mock-request-details-he.png'), cap: 'הצעות חיות' },
    { p: shot('mock-selected-he.png'),        cap: 'בעל המקצוע הנבחר' },
    { p: shot('mock-whatsapp-msg-he.png'),    cap: 'ואטספ לבעל המקצוע' },
    { p: shot('mock-provider-quote-he.png'),  cap: 'טופס הצעת מחיר' },
  ];
  const H = 2.5;
  const W = H * PHONE_RATIO;
  const colGap = (SLIDE_W - W * 6 - 1.0) / 5;
  grid.forEach((g, i) => {
    const x = 0.5 + i * (W + colGap);
    addPhone(s, g.p, x, 1.65, H);
    s.addText(g.cap, {
      x: x - 0.25, y: 1.65 + H + 0.17, w: W + 0.5, h: 0.32,
      fontSize: 10.5, fontFace: FONT_HEAD, bold: true, color: C.indigo,
      align: 'center', rtlMode: true, margin: 0,
    });
  });

  addFooter(s, 6);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 7 — הטכנולוגיה
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'איך זה בנוי.', 'Serverless, edge-first, אפס overhead תפעולי.');

  const stack = [
    { h: 'AI',             b: 'Google Gemini 2.5 Flash — מולטי-מודאלי (תמונה + טקסט).', color: C.coral },
    { h: 'הודעות',         b: 'Twilio WhatsApp Business API לכל אינטראקציה עם בעלי מקצוע.', color: C.indigo },
    { h: 'Broker',         b: 'Cloudflare Workers (edge) — חיפוש Places, שידור, webhooks.', color: C.sage },
    { h: 'נתונים',          b: 'Firebase Firestore + Auth + Storage.',                      color: C.gold },
    { h: 'קליינט',          b: 'React Native + Expo Router, אותה אפליקציה גם ל-Web.',        color: C.indigoSoft },
    { h: 'אובזרבביליות',     b: 'Event-sourcing ב-Firestore, Sentry, דשבורד ניהולי.',        color: C.muted },
  ];
  const cols = 2, boxW = 4.3, boxH = 1.05;
  stack.forEach((entry, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.5 + col * (boxW + 0.4);
    const y = 1.75 + row * (boxH + 0.2);
    addCard(s, x, y, boxW, boxH, entry.color);
    s.addText(entry.h, {
      x: x + 0.25, y: y + 0.12, w: boxW - 0.5, h: 0.36,
      fontSize: 15, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'right', rtlMode: true, margin: 0,
    });
    s.addText(entry.b, {
      x: x + 0.25, y: y + 0.48, w: boxW - 0.5, h: 0.55,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  addFooter(s, 7);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 8 — למה ננצח
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'היתרון שלנו.', 'למה המתחרים לא יכולים להעתיק את זה בחצי שנה.');

  const wins = [
    { h: 'אין אפליקציה לבעל מקצוע', b: 'כל מתחרה דורש מבעלי המקצוע להתקין, להירשם, להתחבר. אנחנו משתמשים באפליקציה שהם כבר פותחים 50 פעמים ביום.', color: C.coral },
    { h: 'ה-AI מסווג במקום הלקוח', b: 'הלקוח לא בוחר קטגוריה. אנחנו קוראים את התמונה ומנתבים. פחות נטישה, התאמה טובה יותר.', color: C.indigo },
    { h: 'הצעות אנונימיות',         b: 'בעלי מקצוע מתחרים על מחיר וזמינות, לא על מי הכי מהיר להרים טלפון.', color: C.sage },
    { h: 'אנחנו השכבה האמצעית',     b: 'בעלות על הזרימה end-to-end. בלי העתק-הדבק מ-ZAP לוואטספ. בלי דליפות ובלי הונאות.', color: C.gold },
  ];
  wins.forEach((w, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.6;
    const y = 1.7 + row * 1.65;
    addCard(s, x, y, 4.3, 1.45, w.color);
    // עיגול וי
    s.addShape(pres.shapes.OVAL, {
      x: x + 3.4, y: y + 0.3, w: 0.55, h: 0.55,
      fill: { color: w.color }, line: { color: w.color },
    });
    s.addText('✓', {
      x: x + 3.4, y: y + 0.27, w: 0.55, h: 0.6,
      fontSize: 22, bold: true, color: C.paper,
      align: 'center', valign: 'middle', margin: 0, fontFace: FONT_HEAD,
    });
    s.addText(w.h, {
      x: x + 0.25, y: y + 0.3, w: 3.05, h: 0.4,
      fontSize: 16, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'right', rtlMode: true, margin: 0,
    });
    s.addText(w.b, {
      x: x + 0.25, y: y + 0.72, w: 3.9, h: 0.7,
      fontSize: 10.5, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  addFooter(s, 8);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 9 — סיכונים
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'מה לא מרדים אותנו בלילה.', 'הסיכונים — ואיך אנחנו מנטרלים אותם.');

  const risks = [
    { r: 'נזילות בעלי מקצוע', m: 'Cold-start עיר-אחרי-עיר. זריעה ידנית של 50 הראשונים בכל אזור.' },
    { r: 'מדיניות WhatsApp',   m: 'כל תבנית הודעה מאושרת מראש ע"י Meta. Opt-out מובנה בכל הודעה.' },
    { r: 'קבלת אחוז העמלה',    m: 'חינם לבעלי מקצוע בהשקה — מונטיזציה רק אחרי שהבאנו להם עבודות.' },
    { r: 'טעויות סיווג של AI', m: 'שער human-in-the-loop לסיווגים בוודאות נמוכה.' },
    { r: 'קטגוריה עם אמון נמוך',m: 'דירוגים + אימות זהות לכל בעל מקצוע, נאכף לפני חשיפת פרטים.' },
  ];
  const rowH = 0.58;
  risks.forEach((entry, i) => {
    const y = 1.7 + i * rowH;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9, h: rowH - 0.08,
      fill: { color: i % 2 === 0 ? C.cream : C.paper }, line: { color: C.hairline, width: 0.5 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5 + 9 - 0.08, y, w: 0.08, h: rowH - 0.08,
      fill: { color: C.coral }, line: { color: C.coral },
    });
    s.addText(entry.r, {
      x: 5.6, y, w: 3.7, h: rowH - 0.08,
      fontSize: 14, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'right', rtlMode: true, valign: 'middle', margin: 0,
    });
    s.addText(entry.m, {
      x: 0.65, y, w: 4.85, h: rowH - 0.08,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, valign: 'middle', margin: 0,
    });
  });

  addFooter(s, 9);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 10 — השוק
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'השוק.', 'שירותי תיקוני בית בישראל — ואז הים התיכון.');

  // שלושה מלבנים מצולעים זה בתוך זה (TAM/SAM/SOM)
  const baseX = 5.3, baseY = 1.75;
  const tiers = [
    { label: 'TAM', value: '$4.2B', sub: 'הוצאה שנתית בישראל על שירותי בית', w: 4.2, h: 2.9, color: C.indigoDeep },
    { label: 'SAM', value: '$1.1B', sub: 'עבודות קטנות < ₪2,000 (60% מהעירוני)', w: 3.1, h: 2.0, color: C.indigo },
    { label: 'SOM', value: '$85M',  sub: 'נתח של 5% בגוש דן + השרון עד שנה 3', w: 1.9, h: 1.1, color: C.coral },
  ];
  tiers.forEach((tier) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: baseX + (4.2 - tier.w) / 2, y: baseY + (2.9 - tier.h) / 2,
      w: tier.w, h: tier.h,
      fill: { color: tier.color }, line: { color: tier.color },
      rectRadius: 0.1,
    });
  });

  // לייבלים לכל שכבה — בטור ימני
  tiers.forEach((tier, i) => {
    const y = 1.85 + i * 0.9;
    s.addShape(pres.shapes.OVAL, {
      x: 4.75, y: y + 0.08, w: 0.32, h: 0.32,
      fill: { color: tier.color }, line: { color: tier.color },
    });
    s.addText(`${tier.value} — ${tier.label}`, {
      x: 0.5, y, w: 4.15, h: 0.4,
      fontSize: 18, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'right', rtlMode: true, margin: 0,
    });
    s.addText(tier.sub, {
      x: 0.5, y: y + 0.42, w: 4.15, h: 0.5,
      fontSize: 11, fontFace: FONT_BODY, color: C.subtext,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  s.addText('מסלול התרחבות: ישראל → קפריסין → יוון → פורטוגל. אותו מחסור בכוח אדם, אותה תרבות ואטספ.', {
    x: 0.5, y: 4.95, w: 9, h: 0.32,
    fontSize: 10.5, italic: true, fontFace: FONT_BODY, color: C.subtext,
    align: 'center', rtlMode: true, margin: 0,
  });

  addFooter(s, 10);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 11 — מודל עסקי
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'מודל עסקי.', 'חינם ללקוחות. בעלי מקצוע משלמים רק כשהם מקבלים כסף.');

  // קובייה עם אחוז העמלה בצד ימין
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 6.3, y: 1.7, w: 3.2, h: 3.2,
    fill: { color: C.indigo }, line: { color: C.indigo }, rectRadius: 0.18,
  });
  s.addText('12%', {
    x: 6.3, y: 1.9, w: 3.2, h: 1.2,
    fontSize: 82, bold: true, fontFace: FONT_HEAD, color: C.gold,
    align: 'center', valign: 'middle', margin: 0,
  });
  s.addText('עמלה על עבודה שנסגרה', {
    x: 6.3, y: 3.15, w: 3.2, h: 0.4,
    fontSize: 14, fontFace: FONT_HEAD, bold: true, color: C.paper,
    align: 'center', rtlMode: true, margin: 0,
  });
  s.addText('משולמת ע"י בעל המקצוע. רק אחרי שהלקוח אישר שהעבודה בוצעה.', {
    x: 6.3, y: 3.6, w: 3.2, h: 1.2,
    fontSize: 11, italic: true, fontFace: FONT_BODY, color: C.ice,
    align: 'center', rtlMode: true, margin: 0,
  });

  // טבלה של יחידות כלכליות בטור שמאל
  const rows = [
    ['גודל עבודה ממוצע',    '₪420'],
    ['הכנסה לעבודה',        '₪50'],
    ['עלות ישירה (AI + WA)', '₪3'],
    ['רווח תרומה',           '₪47  (94%)'],
    ['CAC (מוקדם)',         '₪18 / קריאה ראשונה'],
    ['החזר השקעה',           'עבודה מוצלחת ראשונה'],
  ];
  rows.forEach((row, i) => {
    const y = 1.7 + i * 0.5;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 5.6, h: 0.44,
      fill: { color: i % 2 === 0 ? C.cream : C.paper }, line: { color: C.hairline, width: 0.5 },
    });
    s.addText(row[0], {
      x: 2.8, y, w: 3.15, h: 0.44,
      fontSize: 12, fontFace: FONT_BODY, color: C.ink,
      align: 'right', rtlMode: true, valign: 'middle', margin: 0,
    });
    s.addText(row[1], {
      x: 0.65, y, w: 2.1, h: 0.44,
      fontSize: 13, bold: true, fontFace: FONT_HEAD, color: C.indigo,
      align: 'left', valign: 'middle', margin: 0,
    });
  });

  addFooter(s, 11);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 12 — מתחרים
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'מי עוד בשוק?', 'אנחנו מנצחים בצירים שבאמת חשובים.');

  // כותרות בסדר RTL: ai-fixly ראשי מימין, אחר כך המתחרים
  const header = ['', 'ai-fixly', 'ZAP', 'Fixer', 'דפי זהב / טלפון'];
  const body = [
    ['חיכוך הלקוח',  'לחיצה אחת', 'טופס + שיחות',   'טופס',            'רולטת טלפון'],
    ['Onboarding לבעל מקצוע', 'שום דבר', 'הרשמה לדשבורד', 'התקנת אפליקציה', 'שום דבר (אורגני)'],
    ['סיווג AI',      'כן',         'לא',             'חלקי',            'לא'],
    ['הצעות אנונימיות','כן',         'לא',             'לא',              'לא'],
    ['זמן להצעה ראשונה','פחות מ-5 דק׳','שעות',         '30–60 דק׳',       'שעות/ימים'],
  ];

  const tableData = [
    header.map((h) => ({
      text: h,
      options: {
        fill: { color: C.indigo }, color: C.paper, bold: true,
        fontSize: 11, fontFace: FONT_HEAD, align: 'center', valign: 'middle',
      },
    })),
    ...body.map((row, ri) =>
      row.map((cell, ci) => ({
        text: cell,
        options: {
          fill: { color: ri % 2 === 0 ? C.cream : C.paper },
          color: ci === 1 ? C.coral : C.ink,
          bold: ci === 1 || ci === 0,
          fontSize: 11, fontFace: ci === 0 ? FONT_HEAD : FONT_BODY,
          align: ci === 0 ? 'right' : 'center',
          valign: 'middle',
          rtlMode: true,
        },
      })),
    ),
  ];

  s.addTable(tableData, {
    x: 0.5, y: 1.7, w: 9, h: 3.2,
    colW: [2.2, 1.7, 1.7, 1.7, 1.7],
    border: { pt: 0.5, color: C.hairline },
    rowH: 0.54,
  });

  addFooter(s, 12);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 13 — טראקשן
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addTitle(s, 'מה כבר בנינו.', 'עובד. חי. רץ end-to-end בפרודקשן.');

  const stats = [
    { n: '40+',   l: 'מסכים חיים',       sub: 'לקוח + בעל מקצוע + ניהול' },
    { n: '5',    l: 'שפות',              sub: 'עברית-ראשונה, אנגלית / ערבית / רוסית' },
    { n: '14',   l: 'עדכוני OTA',        sub: 'EAS Update, איטרציות בשטח' },
    { n: '100%', l: 'שקיפות לניהול',     sub: 'כל אירוע עקיב end-to-end' },
  ];
  stats.forEach((st, i) => {
    const x = 0.5 + i * 2.35;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.7, w: 2.1, h: 1.75,
      fill: { color: C.indigo }, line: { color: C.indigo }, rectRadius: 0.14,
    });
    s.addText(st.n, {
      x, y: 1.75, w: 2.1, h: 0.9,
      fontSize: 46, bold: true, fontFace: FONT_HEAD, color: C.gold,
      align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(st.l, {
      x, y: 2.7, w: 2.1, h: 0.35,
      fontSize: 12, bold: true, fontFace: FONT_HEAD, color: C.paper,
      align: 'center', rtlMode: true, margin: 0,
    });
    s.addText(st.sub, {
      x: x - 0.05, y: 3.05, w: 2.2, h: 0.4,
      fontSize: 9, fontFace: FONT_BODY, color: C.ice,
      align: 'center', rtlMode: true, margin: 0,
    });
  });

  const infra = [
    '✓  סינכרון Firestore real-time + תור offline',
    '✓  Cloudflare Worker broker (Twilio, Places, Gemini)',
    '✓  דשבורד ניהולי: קריאות, בעלי מקצוע, התראות',
    '✓  EAS builds + OTA updates בשחרור שבועי',
    '✓  Twilio interactive WhatsApp templates (מאושרים)',
    '✓  דפי SEO ציבוריים לגילוי אורגני',
  ];
  infra.forEach((line, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    s.addText(line, {
      x: col === 0 ? 5.0 : 0.6, y: 3.7 + row * 0.4, w: 4.3, h: 0.34,
      fontSize: 11.5, fontFace: FONT_BODY, color: C.indigo, bold: true,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  addFooter(s, 13);
}

// ═════════════════════════════════════════════════════════════════════════
//  שקף 14 — הבקשה
// ═════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);

  // "fixly" ענק ברקע
  s.addText('fixly', {
    x: 0, y: 1.6, w: SLIDE_W, h: 3.3,
    fontSize: 240, fontFace: FONT_HEAD, bold: true, color: C.indigoSoft,
    align: 'center', valign: 'middle', margin: 0, charSpacing: -6,
  });

  s.addText('הבקשה.', {
    x: 0.5, y: 0.55, w: 9, h: 0.9,
    fontSize: 42, bold: true, fontFace: FONT_HEAD, color: C.paper,
    align: 'right', rtlMode: true, margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 8.5, y: 1.45, w: 1.0, h: 0.06, fill: { color: C.gold }, line: { color: C.gold },
  });

  const asks = [
    { h: '$1.5M סיד',       b: 'ראנוויי של 18 חודשים.' },
    { h: 'פיילוט גוש דן',   b: '500 עבודות ראשונות, 200 בעלי מקצוע משלמים.' },
    { h: 'אחר כך שרון + חיפה', b: 'עיר חדשה כל רבעון אחרי Product-Market Fit.' },
  ];
  asks.forEach((a, i) => {
    const y = 2.1 + i * 0.95;
    // פס מבטא בימין
    s.addShape(pres.shapes.RECTANGLE, {
      x: 9.2, y, w: 0.1, h: 0.82,
      fill: { color: C.gold }, line: { color: C.gold },
    });
    s.addText(a.h, {
      x: 0.5, y, w: 8.55, h: 0.45,
      fontSize: 24, bold: true, fontFace: FONT_HEAD, color: C.gold,
      align: 'right', rtlMode: true, margin: 0,
    });
    s.addText(a.b, {
      x: 0.5, y: y + 0.45, w: 8.55, h: 0.4,
      fontSize: 15, fontFace: FONT_BODY, color: C.ice,
      align: 'right', rtlMode: true, margin: 0,
    });
  });

  s.addText('roee@ai-fixly.com  ·  ai-fixly-web.pages.dev', {
    x: 0.5, y: 5.05, w: 9, h: 0.4,
    fontSize: 13, fontFace: FONT_BODY, color: C.ice,
    align: 'center', margin: 0,
  });
}

// ── כתיבה ────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: path.resolve(__dirname, 'ai-fixly-investor-deck.pptx') }).then((file) => {
  console.log('Wrote:', file);
});
