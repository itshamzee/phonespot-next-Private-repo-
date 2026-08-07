"use client";

import { useLinkStatus } from "next/link";

/**
 * Subtle, purely client-side pending indicator for the specific <Link> it is
 * rendered inside of (via `next/link`'s `useLinkStatus`, Next 16+).
 *
 * With `src/app/loading.tsx` removed (see commit bee373d — the implicit
 * Suspense boundary it created was locking the HTTP status at 200 before
 * `notFound()` could set a real 404), client-side navigation no longer shows
 * any built-in loading feedback. This fills that gap without resurrecting
 * the bug: it only ever touches the DOM after hydration and cannot affect
 * the response status of the page being navigated to.
 *
 * Renders nothing while idle — must be placed inside an element with
 * `position: relative` (or similar) so the absolute bar lines up.
 */
export function LinkPendingBar({
  className = "absolute inset-x-0 top-0 z-20 h-[3px] overflow-hidden rounded-t-[inherit]",
}: {
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span aria-hidden="true" className={className}>
      <span className="block h-full w-full origin-left scale-x-0 bg-green-eco animate-link-pending" />
    </span>
  );
}

/**
 * Same idea, styled as a thin underline for inline text links (main nav)
 * rather than a bar across a card.
 */
export function LinkPendingUnderline({
  className = "absolute inset-x-0 -bottom-1 h-0.5 overflow-hidden rounded-full",
}: {
  className?: string;
}) {
  return <LinkPendingBar className={className} />;
}
