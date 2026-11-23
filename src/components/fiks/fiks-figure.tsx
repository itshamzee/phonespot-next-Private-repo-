import styles from "./fiks.module.css";

/**
 * Fiks: a rounded speech bubble with a phone's speaker slot on top and two
 * eyes. Flat brand colours, no gradients. Reads at 20-56px. Decorative only;
 * the surrounding control carries the accessible name.
 *
 * tone "green": green body, white eyes (on white or green-pale ground).
 * tone "light": pale body, green eyes (on the green launcher).
 */
export function FiksFigure({
  size = 28,
  tone = "green",
  className = "",
}: {
  size?: number;
  tone?: "green" | "light";
  className?: string;
}) {
  const body = tone === "green" ? "var(--color-green-eco)" : "var(--color-green-pale)";
  const face = tone === "green" ? "#fff" : "var(--color-green-eco)";
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`${styles.figure} ${className}`}
      data-fiks-figure=""
    >
      {/* Body: a soft square bubble, its tail at the lower left. */}
      <rect x="4" y="3" width="24" height="22" rx="8" fill={body} />
      <path d="M8.5 21.5 7.6 29.2 15 24.6Z" fill={body} strokeLinejoin="round" />
      {/* Speaker slot: the hint that Fiks lives in a phone. */}
      <rect x="13" y="6.2" width="6" height="1.6" rx="0.8" fill={face} opacity="0.4" />
      {/* Eyes (they blink). */}
      <g className={styles.eyes}>
        <rect x="10.6" y="11" width="3.2" height="6" rx="1.6" fill={face} />
        <rect x="18.2" y="11" width="3.2" height="6" rx="1.6" fill={face} />
      </g>
    </svg>
  );
}
