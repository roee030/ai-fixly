/**
 * Profession-level SEO content builder.
 *
 * Two content "tiers" are supported:
 *
 *  1. Generic template — populated from the active i18n locale
 *     (`servicePage.genericIntroFmt`, `genericIssueN`, `genericFaq*`). This
 *     means every profession has useful, translated content out of the
 *     box: intro, 4 issues, 3 pricing hints, 5 FAQs — in he/en/ar/ru.
 *
 *  2. Hebrew-only per-profession overrides (HEBREW_OVERRIDES) — rich,
 *     custom copy for the top professions (plumber, electrician, locksmith…)
 *     that we prioritize for organic search in Israel. These overrides ONLY
 *     apply when the active language is Hebrew; in other languages we keep
 *     the translated generic template to avoid mixing Hebrew content with
 *     an English/Arabic/Russian UI.
 *
 * Why this split:
 *  - Non-Hebrew users get consistent, fully-translated pages.
 *  - Hebrew SEO pages — our priority market — get uniquely written,
 *    competitive content where it matters most.
 */

import type { ProfessionKey } from './problemMatrix';

export interface ProfessionSEO {
  intro: string;
  whyUs: string[];
  commonIssues: string[];
  pricingHints: string[];
  faq: Array<{ q: string; a: string }>;
  relatedProfessions?: ProfessionKey[];
  isEmergencyService?: boolean;
}

type TFunction = (key: string, opts?: Record<string, unknown>) => string;

// ============================================================================
// Metadata that applies across all locales
// ============================================================================

/**
 * Cross-profession links for internal SEO. Same in every language — the
 * profession label itself gets localized at render time.
 */
const RELATED: Partial<Record<ProfessionKey, ProfessionKey[]>> = {
  plumber: ['hvac_contractor', 'waterproofing_specialist', 'electric_water_heater', 'leak_detection', 'gas_technician'],
  electrician: ['hvac_contractor', 'electric_water_heater', 'alarm_systems', 'security_camera_installer', 'intercom'],
  locksmith: ['car_locksmith', 'door_installer', 'alarm_systems'],
  hvac_contractor: ['electrician', 'ac_cleaning'],
  home_appliance_repair: ['gas_technician', 'electrician'],
  painter: ['plasterer', 'renovator', 'whitewashing'],
  renovator: ['painter', 'tiler', 'plasterer', 'carpenter', 'electrician', 'plumber', 'home_inspection'],
  gas_technician: ['home_appliance_repair', 'electric_water_heater'],
  exterminator: ['cleaning_service', 'pigeon_repellent', 'snake_catcher', 'mouse_catcher'],
  carpenter: ['kitchen_installer', 'door_installer', 'parquet_installer'],
};

const EMERGENCY_KEYS: ProfessionKey[] = ['plumber', 'electrician', 'locksmith', 'gas_technician'];

// ============================================================================
// Hebrew-only rich overrides
// ============================================================================

interface HebrewOverride {
  intro?: string;
  commonIssues?: string[];
  pricingHints?: string[];
  faq?: Array<{ q: string; a: string }>;
}

