/**
 * Unique SEO content per profession.
 *
 * Everything here is written from scratch for ai-fixly — not scraped from
 * competitors. The structure reuses a shared template (intro / whyUs /
 * commonIssues / pricingHints / faq) with per-profession overrides so we
 * can cover every profession without hand-writing full copy for all of
 * them.
 *
 * SEO approach:
 *  - Every section becomes an h2 that Google indexes.
 *  - FAQ items also power Schema.org FAQPage markup — enables rich
 *    snippets on Google SERP.
 *  - commonIssues cross-links to the problem-matrix for intra-site
 *    authority.
 *  - All content is written in Hebrew, the primary SEO market.
 */

import type { ProfessionKey } from './problemMatrix';

export interface ProfessionSEO {
  /** 1–2 sentence intro for the hero subtitle (max ~160 chars). */
  intro: string;
  /** "Why ai-fixly" bullets (4 short points). */
  whyUs: string[];
  /** Typical issues this profession handles (bullets, 4–8). */
  commonIssues: string[];
  /** Short guidance about pricing. DO NOT mention specific shekel prices. */
  pricingHints: string[];
  /** 4–6 FAQ items. Becomes FAQPage JSON-LD. */
  faq: Array<{ q: string; a: string }>;
  /** Other professions to cross-link to. */
  relatedProfessions?: ProfessionKey[];
  /** Emergency/24-7? Surfaces a red badge + pushes urgency wording. */
  isEmergencyService?: boolean;
}

// Default FAQs used when a profession doesn't define its own.
// Gets the profession label injected at render time via `{{name}}`.
const GENERIC_FAQ: ProfessionSEO['faq'] = [
  {
    q: 'איך מוצאים {{name}} אמין?',
    a: 'ב-ai-fixly תצלם את הבעיה ותקבל בתוך דקות הצעות מחיר מבעלי מקצוע שמדורגים בידי לקוחות קודמים באזורך. אין תשלום על השירות שלנו — אתה משלם רק לבעל המקצוע שתבחר.',
  },
  {
    q: 'כמה זמן לוקח לקבל הצעה?',
    a: 'ההצעות הראשונות מגיעות תוך מספר דקות. אתה רואה אותן באפליקציה עם מחיר משוער וזמן הגעה, ובוחר את מי שמתאים לך.',
  },
  {
    q: 'מה העלות של השירות?',
    a: 'השירות שלנו חינמי לחלוטין. אתה לא משלם לנו כלום — אנחנו רק מתווכים בינך לבין {{name}} שמתאים לך. המחיר שהוא מציע הוא המחיר שאתה משלם לו ישירות.',
  },
  {
    q: 'האם בעלי המקצוע מאומתים?',
    a: 'כן. אנחנו עובדים רק עם בעלי מקצוע פעילים עם ותק ומדורגים מלקוחות קודמים. אתה רואה את הדירוג שלהם לפני שאתה בוחר.',
  },
  {
    q: 'מה קורה אם ההצעה לא מתאימה לי?',
    a: 'אין שום התחייבות. אתה יכול לסגור את הבקשה בכל שלב, לבחור הצעה אחרת, או פשוט לחכות להצעות נוספות. אנחנו לא מחייבים אותך לשום דבר.',
  },
];

// Default Why Us bullets shared across most professions.
const GENERIC_WHY_US = [
  'צלם את הבעיה — ה-AI שלנו מזהה מה בדיוק צריך',
  'הצעות מחיר מבעלי מקצוע באזורך תוך דקות',
  'ללא עלות, ללא התחייבות, ללא חיפוש ארוך',
  'רק בעלי מקצוע מדורגים — אתה בוחר את הטוב ביותר',
];

// ============================================================================
// Per-profession overrides. Only fields that differ from the generic need to
// be set. `buildProfessionContent(key)` falls back to generics for the rest.
// ============================================================================

