// Single source of truth: problem-to-professional mapping for the Israeli market.

export type Urgency = 'urgent' | 'normal' | 'flexible';

export type ProfessionKey =
  | 'plumber' | 'electrician' | 'hvac_contractor' | 'locksmith'
  | 'home_appliance_repair' | 'computer_repair' | 'mobile_repair'
  | 'tv_repair' | 'painter' | 'cleaning_service' | 'moving_company'
  | 'roofer' | 'carpenter' | 'gardener' | 'seamstress'
  | 'upholsterer' | 'glazier' | 'handyman'
  | 'gas_technician' | 'exterminator' | 'shutter_technician'
  | 'waterproofing_specialist' | 'tiler' | 'plasterer'
  | 'metalworker' | 'solar_water_heater_tech' | 'renovator'
  | 'door_installer' | 'security_camera_installer';

export interface Profession {
  key: ProfessionKey;
  labelHe: string;
  googlePlacesType: string | null;
  hebrewSearchQuery: string;
}

export interface Problem {
  id: string;
  descriptionHe: string;
  descriptionEn: string;
  keywords: string[];
  professions: ProfessionKey[];
  urgency: Urgency;
}

export interface DomainCategory {
  id: string;
  labelHe: string;
  labelEn: string;
  problems: Problem[];
}

export const PROFESSIONS: Profession[] = [
  { key: 'plumber', labelHe: 'אינסטלטור', googlePlacesType: 'plumber', hebrewSearchQuery: 'אינסטלטור' },
  { key: 'electrician', labelHe: 'חשמלאי', googlePlacesType: 'electrician', hebrewSearchQuery: 'חשמלאי' },
  { key: 'hvac_contractor', labelHe: 'טכנאי מיזוג אוויר', googlePlacesType: null, hebrewSearchQuery: 'טכנאי מיזוג אוויר' },
  { key: 'locksmith', labelHe: 'מנעולן', googlePlacesType: 'locksmith', hebrewSearchQuery: 'מנעולן' },
  { key: 'home_appliance_repair', labelHe: 'טכנאי מוצרי חשמל', googlePlacesType: null, hebrewSearchQuery: 'טכנאי מוצרי חשמל' },
  { key: 'computer_repair', labelHe: 'טכנאי מחשבים', googlePlacesType: null, hebrewSearchQuery: 'טכנאי מחשבים' },
  { key: 'mobile_repair', labelHe: 'טכנאי סלולר', googlePlacesType: null, hebrewSearchQuery: 'תיקון טלפונים סלולריים' },
  { key: 'tv_repair', labelHe: 'טכנאי טלוויזיה', googlePlacesType: null, hebrewSearchQuery: 'טכנאי טלוויזיות' },
  { key: 'painter', labelHe: 'צבעי', googlePlacesType: 'painter', hebrewSearchQuery: 'צבעי' },
  { key: 'cleaning_service', labelHe: 'חברת ניקיון', googlePlacesType: null, hebrewSearchQuery: 'חברת ניקיון' },
  { key: 'moving_company', labelHe: 'חברת הובלות', googlePlacesType: 'moving_company', hebrewSearchQuery: 'חברת הובלות' },
  { key: 'roofer', labelHe: 'גגן', googlePlacesType: 'roofing_contractor', hebrewSearchQuery: 'גגן' },
  { key: 'carpenter', labelHe: 'נגר', googlePlacesType: null, hebrewSearchQuery: 'נגר' },
  { key: 'gardener', labelHe: 'גנן', googlePlacesType: null, hebrewSearchQuery: 'גנן' },
  { key: 'seamstress', labelHe: 'תופרת', googlePlacesType: null, hebrewSearchQuery: 'תופרת' },
  { key: 'upholsterer', labelHe: 'רפד', googlePlacesType: null, hebrewSearchQuery: 'רפד' },
  { key: 'glazier', labelHe: 'זגג', googlePlacesType: null, hebrewSearchQuery: 'זגג' },
  { key: 'handyman', labelHe: 'הנדימן', googlePlacesType: 'general_contractor', hebrewSearchQuery: 'הנדימן' },
  { key: 'gas_technician', labelHe: 'טכנאי גז', googlePlacesType: null, hebrewSearchQuery: 'טכנאי גז' },
  { key: 'exterminator', labelHe: 'מדביר', googlePlacesType: null, hebrewSearchQuery: 'הדברה' },
  { key: 'shutter_technician', labelHe: 'טכנאי תריסים', googlePlacesType: null, hebrewSearchQuery: 'תריסים תיקון' },
  { key: 'waterproofing_specialist', labelHe: 'קבלן איטום', googlePlacesType: null, hebrewSearchQuery: 'איטום' },
  { key: 'tiler', labelHe: 'רצף', googlePlacesType: null, hebrewSearchQuery: 'רצף אריחים' },
  { key: 'plasterer', labelHe: 'טייח / קבלן גבס', googlePlacesType: null, hebrewSearchQuery: 'טייח גבס שפכטל' },
  { key: 'metalworker', labelHe: 'מסגר', googlePlacesType: null, hebrewSearchQuery: 'מסגר' },
  { key: 'solar_water_heater_tech', labelHe: 'טכנאי דודי שמש', googlePlacesType: null, hebrewSearchQuery: 'טכנאי דודי שמש' },
  { key: 'renovator', labelHe: 'שיפוצניק', googlePlacesType: null, hebrewSearchQuery: 'שיפוצניק קבלן שיפוצים' },
  { key: 'door_installer', labelHe: 'מתקין דלתות', googlePlacesType: null, hebrewSearchQuery: 'התקנת דלתות' },
  { key: 'security_camera_installer', labelHe: 'מתקין מצלמות', googlePlacesType: null, hebrewSearchQuery: 'התקנת מצלמות אבטחה' },
] as const;

