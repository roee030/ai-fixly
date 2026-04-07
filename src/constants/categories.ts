export interface ServiceCategory {
  id: string;
  labelHe: string;
  labelEn: string;
  icon: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'plumbing', labelHe: 'אינסטלציה', labelEn: 'Plumbing', icon: 'water' },
  { id: 'electrical', labelHe: 'חשמל', labelEn: 'Electrical', icon: 'flash' },
  { id: 'hvac', labelHe: 'מיזוג אוויר', labelEn: 'HVAC', icon: 'thermometer' },
  { id: 'locksmith', labelHe: 'מנעולן', labelEn: 'Locksmith', icon: 'key' },
  { id: 'appliances', labelHe: 'מכשירי חשמל', labelEn: 'Appliances', icon: 'hardware-chip' },
  { id: 'computers', labelHe: 'מחשבים', labelEn: 'Computers & IT', icon: 'laptop' },
  { id: 'painting', labelHe: 'צביעה', labelEn: 'Painting', icon: 'color-palette' },
  { id: 'cleaning', labelHe: 'ניקיון', labelEn: 'Cleaning', icon: 'sparkles' },
  { id: 'moving', labelHe: 'הובלות', labelEn: 'Moving', icon: 'cube' },
  { id: 'general', labelHe: 'כללי', labelEn: 'General', icon: 'build' },
];
