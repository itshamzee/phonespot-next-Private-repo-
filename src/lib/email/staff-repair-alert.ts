import { dayLabel } from "@/lib/admin/overview/web-bookings";
import { formatTimeWindow } from "@/lib/admin/overview/format";

/**
 * Personalets mail om en ny reparationsanmodning: emnelinjen siger hvornår kunden
 * kommer, og mailen har en knap direkte til sagen i admin, så man ikke skal lede.
 */

const ADMIN_BASE = "https://phonespot.dk/admin/reparationer";

export function adminCaseUrl(ticketId: string): string {
  return `${ADMIN_BASE}/${ticketId}`;
}

/** "tirsdag 27. okt. kl. 16.00–18.00", "tirsdag 27. okt." eller null. */
export function bookingWhen(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return null;
  const day = dayLabel(date.slice(0, 10)).toLowerCase();
  const window = formatTimeWindow(time);
  return window ? `${day} kl. ${window}` : day;
}

/** "Ny reparationsanmodning (Vejle): Google Pixel 9 Pro XL, tirsdag 27. okt. kl. 16.00–18.00" */
export function staffRepairSubject(args: {
  storeLabel: string | null;
  what: string;
  date?: string | null;
  time?: string | null;
}): string {
  const when = bookingWhen(args.date, args.time);
  const store = args.storeLabel ? ` (${args.storeLabel})` : "";
  return `Ny reparationsanmodning${store}: ${args.what}${when ? `, ${when}` : ""}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Enkel HTML-udgave af tekstmailen med knappen "Åbn sagen i admin" øverst. */
export function staffRepairHtml(text: string, url: string): string {
  return [
    '<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;color:#15211B;max-width:560px">',
    `<p style="margin:0 0 20px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1A3D2E;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Åbn sagen i admin</a></p>`,
    `<div style="white-space:pre-wrap;line-height:1.5">${escapeHtml(text)}</div>`,
    "</div>",
  ].join("");
}
