import { Stack } from 'expo-router';

/**
 * Public provider routes — accessed by service providers via WhatsApp links.
 *
 * No auth, no app-promo modals, no tabs. The routes here host short
 * single-purpose forms (submit a quote, report a problem with the request)
 * that providers fill in once and never visit again.
 */
export default function ProviderLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
