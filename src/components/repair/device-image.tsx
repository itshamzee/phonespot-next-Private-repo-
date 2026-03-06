/**
 * Device silhouette placeholder images for repair pages.
 * These render colored SVG device outlines based on device type.
 * Replace with real product images by setting image_url in admin.
 */

import type { DeviceType } from "@/lib/supabase/types";

const BRAND_COLORS: Record<string, { primary: string; secondary: string }> = {
  iphone: { primary: "#1d1d1f", secondary: "#86868b" },
  samsung: { primary: "#1428a0", secondary: "#6c8cbf" },
  "google-pixel": { primary: "#ea4335", secondary: "#fbbc05" },
  oneplus: { primary: "#f5010c", secondary: "#1a1a1a" },
  huawei: { primary: "#cf0a2c", secondary: "#1a1a1a" },
  sony: { primary: "#000000", secondary: "#00439c" },
  xiaomi: { primary: "#ff6900", secondary: "#1a1a1a" },
  motorola: { primary: "#5c2d91", secondary: "#1a1a1a" },
  ipad: { primary: "#1d1d1f", secondary: "#86868b" },
  macbook: { primary: "#1d1d1f", secondary: "#a1a1a6" },
  "apple-watch": { primary: "#1d1d1f", secondary: "#e3c8a0" },
  playstation: { primary: "#003791", secondary: "#00246a" },
  nintendo: { primary: "#e60012", secondary: "#484848" },
};

function PhoneSilhouette({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 120 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect x="15" y="8" width="90" height="184" rx="18" fill={primary} />
      <rect x="19" y="16" width="82" height="158" rx="4" fill={secondary} opacity="0.15" />
      <rect x="19" y="16" width="82" height="158" rx="4" fill="white" opacity="0.85" />
      <circle cx="60" cy="186" r="4" fill={secondary} opacity="0.3" />
      <rect x="45" y="11" width="30" height="4" rx="2" fill={secondary} opacity="0.2" />
      {/* Screen content hint */}
      <rect x="28" y="32" width="64" height="8" rx="2" fill={primary} opacity="0.08" />
      <rect x="28" y="46" width="48" height="6" rx="2" fill={primary} opacity="0.05" />
      <rect x="28" y="64" width="64" height="44" rx="6" fill={primary} opacity="0.04" />
      <rect x="28" y="118" width="30" height="6" rx="2" fill={primary} opacity="0.06" />
      <rect x="28" y="130" width="52" height="6" rx="2" fill={primary} opacity="0.04" />
    </svg>
  );
}

function TabletSilhouette({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 180 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect x="10" y="8" width="160" height="184" rx="16" fill={primary} />
      <rect x="16" y="16" width="148" height="168" rx="4" fill="white" opacity="0.9" />
      <circle cx="90" cy="10" r="2" fill={secondary} opacity="0.3" />
      <rect x="30" y="32" width="120" height="8" rx="2" fill={primary} opacity="0.07" />
      <rect x="30" y="48" width="80" height="6" rx="2" fill={primary} opacity="0.04" />
      <rect x="30" y="66" width="120" height="60" rx="6" fill={primary} opacity="0.03" />
    </svg>
  );
}

function LaptopSilhouette({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect x="25" y="10" width="170" height="110" rx="8" fill={primary} />
      <rect x="31" y="16" width="158" height="96" rx="2" fill="white" opacity="0.9" />
      <path d="M10 124 H210 L220 140 Q220 148 212 148 H8 Q0 148 0 140 Z" fill={primary} opacity="0.85" />
      <rect x="85" y="128" width="50" height="8" rx="4" fill={secondary} opacity="0.15" />
    </svg>
  );
}

function WatchSilhouette({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 120 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect x="38" y="4" width="44" height="30" rx="6" fill={secondary} opacity="0.3" />
      <rect x="38" y="166" width="44" height="30" rx="6" fill={secondary} opacity="0.3" />
      <rect x="20" y="34" width="80" height="132" rx="24" fill={primary} />
      <rect x="26" y="44" width="68" height="112" rx="18" fill="white" opacity="0.9" />
      <circle cx="60" cy="100" r="24" fill={primary} opacity="0.06" />
      <line x1="60" y1="80" x2="60" y2="100" stroke={primary} strokeWidth="2" opacity="0.2" />
      <line x1="60" y1="100" x2="72" y2="108" stroke={primary} strokeWidth="2" opacity="0.15" />
    </svg>
  );
}

function ConsoleSilhouette({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path d="M30 20 Q30 10 40 10 H180 Q190 10 190 20 V100 Q190 130 160 130 H60 Q30 130 30 100 Z" fill={primary} />
      <circle cx="70" cy="65" r="18" fill="white" opacity="0.1" />
      <circle cx="150" cy="65" r="18" fill="white" opacity="0.1" />
      <rect x="95" y="52" width="30" height="8" rx="4" fill={secondary} opacity="0.2" />
      <rect x="95" y="68" width="30" height="8" rx="4" fill={secondary} opacity="0.2" />
      {/* Dpad */}
      <rect x="64" y="55" width="12" height="4" rx="1" fill="white" opacity="0.15" />
      <rect x="68" y="51" width="4" height="12" rx="1" fill="white" opacity="0.15" />
      {/* Buttons */}
      <circle cx="145" cy="58" r="3" fill="white" opacity="0.15" />
      <circle cx="155" cy="65" r="3" fill="white" opacity="0.15" />
      <circle cx="145" cy="72" r="3" fill="white" opacity="0.15" />
      <circle cx="135" cy="65" r="3" fill="white" opacity="0.15" />
    </svg>
  );
}

type DeviceImageProps = {
  brandSlug: string;
  deviceType: DeviceType;
  imageUrl?: string | null;
  modelName: string;
  className?: string;
};

export function DeviceImage({
  brandSlug,
  deviceType,
  imageUrl,
  modelName,
  className = "",
}: DeviceImageProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={modelName}
        className={`object-contain ${className}`}
        loading="lazy"
      />
    );
  }

  const colors = BRAND_COLORS[brandSlug] ?? { primary: "#3A3D38", secondary: "#8A8880" };

  const Silhouette = {
    smartphone: PhoneSilhouette,
    tablet: TabletSilhouette,
    laptop: LaptopSilhouette,
    watch: WatchSilhouette,
    console: ConsoleSilhouette,
  }[deviceType];

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Silhouette primary={colors.primary} secondary={colors.secondary} />
    </div>
  );
}