const WATER_PROBLEMS: Problem[] = [
  { id: 'burst_pipe', descriptionHe: 'צינור פרוץ', descriptionEn: 'Burst pipe', keywords: ['צינור', 'פרוץ', 'pipe', 'burst', 'נזילה'], professions: ['plumber'], urgency: 'urgent' },
  { id: 'flooding', descriptionHe: 'הצפה בבית', descriptionEn: 'Home flooding', keywords: ['הצפה', 'מים', 'flooding', 'water', 'בית'], professions: ['plumber'], urgency: 'urgent' },
  { id: 'sewer_backup', descriptionHe: 'ביוב חוזר / ריח ביוב', descriptionEn: 'Sewer backup', keywords: ['ביוב', 'ריח', 'sewer', 'backup', 'סתימה'], professions: ['plumber'], urgency: 'urgent' },
  { id: 'water_heater_leak', descriptionHe: 'דוד שמש / בויילר דולף', descriptionEn: 'Water heater leak', keywords: ['דוד', 'שמש', 'דולף', 'heater', 'leak'], professions: ['solar_water_heater_tech', 'plumber'], urgency: 'urgent' },
  { id: 'no_hot_water', descriptionHe: 'אין מים חמים', descriptionEn: 'No hot water', keywords: ['מים', 'חמים', 'hot', 'water', 'דוד'], professions: ['solar_water_heater_tech', 'plumber'], urgency: 'normal' },
  { id: 'leaking_faucet', descriptionHe: 'ברז מטפטף', descriptionEn: 'Leaking faucet', keywords: ['ברז', 'מטפטף', 'faucet', 'leak', 'טפטוף'], professions: ['plumber'], urgency: 'flexible' },
  { id: 'clogged_drain', descriptionHe: 'סתימה בכיור', descriptionEn: 'Clogged drain', keywords: ['סתימה', 'כיור', 'clogged', 'drain'], professions: ['plumber'], urgency: 'normal' },
  { id: 'clogged_toilet', descriptionHe: 'סתימה בשירותים', descriptionEn: 'Clogged toilet', keywords: ['סתימה', 'שירותים', 'clogged', 'toilet'], professions: ['plumber'], urgency: 'normal' },
  { id: 'toilet_running', descriptionHe: 'שירותים לא מפסיקים לזרום', descriptionEn: 'Toilet running', keywords: ['שירותים', 'זורם', 'running', 'toilet', 'מים'], professions: ['plumber'], urgency: 'normal' },
  { id: 'toilet_broken', descriptionHe: 'שירותים שבורים', descriptionEn: 'Broken toilet', keywords: ['שירותים', 'שבור', 'broken', 'toilet'], professions: ['plumber'], urgency: 'normal' },
  { id: 'low_water_pressure', descriptionHe: 'לחץ מים חלש', descriptionEn: 'Low water pressure', keywords: ['לחץ', 'מים', 'חלש', 'pressure', 'water'], professions: ['plumber'], urgency: 'flexible' },
  { id: 'leaking_pipe_wall', descriptionHe: 'רטיבות בקיר / צינור דולף', descriptionEn: 'Pipe leak in wall', keywords: ['רטיבות', 'קיר', 'צינור', 'pipe', 'leak'], professions: ['plumber'], urgency: 'urgent' },
  { id: 'dripping_ceiling', descriptionHe: 'טפטוף מהתקרה', descriptionEn: 'Dripping ceiling', keywords: ['טפטוף', 'תקרה', 'dripping', 'ceiling'], professions: ['plumber', 'roofer'], urgency: 'urgent' },
  { id: 'water_meter_issue', descriptionHe: 'בעיה במד מים', descriptionEn: 'Water meter issue', keywords: ['מד', 'מים', 'meter', 'water'], professions: ['plumber'], urgency: 'flexible' },
  { id: 'irrigation_leak', descriptionHe: 'נזילה במערכת השקיה', descriptionEn: 'Irrigation leak', keywords: ['השקיה', 'נזילה', 'irrigation', 'leak'], professions: ['plumber', 'gardener'], urgency: 'flexible' },
  { id: 'washing_machine_flood', descriptionHe: 'מכונת כביסה הציפה', descriptionEn: 'Washing machine flood', keywords: ['מכונת כביסה', 'הצפה', 'washing', 'flood'], professions: ['plumber', 'home_appliance_repair'], urgency: 'urgent' },
  { id: 'shower_leak', descriptionHe: 'דליפה במקלחת', descriptionEn: 'Shower leak', keywords: ['מקלחת', 'דליפה', 'shower', 'leak'], professions: ['plumber'], urgency: 'normal' },
  { id: 'bathtub_drain_slow', descriptionHe: 'אמבטיה מתנקזת לאט', descriptionEn: 'Slow bathtub drain', keywords: ['אמבטיה', 'ניקוז', 'bathtub', 'drain', 'slow'], professions: ['plumber'], urgency: 'flexible' },
  { id: 'outdoor_faucet_broken', descriptionHe: 'ברז חיצוני שבור', descriptionEn: 'Broken outdoor faucet', keywords: ['ברז', 'חיצוני', 'שבור', 'outdoor', 'faucet'], professions: ['plumber'], urgency: 'flexible' },
  { id: 'water_filter_install', descriptionHe: 'התקנת מסנן מים', descriptionEn: 'Water filter install', keywords: ['מסנן', 'מים', 'filter', 'install'], professions: ['plumber'], urgency: 'flexible' },
  { id: 'dishwasher_leak', descriptionHe: 'מדיח כלים דולף', descriptionEn: 'Dishwasher leak', keywords: ['מדיח', 'דולף', 'dishwasher', 'leak'], professions: ['plumber', 'home_appliance_repair'], urgency: 'normal' },
  { id: 'water_softener_issue', descriptionHe: 'בעיה ברכיכת מים', descriptionEn: 'Water softener issue', keywords: ['רכיכת', 'מים', 'softener', 'water'], professions: ['plumber'], urgency: 'flexible' },
];

