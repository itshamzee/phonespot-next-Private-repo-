/* ------------------------------------------------------------------ */
/*  Daily buyback operations digest                                     */
/* ------------------------------------------------------------------ */

import { BRAND, emailHeader, emailFooter } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape";

/**
 * Not a summary — a work list, in the order the work gets done:
 * pay people, register what arrived, answer what is waiting, then read.
 */

export interface DigestData {
  toPay: {
    sellerName: string;
    bankReg: string;
    bankAccount: string;
    amountKr: number;
    receiptNumber: string;
  }[];
  toReceive: {
    customerName: string;
    deviceLabel: string;
    daysInTransit: number;
  }[];
  /**
   * Parcels nobody can account for. Shipment Monitor has no REST endpoint, so a
   * lost webhook cannot be re-fetched — the only honest thing is to show the
   * silence and let a person look the tracking number up.
   */
  stuck: {
    deviceLabel: string;
    customerName: string;
    trackingNumber: string | null;
    days: number;
    reason: "leveret_ikke_modtaget" | "ingen_bevaegelse";
  }[];
  waiting: {
    total: number;
    oldestDays: number;
    biggest: { label: string; reason: string }[];
  };
  yesterday: {
    sent: number;
    accepted: number;
    rejected: number;
    acceptRatePct: number | null;
  };
  problems: { summary: string; severity: string }[];
}

function money(kr: number): string {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(kr);
}

function section(title: string, inner: string): string {
  return `
    <tr>
      <td style="padding:0 40px 24px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${BRAND.greenLight};">
          ${title}
        </p>
        ${inner}
      </td>
    </tr>`;
}

function row(cells: string[], bold = false): string {
  return `<tr>${cells
    .map(
      (c) =>
        `<td style="padding:8px 10px;font-size:13px;color:${BRAND.charcoal};border-bottom:1px solid ${BRAND.sand};${bold ? "font-weight:700;" : ""}">${c}</td>`,
    )
    .join("")}</tr>`;
}

export function buildDigestSubject(data: DigestData): string {
  const parts: string[] = [];
  if (data.toPay.length > 0) parts.push(`${data.toPay.length} skal betales`);
  if (data.waiting.total > 0) parts.push(`${data.waiting.total} venter`);
  if (data.problems.length > 0) parts.push(`${data.problems.length} problemer`);
  return parts.length > 0 ? `Opkøb i dag — ${parts.join(", ")}` : "Opkøb i dag — intet at gøre";
}

export function buildDigestHtml(data: DigestData): string {
  const blocks: string[] = [];

  if (data.toPay.length > 0) {
    const total = data.toPay.reduce((sum, p) => sum + p.amountKr, 0);
    blocks.push(
      section(
        "Skal betales",
        `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row(["Sælger", "Reg.nr", "Kontonr", "Beløb", "Slutseddel"], true)}
          ${data.toPay
            .map((p) =>
              row([
                escapeHtml(p.sellerName),
                escapeHtml(p.bankReg) || "—",
                escapeHtml(p.bankAccount) || "—",
                `${money(p.amountKr)} kr`,
                escapeHtml(p.receiptNumber),
              ]),
            )
            .join("")}
        </table>
        <p style="margin:10px 0 0;font-size:13px;color:#555;">I alt: <strong>${money(total)} kr</strong></p>`,
      ),
    );
  }

  if (data.toReceive.length > 0) {
    blocks.push(
      section(
        "Skal markeres modtaget",
        `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row(["Kunde", "Enhed", "Undervejs"], true)}
          ${data.toReceive
            .map((r) =>
              row([
                escapeHtml(r.customerName),
                escapeHtml(r.deviceLabel),
                `${r.daysInTransit} ${r.daysInTransit === 1 ? "dag" : "dage"}`,
              ]),
            )
            .join("")}
        </table>`,
      ),
    );
  }

  if (data.stuck.length > 0) {
    blocks.push(
      section(
        "Pakker der står stille",
        `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row(["Enhed", "Kunde", "Tracking", "Hvad"], true)}
          ${data.stuck
            .map((s) =>
              row([
                escapeHtml(s.deviceLabel),
                escapeHtml(s.customerName),
                escapeHtml(s.trackingNumber ?? "—"),
                s.reason === "leveret_ikke_modtaget"
                  ? `Leveret for ${s.days} ${s.days === 1 ? "dag" : "dage"} siden, ikke åbnet`
                  : `Ingen bevægelse i ${s.days} ${s.days === 1 ? "dag" : "dage"}`,
              ]),
            )
            .join("")}
        </table>`,
      ),
    );
  }

  if (data.waiting.total > 0) {
    blocks.push(
      section(
        "Venter på dig",
        `<p style="margin:0 0 8px;font-size:14px;color:${BRAND.charcoal};">
          <strong>${data.waiting.total}</strong> ${data.waiting.total === 1 ? "henvendelse" : "henvendelser"} i manuel kø.
          Ældste er ${data.waiting.oldestDays} ${data.waiting.oldestDays === 1 ? "dag" : "dage"} gammel.
        </p>
        ${
          data.waiting.biggest.length > 0
            ? `<ul style="margin:0;padding-left:18px;font-size:13px;color:#555;line-height:1.7;">
                ${data.waiting.biggest.map((b) => `<li>${escapeHtml(b.label)} — ${escapeHtml(b.reason)}</li>`).join("")}
              </ul>`
            : ""
        }`,
      ),
    );
  }

  const y = data.yesterday;
  if (y.sent > 0 || y.accepted > 0 || y.rejected > 0) {
    blocks.push(
      section(
        "Kørte automatisk i går",
        `<p style="margin:0;font-size:14px;color:${BRAND.charcoal};">
          ${y.sent} sendt · ${y.accepted} accepteret · ${y.rejected} afvist${
            y.acceptRatePct === null ? "" : ` · acceptrate ${y.acceptRatePct}%`
          }
        </p>`,
      ),
    );
  }

  if (data.problems.length > 0) {
    blocks.push(
      section(
        "Problemer",
        `<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#a11;">
          ${data.problems.map((p) => `<li>${escapeHtml(p.summary)}</li>`).join("")}
        </ul>`,
      ),
    );
  }

  const body =
    blocks.length > 0
      ? blocks.join("")
      : section(
          "I dag",
          `<p style="margin:0;font-size:14px;color:${BRAND.charcoal};">Intet at gøre i dag.</p>`,
        );

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Opkøb i dag</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};padding:40px 20px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        ${emailHeader()}
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND.charcoal};letter-spacing:-0.3px;">Opkøb i dag</p>
          </td>
        </tr>
        ${body}
        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
