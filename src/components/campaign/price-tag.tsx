/**
 * Black November-prismærket: det grønne skilt (PhoneSpot-grøn #5A8C6F), brugt ens på
 * forsiden, kategoribåndene, tilbehørskort og /black-november. Et rigtigt
 * hængeskilt med hul: flad farve, ingen skygge, ingen glød.
 */
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; price: string; small: string; hole: string }> = {
  sm: { box: "gap-0 rounded-[4px] py-1 pl-[18px] pr-2", price: "text-[15px]", small: "text-[10px]", hole: "left-[6px] h-[6px] w-[6px]" },
  md: { box: "gap-0.5 rounded-[6px] py-2 pl-7 pr-3.5", price: "text-[28px]", small: "text-[11px]", hole: "left-2.5 h-2 w-2" },
  lg: {
    box: "gap-1 rounded-[8px] py-3 pl-10 pr-5 md:py-4 md:pl-12 md:pr-6",
    price: "text-[46px] md:text-[64px]",
    small: "text-[12px] md:text-[13px]",
    hole: "left-3.5 h-3 w-3 md:left-4 md:h-3.5 md:w-3.5",
  },
};

export function PriceTag({
  price,
  before,
  note,
  size = "md",
  tilt = 0,
  surface = "dark",
  className = "",
}: {
  /** Det, kunden betaler, fx "1.709 kr." eller "−10 %". */
  price: string;
  /** Normalprisen, vises overstreget. */
  before?: string;
  /** Kort tekst under prisen, fx hvad prisen gælder. */
  note?: string;
  size?: Size;
  /** Grader. Brug lidt (-3 til -5) på store flader, 0 i lister. */
  tilt?: number;
  /** Farven bag mærket, så hullet ser udstanset ud. */
  surface?: "dark" | "light" | "green";
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={`relative inline-flex flex-col items-start bg-[#5A8C6F] text-white ${s.box} ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 -translate-y-1/2 rounded-full ${surface === "dark" ? "bg-black" : surface === "green" ? "bg-[#0E2219]" : "bg-white"} ${s.hole}`}
      />
      {before && (
        <s className={`${s.small} font-medium tabular-nums text-white/70`}>
          <span className="sr-only">Før </span>
          {before}
        </s>
      )}
      <span className={`font-display ${s.price} font-bold leading-[0.9] tracking-[-0.01em] tabular-nums`}>{price}</span>
      {note && <span className={`${s.small} font-medium leading-tight text-white/85`}>{note}</span>}
    </span>
  );
}
