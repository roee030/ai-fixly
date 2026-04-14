import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['he', 'ar'];

/**
 * Returns RTL-aware style helpers based on the current language.
 *
 * Usage:
 *   const { isRTL, textAlign, flexDirection } = useDirection();
 *   <Text style={{ textAlign }}>...</Text>
 *   <View style={{ flexDirection }}>...</View>
 */
export function useDirection() {
  const { i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  return {
    isRTL,
    direction: isRTL ? ('rtl' as const) : ('ltr' as const),
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const),
    writingDirection: isRTL ? ('rtl' as const) : ('ltr' as const),
  };
}
