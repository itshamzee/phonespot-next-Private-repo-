"use client";

/** Map color names (Danish/English) to hex swatches */
const COLOR_SWATCHES: Record<string, string> = {
  // Apple Watch / common
  midnight: "#1d1d1f",
  midnat: "#1d1d1f",
  starlight: "#f5e6d3",
  stjerneskær: "#f5e6d3",
  silver: "#e3e3e3",
  sølv: "#e3e3e3",
  gold: "#d4a574",
  guld: "#d4a574",
  "space gray": "#535150",
  "space grey": "#535150",
  "space black": "#2e2c2b",
  graphite: "#4a4845",
  grafit: "#4a4845",
  natural: "#e0cbb1",
  naturel: "#e0cbb1",
  // Common phone / device colors
  red: "#bf0013",
  rød: "#bf0013",
  "(product) red": "#bf0013",
  "(product)red": "#bf0013",
  blue: "#3b6ea5",
  blå: "#3b6ea5",
  green: "#4a6741",
  grøn: "#4a6741",
  pink: "#f4c2c2",
  rosa: "#f4c2c2",
  purple: "#8b6fa5",
  lilla: "#8b6fa5",
  black: "#1d1d1f",
  sort: "#1d1d1f",
  white: "#f5f5f0",
  hvid: "#f5f5f0",
  cream: "#f5e6d3",
  creme: "#f5e6d3",
  orange: "#e86b30",
  yellow: "#f7d046",
  gul: "#f7d046",
  "desert titanium": "#a8906c",
  "natural titanium": "#b5b0a8",
  "blue titanium": "#3d4f5f",
  "black titanium": "#2e2c2b",
  "white titanium": "#e8e5e0",
  // Extra Shopify variants
  "graphite sort": "#4a4845",
  "sierra blue": "#a7c1d9",
  "alpine green": "#3b4a3f",
  "deep purple": "#4a3260",
  coral: "#f88379",
  lavender: "#b4a7d6",
};

function getSwatchColor(colorName: string): string {
  const key = colorName.toLowerCase().trim();
  return COLOR_SWATCHES[key] ?? "#9ca3af"; // fallback gray
}

type ColorSelectorProps = {
  colors: string[];
  selectedColor: string;
  onSelect?: (color: string) => void;
};

export function ColorSelector({ colors, selectedColor, onSelect }: ColorSelectorProps) {
  if (colors.length <= 1) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-charcoal">
        Farve{" "}
        <span className="font-normal text-charcoal/50">— {selectedColor}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const isSelected = color === selectedColor;
          const hex = getSwatchColor(color);

          return (
            <button
              key={color}
              type="button"
              onClick={() => onSelect?.(color)}
              title={color}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                isSelected
                  ? "border-green-eco ring-2 ring-green-eco/20"
                  : "border-sand hover:border-charcoal/30"
              }`}
            >
              <span
                className="h-6 w-6 rounded-full border border-black/10"
                style={{ backgroundColor: hex }}
              />
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill={isLightColor(hex) ? "#1d1d1f" : "#fff"}
                    className="h-3 w-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Check if a hex color is light (to pick contrasting checkmark) */
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