const OVERRIDES: Partial<Record<ProfessionKey, Partial<ProfessionSEO>>> = {
  plumber: {
    intro: 'נזילה, סתימה, דוד לא מחמם או לחץ מים נמוך — אינסטלטור מקצועי באזורך תוך דקות. פשוט לצלם, לקבל הצעות, ולבחור.',
    commonIssues: [
      'נזילת מים מצינור, מברז או שירותים',
      'סתימה בכיור, מקלחת או שירותים',
      'דוד מים שמחמם חלקית או בכלל לא',
      'לחץ מים נמוך או שינויי טמפרטורה פתאומיים',
      'החלפת אסלה, כיור או ברזים',
      'התקנה או תיקון של מערכת ניקוז',
      'פיצוץ צינור או הצפה — טיפול דחוף',
    ],
    pricingHints: [
      'מחיר ביקור אבחון נע בד"כ בין מאות בודדות לאלף שקלים — תלוי באזור ובשעה',
      'סתימות פשוטות זולות יותר מעבודות שדורשות פירוק צנרת',
      'עבודה דחופה (לילה, חג או סופ"ש) יקרה יותר ב-30-50%',
      'תמיד דרוש להתעקש על הצעת מחיר ברורה לפני תחילת העבודה',
    ],
    faq: [
      { q: 'מתי כדאי להזעיק אינסטלטור דחוף?', a: 'הצפה, פיצוץ צינור, ביוב חוזר או דוד שמטפטף מים חמים — אלה מקרים שבהם עדיף לא לחכות ולקבל אינסטלטור עם ETA מיידי. ב-ai-fixly תוכל לראות מי פנוי עכשיו ולבחור את הזמין ביותר.' },
      { q: 'האם אני חייב להיות בבית בזמן הביקור?', a: 'רוב האינסטלטורים דורשים נוכחות בעלי דירה לפחות לפתיחה וסיום העבודה. אפשר לסכם איתו דרך ai-fixly מראש מה הנוסחה שמתאימה לך.' },
      { q: 'מה ההבדל בין אינסטלטור לטכנאי מיזוג?', a: 'אינסטלטור מטפל במים וצנרת (נזילות, סתימות, דוד שמש, מערכות ניקוז). טכנאי מיזוג מטפל במיזוג אוויר ומערכות קירור/חימום. לפעמים יש חפיפה — ב-ai-fixly ה-AI מכוון אותך לבעל המקצוע הנכון אוטומטית.' },
      { q: 'מה העלות של תיקון נזילה פשוטה?', a: 'המחיר משתנה מאוד לפי האזור, שעת היום ומורכבות — לכן אנחנו לא נותנים מחירון קבוע. במקום זאת, ב-ai-fixly אתה מקבל הצעות מבעלי מקצוע אמיתיים באזורך, עם מחיר ספציפי לבעיה שלך.' },
      { q: 'האם יש אחריות על העבודה?', a: 'רוב האינסטלטורים נותנים אחריות של חודש עד שנה על העבודה (לא על החלקים). חשוב לוודא את זה מולם לפני שמסכמים. אתה יכול לדרג אותם אחרי העבודה ב-ai-fixly — זה עוזר ללקוחות הבאים.' },
    ],
    relatedProfessions: ['hvac_contractor', 'waterproofing_specialist', 'electric_water_heater', 'leak_detection', 'gas_technician'],
    isEmergencyService: true,
  },

  electrician: {
    intro: 'קצר חשמלי, הפסקת חשמל, התקנת שקעים או תאורה — חשמלאי מוסמך באזורך תוך דקות. ללא חיפושים, ללא שיחות טלפון.',
    commonIssues: [
      'הפסקת חשמל חלקית או מלאה בבית',
      'קצר חשמלי או ניצוצות משקע',
      'התקנת שקעים, מפסקים או לוח חשמל',
      'התקנת גופי תאורה, נברשות או תאורת LED',
      'תקלה בדוד חשמל',
      'התקנת מזגן או מוצר חשמלי חדש שדורש חיווט',
      'בדיקת תקינות חשמלית לקראת מעבר דירה',
    ],
    pricingHints: [
      'חשמלאי מוסמך חייב תעודת בודק, חשוב לבקש לראות',
      'התקנת שקע פשוטה זולה יחסית, שינויי לוח חשמל יקרים בהרבה',
      'עבודות דחופות במקרי חשמל מסוכן — לרוב עם תוספת',
      'לא לוותר על הצעת מחיר בכתב לפני עבודה גדולה',
    ],
    faq: [
      { q: 'מתי מקרה חשמל נחשב דחוף?', a: 'ריח שרוף, ניצוצות, חום משקע או פאנל חשמלי, הפסקה מלאה בכל הבית, או מכשיר שמצליח להפעיל את החשמל — כל אלה דורשים חשמלאי מיד. אל תנסו לפתור בעצמכם.' },
      { q: 'האם אני צריך חשמלאי מוסמך?', a: 'כן — לפי החוק בישראל, כל עבודה על מערכת החשמל בבית חייבת להתבצע ע"י חשמלאי מוסמך. ב-ai-fixly אנחנו שולחים רק חשמלאים מוסמכים עם דירוג מלקוחות.' },
      { q: 'כמה עולה התקנת גוף תאורה?', a: 'תלוי בסוג (נברשת יקרה מ-LED פשוט), בגישה לחיווט הקיים, ובאזור. ב-ai-fixly תקבל הצעות אמיתיות מחשמלאים באזור שלך — הרבה יותר מדויק מכל מחירון כללי.' },
      { q: 'מה זה בודק חשמל?', a: 'בודק חשמל הוא חשמלאי עם הסמכה גבוהה במיוחד שמוסמך לבדוק ולחתום על תקינות לוחות חשמל. אם אתה קונה דירה או שיש שינויים גדולים — הוא זה שאתה צריך, ולא חשמלאי רגיל.' },
      { q: 'האם העבודה באחריות?', a: 'רוב החשמלאים נותנים אחריות של 6 חודשים עד שנה על העבודה. חשוב לקבל את זה בכתב או בוואטסאפ ולא רק בעל פה.' },
    ],
    relatedProfessions: ['hvac_contractor', 'electric_water_heater', 'alarm_systems', 'security_camera_installer', 'intercom'],
    isEmergencyService: true,
  },

  locksmith: {
    intro: 'נעילה בחוץ, מפתח שבור במנעול, או צורך בהחלפת מנעול — מנעולן באזורך מגיע מהר. גם בלילות וסופי שבוע.',
    commonIssues: [
      'ננעלת בחוץ — צריך פריצת דלת ללא נזק',
      'מפתח שבור בתוך המנעול',
      'החלפת מנעול אחרי שכירות או גניבה',
      'שדרוג למנעול רב-בריח',
      'תיקון מנעול רכב או פתיחת רכב נעול',
      'העתקת מפתח מאב',
    ],
    pricingHints: [
      'פריצת דלת ללא נזק בשעות היום זולה יותר משעות הלילה',
      'מנעולן טוב יגיע עם ציוד שלא פוגע בדלת — לא לפתוח אם אין ציוד מתאים',
      'מחיר החלפת מנעול תלוי ברמת האבטחה (רב-בריח יקר יותר)',
    ],
    relatedProfessions: ['car_locksmith', 'door_installer', 'alarm_systems'],
    isEmergencyService: true,
  },

  hvac_contractor: {
    intro: 'מזגן לא מקרר, תקלה, או התקנה חדשה — טכנאי מיזוג אוויר מקצועי באזורך, מהיר ואמין.',
    commonIssues: [
      'מזגן לא מקרר או לא מחמם מספיק',
      'רעש חריג או טפטוף מים מהיחידה הפנימית',
      'התקנת מזגן עילי או מרכזי חדש',
      'פירוק והתקנה מחדש (העברת דירה)',
      'ניקוי וטיפול תקופתי למזגן',
      'בעיה בשלט או בעיה חשמלית במזגן',
    ],
    pricingHints: [
      'התקנה יקרה משירות — תלוי באורך הצנרת ובגישה',
      'ניקוי תקופתי חוסך הרבה על צריכת חשמל וחיי המזגן',
      'בקיץ יש עומס — מחירים עולים והזמינות קטנה',
    ],
    relatedProfessions: ['electrician', 'ac_cleaning'],
  },

  home_appliance_repair: {
    intro: 'מקרר, מכונת כביסה, מדיח, תנור או מייבש שלא עובד כמו שצריך — טכנאי מוצרי חשמל באזורך, ובמחיר שקוף.',
    commonIssues: [
      'מקרר שלא מקרר או מקרר יותר מדי',
      'מכונת כביסה שלא מסתובבת, דולפת או מרעישה',
      'מדיח שלא רוחץ או שותה מים',
      'תנור שלא מחמם או שפרובית לא נכבית',
      'מייבש שלא מייבש או מעלה ריח',
      'הוצאת חפץ תקוע',
    ],
    relatedProfessions: ['gas_technician', 'electrician'],
  },

  painter: {
    intro: 'צביעת דירה, סלון, חדרים, גבס או פרגולה — צבעי מקצועי באזורך עם הצעת מחיר ברורה ולוח זמנים מדויק.',
    commonIssues: [
      'צביעת דירה שלמה לפני כניסת דיירים',
      'צביעת חדר או סלון בודד',
      'כיסוי כתמים, לחות או סדקים',
      'צביעת גבס תקרה',
      'צביעה חיצונית של קירות או מרפסת',
      'צביעה דקורטיבית (אמנות, גוונים מיוחדים)',
    ],
    pricingHints: [
      'המחיר לרוב חושב לפי מ"ר — תלוי בגובה התקרות וסוג הצבע',
      'שכבה שנייה עולה בפחות משכבה ראשונה',
      'הכנה (חירור, שפכטל, שיוף) זה חלק גדול מהעלות',
    ],
    relatedProfessions: ['plasterer', 'renovator', 'whitewashing'],
  },

  renovator: {
    intro: 'שיפוץ מטבח, אמבטיה, דירה שלמה או הרחבה — קבלני שיפוצים מקצועיים עם הצעות מחיר שוויוניות.',
    commonIssues: [
      'שיפוץ מלא של דירה לפני כניסה',
      'שיפוץ מטבח — החלפת ארונות, משטחים וצנרת',
      'שיפוץ אמבטיה — ריצוף, ארונות, מקלחון',
      'הרחבה או שינוי פנימי',
      'בדק בית לקראת קנייה',
      'פרויקט "שיפוץ בטוח" לפני מכירה',
    ],
    pricingHints: [
      'שיפוץ מלא דורש הצעת מחיר מפורטת עם פירוט של כל שלב',
      'המחיר למ"ר משתנה ב-200%+ בין שיפוץ בסיסי לפרמיום',
      'מסמך הסכם שיפוצים הוא חובה — לא לוותר',
      'חשוב לוודא ביטוח אחריות מקצועית של הקבלן',
    ],
    relatedProfessions: ['painter', 'tiler', 'plasterer', 'carpenter', 'electrician', 'plumber', 'home_inspection'],
  },

  gas_technician: {
    intro: 'ריח גז, התקנת גז חדש, או טכנאי גז מוסמך להפעלת תנור או דוד — שירות מהיר ואמין.',
    commonIssues: [
      'ריח גז בבית — מצב חירום',
      'התקנת כיריים גז או תנור גז חדש',
      'החלפת מיכל גז או הצנרת',
      'בדיקת דליפה תקופתית',
      'ניתוק גז לפני מעבר דירה',
      'חיבור דוד גז',
    ],
    pricingHints: [
      'טכנאי גז חייב להיות מוסמך וברישום — תמיד לבקש תעודה',
      'בדיקת דליפה זולה יחסית, התקנה חדשה יקרה יותר',
      'אל תנסה לעבוד על גז בעצמך — מסוכן ולא חוקי',
    ],
    relatedProfessions: ['home_appliance_repair', 'electric_water_heater'],
    isEmergencyService: true,
  },

  exterminator: {
    intro: 'ג׳וקים, נמלים, יתושים, עכברים או מזיקים אחרים — מדביר מקצועי עם חומרים בטוחים לילדים וחיות.',
    commonIssues: [
      'ג׳וקים במטבח או שירותים',
      'נמלים שמופיעות מהמרפסת או החצר',
      'יתושים שמפריעים בשינה',
      'עכברים או חולדות בבית או במחסן',
      'טרמיטים בעצים',
      'קינון של חרקים אחרים',
    ],
    pricingHints: [
      'מחיר תלוי בגודל הדירה ובחומרה',
      'הדברה יעילה דורשת לפעמים 2-3 ביקורים במרווחים',
      'חשוב לוודא שהחומרים מאושרים ובטוחים לילדים/חיות',
    ],
    relatedProfessions: ['cleaning_service', 'pigeon_repellent', 'snake_catcher', 'mouse_catcher'],
  },

  handyman: {
    intro: 'תליית מראה, הרכבת רהיטים, תיקונים קטנים — הנדימן אמין לכל הדברים הקטנים שצריך לעשות בבית.',
    commonIssues: [
      'תלייה של מדפים, מראות או תמונות',
      'הרכבת רהיטים מ-IKEA או רהיטים דומים',
      'תיקון ידיות, מעמדים או עגלות',
      'התקנת וילונות או מוטות',
      'תיקונים קטנים שלא דורשים בעל מקצוע ייעודי',
      'עזרה קטנה לפני מסיבה או אירוע',
    ],
  },

  carpenter: {
    intro: 'מטבח, ארונות מעוצבים, דלת חדשה או תיקון רהיט — נגר מקצועי עם ייצור לפי מידה.',
    commonIssues: [
      'ייצור ארון לפי מידה (שירותים, חדר שינה, מטבח)',
      'החלפת דלת פנימית או חיצונית',
      'תיקון מגירה, דלת או חזית של ארון',
      'ייצור מדפים מעוצבים',
      'עבודת גמר של פנל רצפה',
    ],
    relatedProfessions: ['kitchen_installer', 'door_installer', 'parquet_installer'],
  },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Build the full SEO content for a profession. Falls back to generic
 * templates for any field that wasn't overridden.
 */
export function buildProfessionContent(key: ProfessionKey, labelHe: string): ProfessionSEO {
  const override = OVERRIDES[key] || {};

  const intro =
    override.intro ||
    `מחפש ${labelHe} באזורך? ai-fixly מחבר אותך לבעלי המקצוע הטובים ביותר תוך דקות — צלם את הבעיה וקבל הצעות מחיר מיד.`;

  const whyUs = override.whyUs || GENERIC_WHY_US;

  const commonIssues =
    override.commonIssues ||
    [
      `בעיות דחופות בתחום ${labelHe}`,
      `התקנה ושדרוג של מערכות ${labelHe}`,
      `תיקון ושירות שוטף`,
      `ייעוץ מקצועי לפני פרויקט גדול`,
    ];

  const pricingHints =
    override.pricingHints ||
    [
      `המחיר משתנה לפי מורכבות העבודה, האזור ושעת היום`,
      `תמיד לבקש הצעת מחיר בכתב לפני תחילת עבודה`,
      `אזורי פריפריה לרוב זולים מאזור המרכז`,
    ];

  const faq = (override.faq || GENERIC_FAQ).map((item) => ({
    q: item.q.replace(/\{\{name\}\}/g, labelHe),
    a: item.a.replace(/\{\{name\}\}/g, labelHe),
  }));

  return {
    intro,
    whyUs,
    commonIssues,
    pricingHints,
    faq,
    relatedProfessions: override.relatedProfessions,
    isEmergencyService: override.isEmergencyService ?? false,
  };
}

/** Ordered list of the main Israeli cities for the city-links section. */
export const MAIN_CITIES: Array<{ he: string; slug: string }> = [
  { he: 'תל אביב', slug: 'tel-aviv' },
  { he: 'רמת גן', slug: 'ramat-gan' },
  { he: 'גבעתיים', slug: 'givatayim' },
  { he: 'חולון', slug: 'holon' },
  { he: 'בת ים', slug: 'bat-yam' },
  { he: 'ראשון לציון', slug: 'rishon-lezion' },
  { he: 'הרצליה', slug: 'herzliya' },
  { he: 'רעננה', slug: 'raanana' },
  { he: 'כפר סבא', slug: 'kfar-saba' },
  { he: 'פתח תקווה', slug: 'petah-tikva' },
  { he: 'נתניה', slug: 'netanya' },
  { he: 'ירושלים', slug: 'jerusalem' },
];