const ELECTRICAL_PROBLEMS: Problem[] = [
  { id: 'power_outage_home', descriptionHe: 'הפסקת חשמל בבית', descriptionEn: 'Home power outage', keywords: ['חשמל', 'הפסקה', 'power', 'outage'], professions: ['electrician'], urgency: 'urgent' },
  { id: 'sparking_outlet', descriptionHe: 'שקע מוציא ניצוצות', descriptionEn: 'Sparking outlet', keywords: ['שקע', 'ניצוצות', 'sparking', 'outlet'], professions: ['electrician'], urgency: 'urgent' },
  { id: 'burning_smell_electrical', descriptionHe: 'ריח שריפה מהחשמל', descriptionEn: 'Burning smell from electrical', keywords: ['ריח', 'שריפה', 'חשמל', 'burning', 'smell'], professions: ['electrician'], urgency: 'urgent' },
  { id: 'breaker_keeps_tripping', descriptionHe: 'מפסק חשמל נופל כל הזמן', descriptionEn: 'Circuit breaker tripping', keywords: ['מפסק', 'חשמל', 'נופל', 'breaker', 'tripping'], professions: ['electrician'], urgency: 'normal' },
  { id: 'outlet_not_working', descriptionHe: 'שקע לא עובד', descriptionEn: 'Outlet not working', keywords: ['שקע', 'לא עובד', 'outlet', 'not working'], professions: ['electrician'], urgency: 'normal' },
  { id: 'light_switch_broken', descriptionHe: 'מתג אור לא עובד', descriptionEn: 'Broken light switch', keywords: ['מתג', 'אור', 'switch', 'light', 'שבור'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'flickering_lights', descriptionHe: 'אורות מהבהבים', descriptionEn: 'Flickering lights', keywords: ['אורות', 'מהבהבים', 'flickering', 'lights'], professions: ['electrician'], urgency: 'normal' },
  { id: 'no_power_one_room', descriptionHe: 'אין חשמל בחדר אחד', descriptionEn: 'No power in one room', keywords: ['חשמל', 'חדר', 'power', 'room'], professions: ['electrician'], urgency: 'normal' },
  { id: 'install_new_outlet', descriptionHe: 'התקנת שקע חדש', descriptionEn: 'Install new outlet', keywords: ['התקנה', 'שקע', 'חדש', 'outlet', 'install'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'install_light_fixture', descriptionHe: 'התקנת מנורה / גוף תאורה', descriptionEn: 'Install light fixture', keywords: ['מנורה', 'תאורה', 'light', 'fixture', 'התקנה'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'ceiling_fan_install', descriptionHe: 'התקנת מאוורר תקרה', descriptionEn: 'Ceiling fan install', keywords: ['מאוורר', 'תקרה', 'ceiling', 'fan', 'התקנה'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'outdoor_lighting', descriptionHe: 'תאורת חוץ / גינה', descriptionEn: 'Outdoor lighting', keywords: ['תאורה', 'חוץ', 'גינה', 'outdoor', 'lighting'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'electrical_panel_issue', descriptionHe: 'בעיה בלוח חשמל', descriptionEn: 'Electrical panel issue', keywords: ['לוח', 'חשמל', 'panel', 'electrical'], professions: ['electrician'], urgency: 'urgent' },
  { id: 'rewiring_old_home', descriptionHe: 'חיווט מחדש בבית ישן', descriptionEn: 'Rewiring old home', keywords: ['חיווט', 'בית', 'ישן', 'rewiring', 'old'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'intercom_broken', descriptionHe: 'אינטרקום לא עובד', descriptionEn: 'Broken intercom', keywords: ['אינטרקום', 'שבור', 'intercom', 'broken'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'electric_gate_issue', descriptionHe: 'שער חשמלי לא עובד', descriptionEn: 'Electric gate issue', keywords: ['שער', 'חשמלי', 'electric', 'gate'], professions: ['electrician', 'metalworker'], urgency: 'normal' },
  { id: 'electric_water_heater_issue', descriptionHe: 'בויילר חשמלי לא מחמם', descriptionEn: 'Electric water heater not heating', keywords: ['בויילר', 'חשמלי', 'מחמם', 'heater', 'electric'], professions: ['electrician', 'plumber'], urgency: 'normal' },
  { id: 'usb_outlet_install', descriptionHe: 'התקנת שקע USB', descriptionEn: 'USB outlet install', keywords: ['שקע', 'USB', 'התקנה', 'outlet'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'smart_home_wiring', descriptionHe: 'חיווט בית חכם', descriptionEn: 'Smart home wiring', keywords: ['בית חכם', 'חיווט', 'smart', 'home', 'wiring'], professions: ['electrician'], urgency: 'flexible' },
  { id: 'generator_issue', descriptionHe: 'בעיה בגנרטור', descriptionEn: 'Generator issue', keywords: ['גנרטור', 'חשמל', 'generator', 'power'], professions: ['electrician'], urgency: 'normal' },
];

const HVAC_PROBLEMS: Problem[] = [
  { id: 'ac_not_cooling', descriptionHe: 'מזגן לא מקרר', descriptionEn: 'AC not cooling', keywords: ['מזגן', 'מקרר', 'AC', 'cooling'], professions: ['hvac_contractor'], urgency: 'normal' },
  { id: 'ac_not_heating', descriptionHe: 'מזגן לא מחמם', descriptionEn: 'AC not heating', keywords: ['מזגן', 'מחמם', 'AC', 'heating'], professions: ['hvac_contractor'], urgency: 'normal' },
  { id: 'ac_leaking_water', descriptionHe: 'מזגן מטפטף מים', descriptionEn: 'AC leaking water', keywords: ['מזגן', 'מטפטף', 'מים', 'AC', 'leak'], professions: ['hvac_contractor', 'plumber'], urgency: 'normal' },
  { id: 'ac_bad_smell', descriptionHe: 'ריח רע מהמזגן', descriptionEn: 'Bad smell from AC', keywords: ['מזגן', 'ריח', 'smell', 'AC'], professions: ['hvac_contractor'], urgency: 'normal' },
  { id: 'ac_noisy', descriptionHe: 'מזגן רועש', descriptionEn: 'Noisy AC', keywords: ['מזגן', 'רועש', 'noisy', 'AC'], professions: ['hvac_contractor'], urgency: 'flexible' },
  { id: 'ac_remote_broken', descriptionHe: 'שלט מזגן לא עובד', descriptionEn: 'AC remote not working', keywords: ['שלט', 'מזגן', 'remote', 'AC'], professions: ['hvac_contractor'], urgency: 'flexible' },
  { id: 'ac_install_new', descriptionHe: 'התקנת מזגן חדש', descriptionEn: 'New AC install', keywords: ['התקנה', 'מזגן', 'חדש', 'AC', 'install'], professions: ['hvac_contractor'], urgency: 'flexible' },
  { id: 'ac_move_unit', descriptionHe: 'הזזת מזגן', descriptionEn: 'Move AC unit', keywords: ['מזגן', 'הזזה', 'move', 'AC'], professions: ['hvac_contractor'], urgency: 'flexible' },
  { id: 'ac_gas_refill', descriptionHe: 'מילוי גז למזגן', descriptionEn: 'AC gas refill', keywords: ['מזגן', 'גז', 'מילוי', 'gas', 'refill'], professions: ['hvac_contractor'], urgency: 'normal' },
  { id: 'ac_filter_cleaning', descriptionHe: 'ניקוי מסנני מזגן', descriptionEn: 'AC filter cleaning', keywords: ['מזגן', 'מסנן', 'ניקוי', 'filter', 'cleaning'], professions: ['hvac_contractor'], urgency: 'flexible' },
  { id: 'ac_outdoor_unit_noise', descriptionHe: 'יחידה חיצונית רועשת', descriptionEn: 'Noisy outdoor unit', keywords: ['יחידה', 'חיצונית', 'רועשת', 'outdoor', 'noisy'], professions: ['hvac_contractor'], urgency: 'flexible' },
  { id: 'central_ac_issue', descriptionHe: 'בעיה במיזוג מרכזי', descriptionEn: 'Central AC issue', keywords: ['מיזוג', 'מרכזי', 'central', 'AC'], professions: ['hvac_contractor'], urgency: 'normal' },
  { id: 'heater_not_working', descriptionHe: 'תנור חימום לא עובד', descriptionEn: 'Heater not working', keywords: ['תנור', 'חימום', 'heater', 'not working'], professions: ['hvac_contractor', 'electrician'], urgency: 'normal' },
  { id: 'ventilation_issue', descriptionHe: 'בעיית אוורור', descriptionEn: 'Ventilation issue', keywords: ['אוורור', 'ventilation', 'אוויר', 'air'], professions: ['hvac_contractor'], urgency: 'flexible' },
  { id: 'ac_duct_cleaning', descriptionHe: 'ניקוי תעלות מיזוג', descriptionEn: 'AC duct cleaning', keywords: ['תעלות', 'מיזוג', 'ניקוי', 'duct', 'cleaning'], professions: ['hvac_contractor', 'cleaning_service'], urgency: 'flexible' },
  { id: 'mini_split_issue', descriptionHe: 'תקלה במיני ספליט', descriptionEn: 'Mini-split issue', keywords: ['מיני ספליט', 'תקלה', 'mini', 'split'], professions: ['hvac_contractor'], urgency: 'normal' },
];

const APPLIANCE_PROBLEMS: Problem[] = [
  { id: 'washing_machine_broken', descriptionHe: 'מכונת כביסה לא עובדת', descriptionEn: 'Washing machine broken', keywords: ['מכונת כביסה', 'שבורה', 'washing', 'machine', 'broken'], professions: ['home_appliance_repair'], urgency: 'normal' },
  { id: 'dryer_not_drying', descriptionHe: 'מייבש לא מייבש', descriptionEn: 'Dryer not drying', keywords: ['מייבש', 'לא מייבש', 'dryer', 'not drying'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'dryer_noisy', descriptionHe: 'מייבש רועש', descriptionEn: 'Noisy dryer', keywords: ['מייבש', 'רועש', 'dryer', 'noisy'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'fridge_not_cooling', descriptionHe: 'מקרר לא מקרר', descriptionEn: 'Fridge not cooling', keywords: ['מקרר', 'לא מקרר', 'fridge', 'cooling'], professions: ['home_appliance_repair'], urgency: 'urgent' },
  { id: 'fridge_noisy', descriptionHe: 'מקרר רועש', descriptionEn: 'Noisy fridge', keywords: ['מקרר', 'רועש', 'fridge', 'noisy'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'fridge_leaking', descriptionHe: 'מקרר דולף מים', descriptionEn: 'Fridge leaking', keywords: ['מקרר', 'דולף', 'fridge', 'leaking'], professions: ['home_appliance_repair'], urgency: 'normal' },
  { id: 'freezer_not_freezing', descriptionHe: 'מקפיא לא מקפיא', descriptionEn: 'Freezer not freezing', keywords: ['מקפיא', 'לא מקפיא', 'freezer', 'not freezing'], professions: ['home_appliance_repair'], urgency: 'urgent' },
  { id: 'oven_not_heating', descriptionHe: 'תנור לא מחמם', descriptionEn: 'Oven not heating', keywords: ['תנור', 'לא מחמם', 'oven', 'heating'], professions: ['home_appliance_repair'], urgency: 'normal' },
  { id: 'oven_door_broken', descriptionHe: 'דלת תנור שבורה', descriptionEn: 'Broken oven door', keywords: ['דלת', 'תנור', 'שבורה', 'oven', 'door'], professions: ['home_appliance_repair'], urgency: 'normal' },
  { id: 'stovetop_burner_issue', descriptionHe: 'כיריים לא נדלקות', descriptionEn: 'Stovetop burner issue', keywords: ['כיריים', 'נדלקות', 'stovetop', 'burner'], professions: ['home_appliance_repair'], urgency: 'normal' },
  { id: 'gas_stove_smell', descriptionHe: 'ריח גז מהכיריים', descriptionEn: 'Gas smell from stove', keywords: ['גז', 'ריח', 'כיריים', 'gas', 'smell'], professions: ['gas_technician'], urgency: 'urgent' },
  { id: 'dishwasher_not_working', descriptionHe: 'מדיח כלים לא עובד', descriptionEn: 'Dishwasher not working', keywords: ['מדיח', 'כלים', 'dishwasher', 'not working'], professions: ['home_appliance_repair'], urgency: 'normal' },
  { id: 'dishwasher_not_draining', descriptionHe: 'מדיח כלים לא מנקז', descriptionEn: 'Dishwasher not draining', keywords: ['מדיח', 'מנקז', 'dishwasher', 'draining'], professions: ['home_appliance_repair'], urgency: 'normal' },
  { id: 'microwave_broken', descriptionHe: 'מיקרוגל לא עובד', descriptionEn: 'Broken microwave', keywords: ['מיקרוגל', 'שבור', 'microwave', 'broken'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'coffee_machine_broken', descriptionHe: 'מכונת קפה לא עובדת', descriptionEn: 'Broken coffee machine', keywords: ['מכונת קפה', 'שבורה', 'coffee', 'machine'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'vacuum_broken', descriptionHe: 'שואב אבק לא עובד', descriptionEn: 'Broken vacuum', keywords: ['שואב אבק', 'שבור', 'vacuum', 'broken'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'iron_broken', descriptionHe: 'מגהץ לא עובד', descriptionEn: 'Broken iron', keywords: ['מגהץ', 'שבור', 'iron', 'broken'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'water_dispenser_issue', descriptionHe: 'בעיה בבר מים', descriptionEn: 'Water dispenser issue', keywords: ['בר מים', 'בעיה', 'water', 'dispenser'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'washing_machine_vibrating', descriptionHe: 'מכונת כביסה רוטטת', descriptionEn: 'Vibrating washing machine', keywords: ['מכונת כביסה', 'רוטטת', 'washing', 'vibrating'], professions: ['home_appliance_repair'], urgency: 'flexible' },
  { id: 'appliance_install', descriptionHe: 'התקנת מוצר חשמלי חדש', descriptionEn: 'New appliance install', keywords: ['התקנה', 'מוצר חשמלי', 'appliance', 'install'], professions: ['home_appliance_repair'], urgency: 'flexible' },
];

const FURNITURE_PROBLEMS: Problem[] = [
  { id: 'door_stuck', descriptionHe: 'דלת תקועה / לא נסגרת', descriptionEn: 'Stuck door', keywords: ['דלת', 'תקועה', 'door', 'stuck'], professions: ['door_installer', 'carpenter'], urgency: 'normal' },
  { id: 'door_hinge_broken', descriptionHe: 'ציר דלת שבור', descriptionEn: 'Broken door hinge', keywords: ['ציר', 'דלת', 'שבור', 'hinge', 'door'], professions: ['door_installer', 'carpenter'], urgency: 'normal' },
  { id: 'cabinet_door_broken', descriptionHe: 'דלת ארון שבורה', descriptionEn: 'Broken cabinet door', keywords: ['דלת', 'ארון', 'שבורה', 'cabinet', 'door'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'drawer_stuck', descriptionHe: 'מגירה תקועה', descriptionEn: 'Stuck drawer', keywords: ['מגירה', 'תקועה', 'drawer', 'stuck'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'shelf_broken', descriptionHe: 'מדף שבור / נפל', descriptionEn: 'Broken shelf', keywords: ['מדף', 'שבור', 'נפל', 'shelf', 'broken'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'closet_door_derailed', descriptionHe: 'דלת ארון הזזה ירדה מהמסילה', descriptionEn: 'Closet door derailed', keywords: ['ארון', 'הזזה', 'מסילה', 'closet', 'derailed'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'table_wobbling', descriptionHe: 'שולחן מתנדנד', descriptionEn: 'Wobbling table', keywords: ['שולחן', 'מתנדנד', 'table', 'wobbling'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'chair_broken', descriptionHe: 'כיסא שבור', descriptionEn: 'Broken chair', keywords: ['כיסא', 'שבור', 'chair', 'broken'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'bed_frame_broken', descriptionHe: 'מסגרת מיטה שבורה', descriptionEn: 'Broken bed frame', keywords: ['מיטה', 'מסגרת', 'שבורה', 'bed', 'frame'], professions: ['carpenter'], urgency: 'normal' },
  { id: 'wood_floor_damaged', descriptionHe: 'פרקט פגום / שרוט', descriptionEn: 'Damaged wood floor', keywords: ['פרקט', 'פגום', 'שרוט', 'wood', 'floor'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'wood_rot_repair', descriptionHe: 'עץ רקוב', descriptionEn: 'Wood rot repair', keywords: ['עץ', 'רקוב', 'wood', 'rot'], professions: ['carpenter'], urgency: 'normal' },
  { id: 'kitchen_cabinet_repair', descriptionHe: 'תיקון ארון מטבח', descriptionEn: 'Kitchen cabinet repair', keywords: ['ארון', 'מטבח', 'תיקון', 'kitchen', 'cabinet'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'custom_furniture', descriptionHe: 'ריהוט מותאם אישית', descriptionEn: 'Custom furniture', keywords: ['ריהוט', 'מותאם', 'custom', 'furniture'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'sofa_broken_frame', descriptionHe: 'ספה שבורה (שלד)', descriptionEn: 'Sofa broken frame', keywords: ['ספה', 'שבורה', 'שלד', 'sofa', 'frame'], professions: ['carpenter', 'upholsterer'], urgency: 'flexible' },
  { id: 'sofa_fabric_torn', descriptionHe: 'ספה קרועה (בד/עור)', descriptionEn: 'Sofa fabric torn', keywords: ['ספה', 'קרועה', 'בד', 'sofa', 'fabric'], professions: ['upholsterer'], urgency: 'flexible' },
  { id: 'chair_reupholster', descriptionHe: 'ריפוד כיסא מחדש', descriptionEn: 'Chair reupholster', keywords: ['ריפוד', 'כיסא', 'reupholster', 'chair'], professions: ['upholsterer'], urgency: 'flexible' },
  { id: 'curtain_rod_install', descriptionHe: 'התקנת מוט וילון', descriptionEn: 'Curtain rod install', keywords: ['מוט', 'וילון', 'curtain', 'rod', 'התקנה'], professions: ['carpenter', 'handyman'], urgency: 'flexible' },
  { id: 'furniture_assembly', descriptionHe: 'הרכבת רהיטים', descriptionEn: 'Furniture assembly', keywords: ['הרכבה', 'רהיטים', 'furniture', 'assembly'], professions: ['handyman', 'carpenter'], urgency: 'flexible' },
];

const RENOVATION_PROBLEMS: Problem[] = [
  { id: 'wall_crack', descriptionHe: 'סדק בקיר', descriptionEn: 'Wall crack', keywords: ['סדק', 'קיר', 'wall', 'crack'], professions: ['plasterer', 'painter'], urgency: 'normal' },
  { id: 'ceiling_crack', descriptionHe: 'סדק בתקרה', descriptionEn: 'Ceiling crack', keywords: ['סדק', 'תקרה', 'ceiling', 'crack'], professions: ['plasterer', 'painter'], urgency: 'normal' },
  { id: 'peeling_paint', descriptionHe: 'צבע מתקלף', descriptionEn: 'Peeling paint', keywords: ['צבע', 'מתקלף', 'peeling', 'paint'], professions: ['painter'], urgency: 'flexible' },
  { id: 'wall_damp_mold', descriptionHe: 'רטיבות / עובש בקיר', descriptionEn: 'Wall damp/mold', keywords: ['רטיבות', 'עובש', 'קיר', 'damp', 'mold'], professions: ['waterproofing_specialist', 'plumber'], urgency: 'urgent' },
  { id: 'paint_room', descriptionHe: 'צביעת חדר', descriptionEn: 'Paint a room', keywords: ['צביעה', 'חדר', 'paint', 'room'], professions: ['painter'], urgency: 'flexible' },
  { id: 'paint_apartment', descriptionHe: 'צביעת דירה', descriptionEn: 'Paint apartment', keywords: ['צביעה', 'דירה', 'paint', 'apartment'], professions: ['painter'], urgency: 'flexible' },
  { id: 'paint_exterior', descriptionHe: 'צביעת חוץ', descriptionEn: 'Exterior painting', keywords: ['צביעה', 'חוץ', 'exterior', 'painting'], professions: ['painter'], urgency: 'flexible' },
  { id: 'drywall_hole', descriptionHe: 'חור בגבס', descriptionEn: 'Drywall hole', keywords: ['חור', 'גבס', 'drywall', 'hole'], professions: ['plasterer', 'painter'], urgency: 'flexible' },
  { id: 'tile_broken', descriptionHe: 'אריח שבור', descriptionEn: 'Broken tile', keywords: ['אריח', 'שבור', 'tile', 'broken'], professions: ['tiler'], urgency: 'flexible' },
  { id: 'tile_grout_repair', descriptionHe: 'תיקון רובה בין אריחים', descriptionEn: 'Tile grout repair', keywords: ['רובה', 'אריחים', 'grout', 'tile'], professions: ['tiler'], urgency: 'flexible' },
  { id: 'wallpaper_peel', descriptionHe: 'טפט מתקלף', descriptionEn: 'Peeling wallpaper', keywords: ['טפט', 'מתקלף', 'wallpaper', 'peeling'], professions: ['painter'], urgency: 'flexible' },
  { id: 'ceiling_water_stain', descriptionHe: 'כתם מים בתקרה', descriptionEn: 'Ceiling water stain', keywords: ['כתם', 'מים', 'תקרה', 'ceiling', 'stain'], professions: ['painter', 'plumber'], urgency: 'normal' },
  { id: 'post_renovation_clean', descriptionHe: 'ניקיון אחרי שיפוץ', descriptionEn: 'Post renovation cleaning', keywords: ['ניקיון', 'שיפוץ', 'cleaning', 'renovation'], professions: ['cleaning_service'], urgency: 'flexible' },
  { id: 'deep_cleaning', descriptionHe: 'ניקיון יסודי', descriptionEn: 'Deep cleaning', keywords: ['ניקיון', 'יסודי', 'deep', 'cleaning'], professions: ['cleaning_service'], urgency: 'flexible' },
  { id: 'window_seal_broken', descriptionHe: 'איטום חלון שבור', descriptionEn: 'Broken window seal', keywords: ['איטום', 'חלון', 'שבור', 'window', 'seal'], professions: ['glazier', 'handyman'], urgency: 'normal' },
  { id: 'balcony_waterproof', descriptionHe: 'איטום מרפסת', descriptionEn: 'Balcony waterproofing', keywords: ['איטום', 'מרפסת', 'balcony', 'waterproofing'], professions: ['waterproofing_specialist'], urgency: 'normal' },
  { id: 'bathroom_tile_repair', descriptionHe: 'תיקון אריחים בחדר רחצה', descriptionEn: 'Bathroom tile repair', keywords: ['אריחים', 'חדר רחצה', 'bathroom', 'tile'], professions: ['tiler'], urgency: 'flexible' },
  { id: 'kitchen_backsplash', descriptionHe: 'התקנת חיפוי מטבח', descriptionEn: 'Kitchen backsplash', keywords: ['חיפוי', 'מטבח', 'backsplash', 'kitchen'], professions: ['tiler'], urgency: 'flexible' },
  { id: 'floor_tiling', descriptionHe: 'ריצוף רצפה', descriptionEn: 'Floor tiling', keywords: ['ריצוף', 'רצפה', 'floor', 'tiling'], professions: ['tiler'], urgency: 'flexible' },
  { id: 'balcony_tiling', descriptionHe: 'ריצוף מרפסת', descriptionEn: 'Balcony tiling', keywords: ['ריצוף', 'מרפסת', 'balcony', 'tiling'], professions: ['tiler'], urgency: 'flexible' },
  { id: 'tile_leveling', descriptionHe: 'יישור אריחים בולטים', descriptionEn: 'Tile leveling', keywords: ['אריחים', 'בולטים', 'יישור', 'tile', 'leveling'], professions: ['tiler'], urgency: 'flexible' },
  { id: 'shower_retile', descriptionHe: 'החלפת אריחים במקלחת', descriptionEn: 'Shower retile', keywords: ['אריחים', 'מקלחת', 'shower', 'retile'], professions: ['tiler', 'waterproofing_specialist'], urgency: 'flexible' },
  { id: 'drywall_partition', descriptionHe: 'הקמת מחיצת גבס', descriptionEn: 'Drywall partition', keywords: ['מחיצה', 'גבס', 'drywall', 'partition'], professions: ['plasterer'], urgency: 'flexible' },
  { id: 'ceiling_plaster_damage', descriptionHe: 'טיח תקרה מתקלף', descriptionEn: 'Ceiling plaster damage', keywords: ['טיח', 'תקרה', 'מתקלף', 'plaster', 'ceiling'], professions: ['plasterer'], urgency: 'normal' },
  { id: 'skim_coat_walls', descriptionHe: 'שפכטל קירות', descriptionEn: 'Skim coat walls', keywords: ['שפכטל', 'קירות', 'skim', 'coat', 'walls'], professions: ['plasterer'], urgency: 'flexible' },
  { id: 'plaster_hole_repair', descriptionHe: 'תיקון חור בטיח', descriptionEn: 'Plaster hole repair', keywords: ['חור', 'טיח', 'plaster', 'hole', 'repair'], professions: ['plasterer'], urgency: 'flexible' },
  { id: 'drywall_ceiling_install', descriptionHe: 'התקנת תקרת גבס', descriptionEn: 'Drywall ceiling install', keywords: ['תקרה', 'גבס', 'התקנה', 'drywall', 'ceiling'], professions: ['plasterer'], urgency: 'flexible' },
  { id: 'arch_or_niche_build', descriptionHe: 'בניית נישה / קשת בגבס', descriptionEn: 'Build arch/niche in drywall', keywords: ['נישה', 'קשת', 'גבס', 'arch', 'niche'], professions: ['plasterer'], urgency: 'flexible' },
];

const TECH_PROBLEMS: Problem[] = [
  { id: 'phone_screen_cracked', descriptionHe: 'מסך טלפון שבור', descriptionEn: 'Cracked phone screen', keywords: ['מסך', 'טלפון', 'שבור', 'phone', 'screen'], professions: ['mobile_repair'], urgency: 'normal' },
  { id: 'phone_battery_drain', descriptionHe: 'סוללת טלפון נגמרת מהר', descriptionEn: 'Phone battery drain', keywords: ['סוללה', 'טלפון', 'battery', 'phone', 'drain'], professions: ['mobile_repair'], urgency: 'flexible' },
  { id: 'phone_not_charging', descriptionHe: 'טלפון לא נטען', descriptionEn: 'Phone not charging', keywords: ['טלפון', 'נטען', 'phone', 'charging'], professions: ['mobile_repair'], urgency: 'normal' },
  { id: 'phone_water_damage', descriptionHe: 'טלפון נפל למים', descriptionEn: 'Phone water damage', keywords: ['טלפון', 'מים', 'phone', 'water', 'damage'], professions: ['mobile_repair'], urgency: 'urgent' },
  { id: 'tablet_screen_broken', descriptionHe: 'מסך טאבלט שבור', descriptionEn: 'Broken tablet screen', keywords: ['טאבלט', 'מסך', 'שבור', 'tablet', 'screen'], professions: ['mobile_repair'], urgency: 'normal' },
  { id: 'laptop_not_turning_on', descriptionHe: 'לפטופ לא נדלק', descriptionEn: 'Laptop not turning on', keywords: ['לפטופ', 'נדלק', 'laptop', 'turning on'], professions: ['computer_repair'], urgency: 'normal' },
  { id: 'laptop_screen_broken', descriptionHe: 'מסך לפטופ שבור', descriptionEn: 'Broken laptop screen', keywords: ['לפטופ', 'מסך', 'שבור', 'laptop', 'screen'], professions: ['computer_repair'], urgency: 'normal' },
  { id: 'laptop_slow', descriptionHe: 'מחשב נייד איטי', descriptionEn: 'Slow laptop', keywords: ['מחשב', 'נייד', 'איטי', 'laptop', 'slow'], professions: ['computer_repair'], urgency: 'flexible' },
  { id: 'desktop_not_working', descriptionHe: 'מחשב נייח לא עובד', descriptionEn: 'Desktop not working', keywords: ['מחשב', 'נייח', 'desktop', 'not working'], professions: ['computer_repair'], urgency: 'normal' },
  { id: 'computer_virus', descriptionHe: 'וירוס במחשב', descriptionEn: 'Computer virus', keywords: ['וירוס', 'מחשב', 'virus', 'computer'], professions: ['computer_repair'], urgency: 'normal' },
  { id: 'wifi_not_working', descriptionHe: 'אינטרנט / WiFi לא עובד', descriptionEn: 'WiFi not working', keywords: ['אינטרנט', 'WiFi', 'wifi', 'internet'], professions: ['computer_repair'], urgency: 'normal' },
  { id: 'router_setup', descriptionHe: 'התקנת ראוטר', descriptionEn: 'Router setup', keywords: ['ראוטר', 'התקנה', 'router', 'setup'], professions: ['computer_repair'], urgency: 'flexible' },
  { id: 'printer_not_working', descriptionHe: 'מדפסת לא עובדת', descriptionEn: 'Printer not working', keywords: ['מדפסת', 'לא עובדת', 'printer', 'not working'], professions: ['computer_repair'], urgency: 'flexible' },
  { id: 'data_recovery', descriptionHe: 'שחזור מידע', descriptionEn: 'Data recovery', keywords: ['שחזור', 'מידע', 'data', 'recovery'], professions: ['computer_repair', 'mobile_repair'], urgency: 'normal' },
  { id: 'tv_no_picture', descriptionHe: 'טלוויזיה לא מציגה תמונה', descriptionEn: 'TV no picture', keywords: ['טלוויזיה', 'תמונה', 'TV', 'picture'], professions: ['tv_repair'], urgency: 'normal' },
  { id: 'tv_no_sound', descriptionHe: 'טלוויזיה בלי קול', descriptionEn: 'TV no sound', keywords: ['טלוויזיה', 'קול', 'TV', 'sound'], professions: ['tv_repair'], urgency: 'flexible' },
  { id: 'tv_screen_cracked', descriptionHe: 'מסך טלוויזיה שבור', descriptionEn: 'Cracked TV screen', keywords: ['טלוויזיה', 'מסך', 'שבור', 'TV', 'screen'], professions: ['tv_repair'], urgency: 'flexible' },
  { id: 'tv_mount_install', descriptionHe: 'התקנת טלוויזיה על הקיר', descriptionEn: 'TV wall mount', keywords: ['טלוויזיה', 'קיר', 'התקנה', 'TV', 'mount'], professions: ['handyman', 'tv_repair'], urgency: 'flexible' },
];

const LOCKS_PROBLEMS: Problem[] = [
  { id: 'locked_out', descriptionHe: 'ננעלתי בחוץ', descriptionEn: 'Locked out', keywords: ['ננעלתי', 'מנעול', 'locked', 'out'], professions: ['locksmith'], urgency: 'urgent' },
  { id: 'key_stuck_in_lock', descriptionHe: 'מפתח תקוע במנעול', descriptionEn: 'Key stuck in lock', keywords: ['מפתח', 'תקוע', 'מנעול', 'key', 'stuck'], professions: ['locksmith'], urgency: 'urgent' },
  { id: 'lock_broken', descriptionHe: 'מנעול שבור', descriptionEn: 'Broken lock', keywords: ['מנעול', 'שבור', 'lock', 'broken'], professions: ['locksmith'], urgency: 'urgent' },
  { id: 'key_copy', descriptionHe: 'שכפול מפתח', descriptionEn: 'Key copy', keywords: ['שכפול', 'מפתח', 'key', 'copy'], professions: ['locksmith'], urgency: 'flexible' },
  { id: 'lock_change', descriptionHe: 'החלפת מנעול', descriptionEn: 'Lock change', keywords: ['החלפה', 'מנעול', 'lock', 'change'], professions: ['locksmith'], urgency: 'normal' },
  { id: 'safe_locked', descriptionHe: 'כספת נעולה', descriptionEn: 'Locked safe', keywords: ['כספת', 'נעולה', 'safe', 'locked'], professions: ['locksmith'], urgency: 'normal' },
  { id: 'door_handle_broken', descriptionHe: 'ידית דלת שבורה', descriptionEn: 'Broken door handle', keywords: ['ידית', 'דלת', 'שבורה', 'door', 'handle'], professions: ['locksmith', 'carpenter'], urgency: 'normal' },
  { id: 'mailbox_lock', descriptionHe: 'מנעול תיבת דואר', descriptionEn: 'Mailbox lock', keywords: ['מנעול', 'תיבת דואר', 'mailbox', 'lock'], professions: ['locksmith'], urgency: 'flexible' },
  { id: 'car_key_locksmith', descriptionHe: 'מפתח לרכב', descriptionEn: 'Car key locksmith', keywords: ['מפתח', 'רכב', 'car', 'key'], professions: ['locksmith'], urgency: 'urgent' },
  { id: 'smart_lock_install', descriptionHe: 'התקנת מנעול חכם', descriptionEn: 'Smart lock install', keywords: ['מנעול', 'חכם', 'smart', 'lock', 'install'], professions: ['locksmith', 'electrician'], urgency: 'flexible' },
];

const OUTDOORS_PROBLEMS: Problem[] = [
  { id: 'tree_fallen', descriptionHe: 'עץ נפל', descriptionEn: 'Fallen tree', keywords: ['עץ', 'נפל', 'tree', 'fallen'], professions: ['gardener'], urgency: 'urgent' },
  { id: 'tree_trimming', descriptionHe: 'גיזום עצים', descriptionEn: 'Tree trimming', keywords: ['גיזום', 'עצים', 'tree', 'trimming'], professions: ['gardener'], urgency: 'flexible' },
  { id: 'lawn_care', descriptionHe: 'טיפול במדשאה', descriptionEn: 'Lawn care', keywords: ['מדשאה', 'טיפול', 'lawn', 'care'], professions: ['gardener'], urgency: 'flexible' },
  { id: 'garden_maintenance', descriptionHe: 'תחזוקת גינה', descriptionEn: 'Garden maintenance', keywords: ['גינה', 'תחזוקה', 'garden', 'maintenance'], professions: ['gardener'], urgency: 'flexible' },
  { id: 'irrigation_install', descriptionHe: 'התקנת מערכת השקיה', descriptionEn: 'Irrigation install', keywords: ['השקיה', 'מערכת', 'התקנה', 'irrigation', 'install'], professions: ['gardener', 'plumber'], urgency: 'flexible' },
  { id: 'fence_broken', descriptionHe: 'גדר שבורה', descriptionEn: 'Broken fence', keywords: ['גדר', 'שבורה', 'fence', 'broken'], professions: ['metalworker', 'handyman'], urgency: 'normal' },
  { id: 'gate_broken', descriptionHe: 'שער לא נסגר', descriptionEn: 'Broken gate', keywords: ['שער', 'שבור', 'gate', 'broken'], professions: ['metalworker', 'locksmith'], urgency: 'normal' },
  { id: 'deck_repair', descriptionHe: 'תיקון דק עץ', descriptionEn: 'Deck repair', keywords: ['דק', 'עץ', 'תיקון', 'deck', 'repair'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'outdoor_faucet_install', descriptionHe: 'התקנת ברז חיצוני', descriptionEn: 'Outdoor faucet install', keywords: ['ברז', 'חיצוני', 'התקנה', 'outdoor', 'faucet'], professions: ['plumber'], urgency: 'flexible' },
  { id: 'pergola_install', descriptionHe: 'התקנת פרגולה', descriptionEn: 'Pergola install', keywords: ['פרגולה', 'התקנה', 'pergola', 'install'], professions: ['carpenter'], urgency: 'flexible' },
  { id: 'pest_in_garden', descriptionHe: 'מזיקים בגינה', descriptionEn: 'Garden pests', keywords: ['מזיקים', 'גינה', 'pests', 'garden'], professions: ['exterminator'], urgency: 'normal' },
  { id: 'pool_pump_issue', descriptionHe: 'בעיה במשאבת בריכה', descriptionEn: 'Pool pump issue', keywords: ['משאבה', 'בריכה', 'pool', 'pump'], professions: ['plumber', 'electrician'], urgency: 'normal' },
  { id: 'paving_repair', descriptionHe: 'תיקון ריצוף חוץ', descriptionEn: 'Outdoor paving repair', keywords: ['ריצוף', 'חוץ', 'paving', 'outdoor', 'repair'], professions: ['tiler', 'handyman'], urgency: 'flexible' },
  { id: 'roof_leak', descriptionHe: 'נזילה מהגג', descriptionEn: 'Roof leak', keywords: ['נזילה', 'גג', 'roof', 'leak'], professions: ['roofer', 'waterproofing_specialist'], urgency: 'urgent' },
];

const GENERAL_PROBLEMS: Problem[] = [
  // Glass
  { id: 'window_glass_broken', descriptionHe: 'זכוכית חלון שבורה', descriptionEn: 'Broken window glass', keywords: ['זכוכית', 'חלון', 'שבורה', 'window', 'glass'], professions: ['glazier'], urgency: 'urgent' },
  { id: 'mirror_broken', descriptionHe: 'מראה שבורה', descriptionEn: 'Broken mirror', keywords: ['מראה', 'שבורה', 'mirror', 'broken'], professions: ['glazier'], urgency: 'flexible' },
  { id: 'glass_door_cracked', descriptionHe: 'דלת זכוכית סדוקה', descriptionEn: 'Cracked glass door', keywords: ['דלת', 'זכוכית', 'סדוקה', 'glass', 'door'], professions: ['glazier'], urgency: 'normal' },
  { id: 'shower_glass_broken', descriptionHe: 'מקלחון זכוכית שבור', descriptionEn: 'Broken shower glass', keywords: ['מקלחון', 'זכוכית', 'שבור', 'shower', 'glass'], professions: ['glazier'], urgency: 'normal' },
  // Fabric
  { id: 'dress_repair', descriptionHe: 'תיקון שמלה', descriptionEn: 'Dress repair', keywords: ['שמלה', 'תיקון', 'dress', 'repair'], professions: ['seamstress'], urgency: 'flexible' },
  { id: 'pants_hem', descriptionHe: 'קיצור / הארכת מכנסיים', descriptionEn: 'Pants hemming', keywords: ['מכנסיים', 'קיצור', 'pants', 'hem'], professions: ['seamstress'], urgency: 'flexible' },
  { id: 'zipper_broken', descriptionHe: 'רוכסן שבור', descriptionEn: 'Broken zipper', keywords: ['רוכסן', 'שבור', 'zipper', 'broken'], professions: ['seamstress'], urgency: 'flexible' },
  { id: 'curtain_alteration', descriptionHe: 'תיקון / התאמת וילון', descriptionEn: 'Curtain alteration', keywords: ['וילון', 'תיקון', 'curtain', 'alteration'], professions: ['seamstress'], urgency: 'flexible' },
  { id: 'clothing_tear', descriptionHe: 'בגד קרוע', descriptionEn: 'Torn clothing', keywords: ['בגד', 'קרוע', 'clothing', 'tear'], professions: ['seamstress'], urgency: 'flexible' },
  { id: 'suit_alteration', descriptionHe: 'תיקוני חליפה', descriptionEn: 'Suit alteration', keywords: ['חליפה', 'תיקון', 'suit', 'alteration'], professions: ['seamstress'], urgency: 'flexible' },
  // Moving
  { id: 'moving_apartment', descriptionHe: 'הובלת דירה', descriptionEn: 'Apartment moving', keywords: ['הובלה', 'דירה', 'moving', 'apartment'], professions: ['moving_company'], urgency: 'flexible' },
  { id: 'moving_furniture', descriptionHe: 'הובלת רהיט בודד', descriptionEn: 'Single furniture moving', keywords: ['הובלה', 'רהיט', 'furniture', 'moving'], professions: ['moving_company'], urgency: 'flexible' },
  { id: 'moving_office', descriptionHe: 'הובלת משרד', descriptionEn: 'Office moving', keywords: ['הובלה', 'משרד', 'office', 'moving'], professions: ['moving_company'], urgency: 'flexible' },
  // Handyman general
  { id: 'shelf_mount', descriptionHe: 'תליית מדף', descriptionEn: 'Shelf mounting', keywords: ['תליה', 'מדף', 'shelf', 'mount'], professions: ['handyman'], urgency: 'flexible' },
  { id: 'picture_hanging', descriptionHe: 'תליית תמונות', descriptionEn: 'Picture hanging', keywords: ['תליה', 'תמונות', 'picture', 'hanging'], professions: ['handyman'], urgency: 'flexible' },
  { id: 'furniture_assembly_ikea', descriptionHe: 'הרכבת ארון איקאה', descriptionEn: 'IKEA furniture assembly', keywords: ['הרכבה', 'איקאה', 'IKEA', 'furniture', 'assembly'], professions: ['handyman'], urgency: 'flexible' },
  { id: 'baby_proofing', descriptionHe: 'התקנת בטיחות לתינוקות', descriptionEn: 'Baby proofing', keywords: ['בטיחות', 'תינוקות', 'baby', 'proofing'], professions: ['handyman'], urgency: 'flexible' },
  { id: 'smoke_detector_install', descriptionHe: 'התקנת גלאי עשן', descriptionEn: 'Smoke detector install', keywords: ['גלאי', 'עשן', 'smoke', 'detector', 'install'], professions: ['handyman', 'electrician'], urgency: 'normal' },
  // Gas
  { id: 'gas_leak', descriptionHe: 'דליפת גז', descriptionEn: 'Gas leak', keywords: ['דליפה', 'גז', 'gas', 'leak'], professions: ['gas_technician'], urgency: 'urgent' },
  { id: 'gas_heater_issue', descriptionHe: 'בעיה בתנור גז', descriptionEn: 'Gas heater issue', keywords: ['תנור', 'גז', 'gas', 'heater'], professions: ['gas_technician'], urgency: 'normal' },
  { id: 'gas_line_install', descriptionHe: 'התקנת קו גז', descriptionEn: 'Gas line install', keywords: ['קו', 'גז', 'gas', 'line', 'install'], professions: ['gas_technician'], urgency: 'flexible' },
  // Pest control
  { id: 'cockroaches', descriptionHe: "ג'וקים בבית", descriptionEn: 'Cockroaches', keywords: ["ג'וקים", 'בית', 'cockroaches', 'pest'], professions: ['exterminator'], urgency: 'normal' },
  { id: 'ants_infestation', descriptionHe: 'נמלים בבית', descriptionEn: 'Ants infestation', keywords: ['נמלים', 'בית', 'ants', 'infestation'], professions: ['exterminator'], urgency: 'normal' },
  { id: 'mice_rats', descriptionHe: 'עכברים / חולדות', descriptionEn: 'Mice/rats', keywords: ['עכברים', 'חולדות', 'mice', 'rats'], professions: ['exterminator'], urgency: 'urgent' },
  { id: 'termites', descriptionHe: 'טרמיטים', descriptionEn: 'Termites', keywords: ['טרמיטים', 'עץ', 'termites', 'wood'], professions: ['exterminator'], urgency: 'urgent' },
  { id: 'bed_bugs', descriptionHe: 'פשפשי מיטה', descriptionEn: 'Bed bugs', keywords: ['פשפשים', 'מיטה', 'bed', 'bugs'], professions: ['exterminator'], urgency: 'urgent' },
  { id: 'mosquito_treatment', descriptionHe: 'טיפול ביתושים בחצר', descriptionEn: 'Mosquito treatment', keywords: ['יתושים', 'חצר', 'mosquito', 'treatment'], professions: ['exterminator'], urgency: 'flexible' },
  // Shutters
  { id: 'shutter_stuck', descriptionHe: 'תריס תקוע', descriptionEn: 'Stuck shutter', keywords: ['תריס', 'תקוע', 'shutter', 'stuck'], professions: ['shutter_technician'], urgency: 'normal' },
  { id: 'shutter_motor_broken', descriptionHe: 'מנוע תריס שבור', descriptionEn: 'Broken shutter motor', keywords: ['מנוע', 'תריס', 'שבור', 'shutter', 'motor'], professions: ['shutter_technician'], urgency: 'normal' },
  { id: 'shutter_belt_broken', descriptionHe: 'רצועת תריס קרועה', descriptionEn: 'Broken shutter belt', keywords: ['רצועה', 'תריס', 'קרועה', 'shutter', 'belt'], professions: ['shutter_technician'], urgency: 'normal' },
  { id: 'shutter_install', descriptionHe: 'התקנת תריס חשמלי', descriptionEn: 'Electric shutter install', keywords: ['תריס', 'חשמלי', 'התקנה', 'shutter', 'install'], professions: ['shutter_technician'], urgency: 'flexible' },
  // Waterproofing
  { id: 'roof_waterproofing', descriptionHe: 'איטום גג', descriptionEn: 'Roof waterproofing', keywords: ['איטום', 'גג', 'roof', 'waterproofing'], professions: ['waterproofing_specialist', 'roofer'], urgency: 'flexible' },
  { id: 'basement_waterproofing', descriptionHe: 'איטום מרתף', descriptionEn: 'Basement waterproofing', keywords: ['איטום', 'מרתף', 'basement', 'waterproofing'], professions: ['waterproofing_specialist'], urgency: 'normal' },
  { id: 'wall_waterproofing', descriptionHe: 'איטום קירות חיצוניים', descriptionEn: 'Exterior wall waterproofing', keywords: ['איטום', 'קירות', 'חיצוניים', 'wall', 'waterproofing'], professions: ['waterproofing_specialist'], urgency: 'normal' },
  // Metalwork
  { id: 'railing_broken', descriptionHe: 'מעקה שבור / רופף', descriptionEn: 'Broken railing', keywords: ['מעקה', 'שבור', 'רופף', 'railing', 'broken'], professions: ['metalworker'], urgency: 'urgent' },
  { id: 'railing_install', descriptionHe: 'התקנת מעקה', descriptionEn: 'Railing install', keywords: ['מעקה', 'התקנה', 'railing', 'install'], professions: ['metalworker'], urgency: 'flexible' },
  { id: 'window_bars_install', descriptionHe: 'התקנת סורגים לחלונות', descriptionEn: 'Window bars install', keywords: ['סורגים', 'חלונות', 'window', 'bars', 'install'], professions: ['metalworker'], urgency: 'flexible' },
  { id: 'window_bars_broken', descriptionHe: 'סורג חלון שבור', descriptionEn: 'Broken window bars', keywords: ['סורג', 'חלון', 'שבור', 'window', 'bars'], professions: ['metalworker'], urgency: 'normal' },
  { id: 'metal_gate_repair', descriptionHe: 'תיקון שער מתכת', descriptionEn: 'Metal gate repair', keywords: ['שער', 'מתכת', 'תיקון', 'metal', 'gate'], professions: ['metalworker'], urgency: 'normal' },
  { id: 'metal_gate_install', descriptionHe: 'התקנת שער מתכת', descriptionEn: 'Metal gate install', keywords: ['שער', 'מתכת', 'התקנה', 'metal', 'gate'], professions: ['metalworker'], urgency: 'flexible' },
  { id: 'welding_repair', descriptionHe: 'תיקון ריתוך', descriptionEn: 'Welding repair', keywords: ['ריתוך', 'תיקון', 'welding', 'repair'], professions: ['metalworker'], urgency: 'flexible' },
  // Solar water heater
  { id: 'solar_heater_not_heating', descriptionHe: 'דוד שמש לא מחמם', descriptionEn: 'Solar heater not heating', keywords: ['דוד', 'שמש', 'מחמם', 'solar', 'heater'], professions: ['solar_water_heater_tech'], urgency: 'normal' },
  { id: 'solar_heater_leaking', descriptionHe: 'דוד שמש דולף', descriptionEn: 'Solar heater leaking', keywords: ['דוד', 'שמש', 'דולף', 'solar', 'leaking'], professions: ['solar_water_heater_tech', 'plumber'], urgency: 'urgent' },
  { id: 'solar_panel_damaged', descriptionHe: 'קולט שמש פגום', descriptionEn: 'Damaged solar panel', keywords: ['קולט', 'שמש', 'פגום', 'solar', 'panel'], professions: ['solar_water_heater_tech'], urgency: 'normal' },
  { id: 'solar_heater_install', descriptionHe: 'התקנת דוד שמש חדש', descriptionEn: 'Solar heater install', keywords: ['דוד', 'שמש', 'התקנה', 'solar', 'install'], professions: ['solar_water_heater_tech'], urgency: 'flexible' },
  { id: 'electric_backup_heater', descriptionHe: 'בעיה בגוף חימום חשמלי של דוד', descriptionEn: 'Electric backup heater issue', keywords: ['גוף חימום', 'חשמלי', 'דוד', 'electric', 'backup'], professions: ['solar_water_heater_tech', 'electrician'], urgency: 'normal' },
  // Renovation
  { id: 'bathroom_renovation', descriptionHe: 'שיפוץ חדר רחצה', descriptionEn: 'Bathroom renovation', keywords: ['שיפוץ', 'חדר רחצה', 'bathroom', 'renovation'], professions: ['renovator'], urgency: 'flexible' },
  { id: 'kitchen_renovation', descriptionHe: 'שיפוץ מטבח', descriptionEn: 'Kitchen renovation', keywords: ['שיפוץ', 'מטבח', 'kitchen', 'renovation'], professions: ['renovator'], urgency: 'flexible' },
  { id: 'apartment_renovation', descriptionHe: 'שיפוץ דירה', descriptionEn: 'Apartment renovation', keywords: ['שיפוץ', 'דירה', 'apartment', 'renovation'], professions: ['renovator'], urgency: 'flexible' },
  { id: 'room_addition', descriptionHe: 'תוספת חדר / הרחבה', descriptionEn: 'Room addition', keywords: ['תוספת', 'חדר', 'הרחבה', 'room', 'addition'], professions: ['renovator'], urgency: 'flexible' },
  { id: 'demolition_work', descriptionHe: 'עבודות הריסה / פירוק', descriptionEn: 'Demolition work', keywords: ['הריסה', 'פירוק', 'demolition', 'work'], professions: ['renovator'], urgency: 'flexible' },
  // Doors
  { id: 'interior_door_install', descriptionHe: 'התקנת דלת פנימית', descriptionEn: 'Interior door install', keywords: ['דלת', 'פנימית', 'התקנה', 'interior', 'door'], professions: ['door_installer'], urgency: 'flexible' },
  { id: 'security_door_install', descriptionHe: 'התקנת דלת כניסה ביטחונית', descriptionEn: 'Security door install', keywords: ['דלת', 'ביטחונית', 'כניסה', 'security', 'door'], professions: ['door_installer', 'locksmith'], urgency: 'flexible' },
  { id: 'sliding_door_repair', descriptionHe: 'תיקון דלת הזזה', descriptionEn: 'Sliding door repair', keywords: ['דלת', 'הזזה', 'תיקון', 'sliding', 'door'], professions: ['door_installer'], urgency: 'normal' },
  { id: 'door_frame_damaged', descriptionHe: 'משקוף פגום', descriptionEn: 'Damaged door frame', keywords: ['משקוף', 'פגום', 'door', 'frame'], professions: ['door_installer', 'carpenter'], urgency: 'normal' },
  { id: 'screen_door_install', descriptionHe: 'התקנת דלת רשת', descriptionEn: 'Screen door install', keywords: ['דלת', 'רשת', 'התקנה', 'screen', 'door'], professions: ['door_installer'], urgency: 'flexible' },
  // Security cameras
  { id: 'security_camera_install', descriptionHe: 'התקנת מצלמות אבטחה', descriptionEn: 'Security camera install', keywords: ['מצלמות', 'אבטחה', 'התקנה', 'security', 'camera'], professions: ['security_camera_installer'], urgency: 'flexible' },
  { id: 'security_camera_broken', descriptionHe: 'מצלמת אבטחה לא עובדת', descriptionEn: 'Broken security camera', keywords: ['מצלמה', 'אבטחה', 'שבורה', 'security', 'camera'], professions: ['security_camera_installer'], urgency: 'normal' },
  { id: 'dvr_nvr_issue', descriptionHe: 'בעיה ברשם מצלמות', descriptionEn: 'DVR/NVR issue', keywords: ['רשם', 'מצלמות', 'DVR', 'NVR'], professions: ['security_camera_installer'], urgency: 'normal' },
  { id: 'alarm_system_install', descriptionHe: 'התקנת מערכת אזעקה', descriptionEn: 'Alarm system install', keywords: ['אזעקה', 'מערכת', 'התקנה', 'alarm', 'install'], professions: ['security_camera_installer', 'electrician'], urgency: 'flexible' },
  { id: 'video_intercom_install', descriptionHe: 'התקנת אינטרקום וידאו', descriptionEn: 'Video intercom install', keywords: ['אינטרקום', 'וידאו', 'התקנה', 'intercom', 'video'], professions: ['security_camera_installer', 'electrician'], urgency: 'flexible' },
];

export const PROBLEM_MATRIX: DomainCategory[] = [
  { id: 'water', labelHe: 'אינסטלציה ומים', labelEn: 'Plumbing & Water', problems: WATER_PROBLEMS },
  { id: 'electrical', labelHe: 'חשמל', labelEn: 'Electrical', problems: ELECTRICAL_PROBLEMS },
  { id: 'hvac', labelHe: 'מיזוג אוויר', labelEn: 'HVAC', problems: HVAC_PROBLEMS },
  { id: 'appliances', labelHe: 'מוצרי חשמל', labelEn: 'Appliances', problems: APPLIANCE_PROBLEMS },
  { id: 'furniture', labelHe: 'רהיטים ונגרות', labelEn: 'Furniture & Carpentry', problems: FURNITURE_PROBLEMS },
  { id: 'renovation', labelHe: 'שיפוצים וצבע', labelEn: 'Renovation & Paint', problems: RENOVATION_PROBLEMS },
  { id: 'tech', labelHe: 'מחשבים וסלולר', labelEn: 'Computers & Mobile', problems: TECH_PROBLEMS },
  { id: 'locks', labelHe: 'מנעולנות', labelEn: 'Locks', problems: LOCKS_PROBLEMS },
  { id: 'outdoors', labelHe: 'גינון וחצר', labelEn: 'Garden & Outdoors', problems: OUTDOORS_PROBLEMS },
  { id: 'general', labelHe: 'בד, זכוכית, מתכת ושונות', labelEn: 'Fabric, Glass, Metal & General', problems: GENERAL_PROBLEMS },
];
