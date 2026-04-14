import { useState, useEffect } from 'react';
import { AppDownloadModal } from './AppDownloadModal.web';
import { AppBanner } from './AppBanner.web';

const COOKIE_NAME = 'aifixly_app_dismissed';

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
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const dismissed = getCookie(COOKIE_NAME);
    if (dismissed) {
      setShowBanner(true);
    } else {
      setShowModal(true);
    }
  }, []);

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
