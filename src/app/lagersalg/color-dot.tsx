/** Farveprik til farvenavne fra hurtig tilbehørsoptagelsen. Ukendte farver får en neutral prik. */
const SWATCHES: Record<string, string> = {
  sort: "#1C1C1E",
  hvid: "#FFFFFF",
  grå: "#8E8E93",
  sølv: "#C7C7CC",
  rød: "#C8102E",
  rødbrun: "#7B3B2A",
  brun: "#7A5230",
  beige: "#D8C3A5",
  rosa: "#F2B8C6",
  lyserød: "#F4A7B9",
  pink: "#E75480",
  lilla: "#7D5BA6",
  blå: "#2B59C3",
  mørkeblå: "#1F2F5C",
  lyseblå: "#9CC3E6",
  grøn: "#2F6B3F",
  mørkegrøn: "#1F3D2B",
  gul: "#F2C94C",
  orange: "#E8772E",
  guld: "#C9A55C",
};

export function swatchFor(color: string): string | null {
  return SWATCHES[color.toLowerCase()] ?? null;
}

export function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  const fill = swatchFor(color);
  const clear = color.toLowerCase().startsWith("gennemsigtig");
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full border border-black/15"
      style={{
        width: size,
        height: size,
        background: clear
          ? "repeating-linear-gradient(45deg,#fff 0 2px,#e5e5ea 2px 4px)"
          : (fill ?? "#D1D1D6"),
      }}
    />
  );
}
