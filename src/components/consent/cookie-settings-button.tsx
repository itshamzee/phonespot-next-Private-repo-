"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.Cookiebot) {
          window.Cookiebot.renew();
        }
      }}
      className="text-sm text-white/60 transition-colors hover:text-white"
    >
      Administrer cookies
    </button>
  );
}
