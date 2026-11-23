/**
 * Lille drejende ring i tekstens farve (samme som i Button). Drejer kun, når brugeren
 * ikke har bedt om reduceret bevægelse; ellers står den stille som en ring.
 * En af de tilladte uendelige animationer (ventende knap, kortterminal).
 */
export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-spinner
      className={`inline-block shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin ${className}`}
    />
  );
}
