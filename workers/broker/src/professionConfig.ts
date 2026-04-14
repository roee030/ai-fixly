interface ProfessionConfig {
  googlePlacesType: string | null;
  hebrewSearchQuery: string;
}

const PROFESSION_MAP: Record<string, ProfessionConfig> = {
  plumber:                    { googlePlacesType: 'plumber',            hebrewSearchQuery: 'אינסטלטור' },
  electrician:                { googlePlacesType: 'electrician',        hebrewSearchQuery: 'חשמלאי' },
  hvac_contractor:            { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי מיזוג אוויר' },
  locksmith:                  { googlePlacesType: 'locksmith',          hebrewSearchQuery: 'מנעולן' },
  home_appliance_repair:      { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי מוצרי חשמל' },
  computer_repair:            { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי מחשבים' },
  mobile_repair:              { googlePlacesType: null,                 hebrewSearchQuery: 'תיקון טלפונים סלולריים' },
  tv_repair:                  { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי טלוויזיות' },
  painter:                    { googlePlacesType: 'painter',            hebrewSearchQuery: 'צבעי' },
  cleaning_service:           { googlePlacesType: null,                 hebrewSearchQuery: 'חברת ניקיון' },
  moving_company:             { googlePlacesType: 'moving_company',     hebrewSearchQuery: 'חברת הובלות' },
  roofer:                     { googlePlacesType: 'roofing_contractor', hebrewSearchQuery: 'גגן' },
  carpenter:                  { googlePlacesType: null,                 hebrewSearchQuery: 'נגר' },
  gardener:                   { googlePlacesType: null,                 hebrewSearchQuery: 'גנן' },
  seamstress:                 { googlePlacesType: null,                 hebrewSearchQuery: 'תופרת' },
  upholsterer:                { googlePlacesType: null,                 hebrewSearchQuery: 'רפד' },
  glazier:                    { googlePlacesType: null,                 hebrewSearchQuery: 'זגג' },
  handyman:                   { googlePlacesType: 'general_contractor', hebrewSearchQuery: 'הנדימן' },
  gas_technician:             { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי גז' },
  exterminator:               { googlePlacesType: null,                 hebrewSearchQuery: 'הדברה' },
  shutter_technician:         { googlePlacesType: null,                 hebrewSearchQuery: 'תריסים תיקון' },
  waterproofing_specialist:   { googlePlacesType: null,                 hebrewSearchQuery: 'איטום' },
  tiler:                      { googlePlacesType: null,                 hebrewSearchQuery: 'רצף אריחים' },
  plasterer:                  { googlePlacesType: null,                 hebrewSearchQuery: 'טייח גבס שפכטל' },
  metalworker:                { googlePlacesType: null,                 hebrewSearchQuery: 'מסגר' },
  solar_water_heater_tech:    { googlePlacesType: null,                 hebrewSearchQuery: 'טכנאי דודי שמש' },
  renovator:                  { googlePlacesType: null,                 hebrewSearchQuery: 'שיפוצניק קבלן שיפוצים' },
  door_installer:             { googlePlacesType: null,                 hebrewSearchQuery: 'התקנת דלתות' },
  security_camera_installer:  { googlePlacesType: null,                 hebrewSearchQuery: 'התקנת מצלמות אבטחה' },
};

export function getGooglePlacesType(profession: string): string | null {
  return PROFESSION_MAP[profession]?.googlePlacesType ?? null;
}

export function getHebrewSearchQuery(profession: string): string {
  return PROFESSION_MAP[profession]?.hebrewSearchQuery ?? profession;
}

interface UrgencySearchConfig {
  radiusMeters: number;
  maxProviders: number;
  tonePrefix: string;
}

const URGENCY_CONFIGS: Record<string, UrgencySearchConfig> = {
  urgent:   { radiusMeters: 40000, maxProviders: 10, tonePrefix: '⚠️ בקשה דחופה — ' },
  normal:   { radiusMeters: 20000, maxProviders: 5,  tonePrefix: '' },
  flexible: { radiusMeters: 15000, maxProviders: 5,  tonePrefix: '' },
};

export function getUrgencyConfig(urgency: string): UrgencySearchConfig {
  return URGENCY_CONFIGS[urgency] ?? URGENCY_CONFIGS['normal'];
}
