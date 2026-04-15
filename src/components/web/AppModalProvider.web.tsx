import { useState, useEffect } from 'react';
import { usePathname } from 'expo-router';
import { AppDownloadModal } from './AppDownloadModal.web';
import { AppBanner } from './AppBanner.web';

const COOKIE_NAME = 'aifixly_app_dismissed';

// Routes intended for service providers (not customers). Showing them an
// "install our app" prompt is wrong — they are using a one-off link from
// WhatsApp to submit a quote and have no use for the customer app.
const SUPPRESS_ON_PATHS = ['/provider/'];

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; max-age=${days * 86400}; path=/; SameSite=Lax`;
}

export function AppModalProvider() {
  const pathname = usePathname();
  // `mounted` stays false during SSR and the first client render so the
  // server and client trees match exactly (no hydration mismatch). We
  // only flip modal/banner on after mount, in a layout effect.
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const isSuppressed = SUPPRESS_ON_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    setMounted(true);
    if (isSuppressed) {
      setShowModal(false);
      setShowBanner(false);
      return;
    }
    const dismissed = getCookie(COOKIE_NAME);
    if (dismissed) {
      setShowBanner(true);
    } else {
      setShowModal(true);
    }
  }, [isSuppressed]);

  // Render nothing during SSR and the first client render — this matches
  // whatever the (empty) server tree looks like, so hydration succeeds.
  if (!mounted) return null;
  if (isSuppressed) return null;

  const handleModalDismiss = () => {
    setCookie(COOKIE_NAME, '1', 7);
    setShowModal(false);
    setShowBanner(true);
  };

  const handleBannerDismiss = () => {
    setBannerDismissed(true);
  };

  return (
    <>
      <AppDownloadModal visible={showModal} onDismiss={handleModalDismiss} />
      {showBanner && !bannerDismissed && !showModal && (
        <AppBanner onDismiss={handleBannerDismiss} />
      )}
    </>
  );
}
