"use client";

import { useState } from "react";

interface QualityBadgeProps {
  name: string;
  badgeColor: string;
  badgeTextColor?: string;
  description?: string;
  size?: "sm" | "md";
}

export function QualityBadge({
  name,
  badgeColor,
  badgeTextColor = "#FFFFFF",
  description,
  size = "sm",
}: QualityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const badge = (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      } ${description ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: badgeColor, color: badgeTextColor }}
      onClick={description ? () => setShowTooltip(!showTooltip) : undefined}
      title={description && !showTooltip ? "Klik for info" : undefined}
    >
      {name}
    </span>
  );

  if (!description) return badge;

  return (
    <div className="relative inline-block">
      {badge}
      {showTooltip && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[#E5E5EA] bg-white p-4 shadow-lg">
          <p className="text-sm leading-relaxed text-[#111111]/70">{description}</p>
          <button
            onClick={() => setShowTooltip(false)}
            className="mt-2 text-xs font-medium text-[#86868B] hover:text-[#111111]"
          >
            Luk
          </button>
        </div>
      )}
    </div>
  );
}
