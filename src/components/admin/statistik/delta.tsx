import { deltaText, deltaTone } from "./format";

/** Procentændring: grøn op, rød ned; intet uden sammenligning. */
export function Delta({ value }: { value: number | null | undefined }) {
  const tone = deltaTone(value);
  if (tone === "none") return null;
  return (
    <span className={`font-semibold tabular-nums ${tone === "up" ? "text-[#23703F]" : "text-[#B42318]"}`}>{deltaText(value)}</span>
  );
}
