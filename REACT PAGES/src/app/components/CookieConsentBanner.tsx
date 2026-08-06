import { useEffect, useState } from 'react';

const CONSENT_KEY = 'reelette_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-xl rounded-xl border border-[rgba(255,87,34,0.25)] bg-[rgba(15,15,15,0.95)] backdrop-blur-md shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-gray-300 flex-1">
          We use essential cookies to keep you signed in and remember your preferences. See our{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#fbbf24] hover:text-[#ff5722] transition-colors">
            Privacy Policy
          </a>{' '}
          for details.
        </p>
        <button
          onClick={accept}
          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-[#ff5722] to-[#dc2626] hover:from-[#ff6d3a] hover:to-[#ef4444] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all duration-200"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