const HEBREW_OVERRIDES: Partial<Record<ProfessionKey, HebrewOverride>> = {
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
      'מחיר ביקור אבחון נע בדרך כלל בין מאות בודדות לאלף שקלים — תלוי באזור ובשעה',
      'סתימות פשוטות זולות יותר מעבודות שדורשות פירוק צנרת',
      'עבודה דחופה (לילה, חג או סופ"ש) יקרה יותר ב-30-50%',
      'תמיד דרוש להתעקש על הצעת מחיר ברורה לפני תחילת העבודה',
    ],
    faq: [
      { q: 'מתי כדאי להזעיק אינסטלטור דחוף?', a: 'הצפה, פיצוץ צינור, ביוב חוזר או דוד שמטפטף מים חמים — אלה מקרים שבהם עדיף לא לחכות ולקבל אינסטלטור עם ETA מיידי. ב-Fixly תוכל לראות מי פנוי עכשיו ולבחור את הזמין ביותר.' },
      { q: 'האם אני חייב להיות בבית בזמן הביקור?', a: 'רוב האינסטלטורים דורשים נוכחות בעלי דירה לפחות לפתיחה וסיום העבודה. אפשר לסכם איתו דרך Fixly מראש מה הנוסחה שמתאימה לך.' },
      { q: 'מה ההבדל בין אינסטלטור לטכנאי מיזוג?', a: 'אינסטלטור מטפל במים וצנרת (נזילות, סתימות, דוד שמש, מערכות ניקוז). טכנאי מיזוג מטפל במיזוג אוויר ומערכות קירור/חימום. ב-Fixly ה-AI מכוון אותך לבעל המקצוע הנכון אוטומטית.' },
      { q: 'מה העלות של תיקון נזילה פשוטה?', a: 'המחיר משתנה מאוד לפי האזור, שעת היום ומורכבות — לכן אנחנו לא נותנים מחירון קבוע. במקום זאת, ב-Fixly אתה מקבל הצעות מבעלי מקצוע אמיתיים באזורך, עם מחיר ספציפי לבעיה שלך.' },
      { q: 'האם יש אחריות על העבודה?', a: 'רוב האינסטלטורים נותנים אחריות של חודש עד שנה על העבודה (לא על החלקים). חשוב לוודא את זה מולם לפני שמסכמים.' },
    ],
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
      { q: 'האם אני צריך חשמלאי מוסמך?', a: 'כן — לפי החוק בישראל, כל עבודה על מערכת החשמל בבית חייבת להתבצע ע"י חשמלאי מוסמך. ב-Fixly אנחנו שולחים רק חשמלאים מוסמכים עם דירוג מלקוחות.' },
      { q: 'כמה עולה התקנת גוף תאורה?', a: 'תלוי בסוג (נברשת יקרה מ-LED פשוט), בגישה לחיווט הקיים, ובאזור. ב-Fixly תקבל הצעות אמיתיות מחשמלאים באזור שלך — הרבה יותר מדויק מכל מחירון כללי.' },
      { q: 'מה זה בודק חשמל?', a: 'בודק חשמל הוא חשמלאי עם הסמכה גבוהה במיוחד שמוסמך לבדוק ולחתום על תקינות לוחות חשמל. אם אתה קונה דירה או שיש שינויים גדולים — הוא זה שאתה צריך, ולא חשמלאי רגיל.' },
      { q: 'האם העבודה באחריות?', a: 'רוב החשמלאים נותנים אחריות של 6 חודשים עד שנה על העבודה. חשוב לקבל את זה בכתב או בוואטסאפ ולא רק בעל פה.' },
    ],
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
  },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Build the full SEO content for a profession using the active i18n
 * `t()` function. Hebrew overrides are applied only when the active
 * language is Hebrew.
 */
export function buildProfessionContent(
  key: ProfessionKey,
  labelLocalized: string,
  t: TFunction,
  language: string,
): ProfessionSEO {
  const generic = buildGeneric(labelLocalized, t);
  const override = language === 'he' ? HEBREW_OVERRIDES[key] : undefined;

  return {
    intro: override?.intro || generic.intro,
    whyUs: generic.whyUs,
    commonIssues: override?.commonIssues || generic.commonIssues,
    pricingHints: override?.pricingHints || generic.pricingHints,
    faq: override?.faq || generic.faq,
    relatedProfessions: RELATED[key],
    isEmergencyService: EMERGENCY_KEYS.includes(key),
  };
}

function buildGeneric(name: string, t: TFunction): ProfessionSEO {
  const intro = t('servicePage.genericIntroFmt', { name });
  const whyUs = [
    t('servicePage.whyUs1'),
    t('servicePage.whyUs2'),
    t('servicePage.whyUs3'),
    t('servicePage.whyUs4'),
  ];
  const commonIssues = [
    t('servicePage.genericIssue1Fmt', { name }),
    t('servicePage.genericIssue2Fmt', { name }),
    t('servicePage.genericIssue3'),
    t('servicePage.genericIssue4'),
  ];
  const pricingHints = [
    t('servicePage.genericPricing1'),
    t('servicePage.genericPricing2'),
    t('servicePage.genericPricing3'),
  ];
  const faq = [
    { q: t('servicePage.genericFaq1qFmt', { name }), a: t('servicePage.genericFaq1aFmt', { name }) },
    { q: t('servicePage.genericFaq2q'), a: t('servicePage.genericFaq2a') },
    { q: t('servicePage.genericFaq3q'), a: t('servicePage.genericFaq3aFmt', { name }) },
    { q: t('servicePage.genericFaq4q'), a: t('servicePage.genericFaq4a') },
    { q: t('servicePage.genericFaq5q'), a: t('servicePage.genericFaq5a') },
  ];
  return {
    intro,
    whyUs,
    commonIssues,
    pricingHints,
    faq,
  };
}

/** Major Israeli cities for the city-links strip. */
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
