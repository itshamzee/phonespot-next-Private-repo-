/* ------------------------------------------------------------------ */
/*  Buyback follow-ups: confirmation, reminders, expiry, "send it"      */
/* ------------------------------------------------------------------ */

import { BRAND, emailHeader, emailFooter, emailButton } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape";
import type { FollowupKind } from "@/lib/buyback/followup";

/** 400000 øre → "4.000 kr." — offers are whole kroner, decimals only add noise. */
export function wholeKr(ore: number): string {
  return `${Math.round(ore / 100).toLocaleString("da-DK")} kr.`;
}

export interface FollowupContent {
  kind: FollowupKind;
  firstName: string;
  deviceLabel: string; // possessive: "din iPhone 14 Pro" or "dine 3 enheder"
  amountKr: string; // "4.000 kr."
  expiresDay: string; // "fredag d. 14. november"
  acceptUrl: string;
  rejectUrl: string;
  /** Accepted + shipping: where the customer gets the label again. */
  labelUrl: string | null;
  /** Accepted + in-store hand-in: which store. */
  storeName: string | null;
}

export interface FollowupMessage {
  subject: string;
  preheader: string;
  html: string;
  sms: string;
}

interface Copy {
  subject: string;
  preheader: string;
  paragraphs: string[]; // plain text; escaped on render
  button: { text: string; url: string } | null;
  after: string[];
  sms: string;
}

function copyFor(c: FollowupContent): Copy {
  const { deviceLabel: dev, amountKr: kr, expiresDay: day } = c;

  switch (c.kind) {
    case "reminder_24h":
      return {
        subject: `Dit tilbud på ${dev} gælder stadig`,
        preheader: `${kr} – fast pris, gratis label og pengene samme dag, som vi modtager enheden.`,
        paragraphs: [
          `Dit tilbud på ${kr} for ${dev} gælder til ${day}.`,
          "Det tager to minutter at sige ja. Vi sender en gratis label med det samme, og du får pengene samme dag, som vi modtager enheden. Prisen står fast, så længe enheden svarer til din beskrivelse.",
        ],
        button: { text: `Sælg til PhoneSpot for ${kr}`, url: c.acceptUrl },
        after: ["Har du et spørgsmål, så svar bare på denne mail."],
        sms: `PhoneSpot: Dit tilbud på ${kr} for ${dev} gælder til ${day}. Prisen står fast. Se og accepter: ${c.acceptUrl}`,
      };

    case "reminder_72h":
      return {
        subject: `Sidste dage: ${kr} for ${dev}`,
        preheader: `Tilbuddet udløber ${day}.`,
        paragraphs: [
          `Dit tilbud på ${kr} for ${dev} udløber ${day}.`,
          "Mener du, at prisen er for lav, så svar på denne mail med det beløb, du havde forventet. Så kigger vi på det igen.",
        ],
        button: { text: `Sælg til PhoneSpot for ${kr}`, url: c.acceptUrl },
        after: [],
        sms: `PhoneSpot: Dit tilbud på ${kr} udløber ${day}. Svar på vores mail, hvis du vil have et nyt bud. Accepter: ${c.acceptUrl}`,
      };

    case "expired":
      return {
        subject: `Dit tilbud på ${dev} er udløbet – vil du have et nyt?`,
        preheader: "Svar på mailen, så giver vi dig et nyt bud.",
        paragraphs: [
          `Tilbuddet på ${kr} for ${dev} er udløbet.`,
          "Vil du stadig sælge, så svar bare på denne mail, så giver vi dig et nyt bud. Har du fået et bedre tilbud et andet sted, må du gerne skrive beløbet, så ser vi, om vi kan matche det.",
        ],
        button: null,
        after: [],
        sms: `PhoneSpot: Dit tilbud på ${kr} for ${dev} er udløbet. Vil du stadig sælge? Svar på vores mail, så får du et nyt bud.`,
      };

    case "ship_3d":
    case "ship_7d": {
      const inStore = Boolean(c.storeName);
      const first =
        c.kind === "ship_3d"
          ? `Tak fordi du sagde ja til ${kr} for ${dev}. Vi har ikke modtaget enheden endnu.`
          : `Vi venter stadig på ${dev}, som du har solgt til os for ${kr}.`;
      const how = inStore
        ? `Kom forbi butikken i ${c.storeName} med enheden, så betaler vi med det samme.`
        : "Pak enheden godt ind, sæt labelen på og aflever pakken hos PostNord. Du får pengene samme dag, som vi modtager den.";
      return {
        subject:
          c.kind === "ship_3d"
            ? `Har du sendt ${dev}?`
            : `Vi venter stadig på ${dev}`,
        preheader: inStore ? `Kom forbi ${c.storeName} og få ${kr}.` : `Din gratis label ligger klar. ${kr} samme dag, vi modtager den.`,
        paragraphs: [
          first,
          how,
          "Husk at slå Find My/iCloud fra og nulstille enheden, før du sender eller afleverer den.",
        ],
        button: !inStore && c.labelUrl ? { text: "Hent din gratis label", url: c.labelUrl } : null,
        after: [
          "Har du sendt den allerede, kan du se bort fra denne mail. Har du ombestemt dig, så svar bare på mailen.",
        ],
        sms: inStore
          ? `PhoneSpot: Vi venter stadig på ${dev} (${kr}). Kom forbi butikken i ${c.storeName}, så betaler vi med det samme.`
          : `PhoneSpot: Vi har ikke modtaget ${dev} endnu (${kr}). Din gratis label: ${c.labelUrl ?? "se vores mail"}`,
      };
    }
  }
}

export function buildFollowupMessage(c: FollowupContent): FollowupMessage {
  const copy = copyFor(c);
  const paragraphs = copy.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">${escapeHtml(p)}</p>`,
    )
    .join("");
  const after = copy.after
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:14px;color:#666;line-height:1.6;">${escapeHtml(p)}</p>`,
    )
    .join("");
  const button = copy.button
    ? `<div style="margin:12px 0 28px;">${emailButton(escapeHtml(copy.button.text), copy.button.url)}</div>`
    : "";
  const reject =
    c.kind === "reminder_24h" || c.kind === "reminder_72h"
      ? `<p style="margin:0 0 12px;font-size:13px;color:#888;line-height:1.6;text-align:center;"><a href="${c.rejectUrl}" style="color:#888;">Nej tak</a></p>`
      : "";

  return {
    subject: copy.subject,
    preheader: copy.preheader,
    sms: copy.sms,
    html: shell(copy.subject, copy.preheader, c.firstName, paragraphs + button + reject + after),
  };
}

/* Sent right after the sell form, so the customer knows it arrived and what happens next. */
export function buildConfirmationEmail(params: {
  firstName: string;
  deviceLabel: string;
  inStore: boolean;
}): { subject: string; html: string } {
  const subject = `Vi har din anmodning om at sælge ${params.deviceLabel}`;
  const preheader = "Du får dit tilbud på mail, normalt inden for 24 timer på hverdage.";
  const lines = [
    `Tak – vi har modtaget ${params.deviceLabel} og kigger på det nu.`,
    "Du får dit tilbud på mail, normalt inden for 24 timer på hverdage. Tjek gerne spam-mappen, hvis du ikke har hørt fra os.",
    params.inStore
      ? "Siger du ja, kommer du bare forbi butikken med enheden, og så får du pengene med det samme."
      : "Siger du ja, sender vi en gratis label, og du får pengene samme dag, som vi modtager enheden. Siger du nej, får du den gratis retur.",
    "Prisen står fast, så længe enheden svarer til din beskrivelse.",
  ];
  const body = lines
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">${escapeHtml(p)}</p>`,
    )
    .join("");
  return { subject, html: shell(subject, preheader, params.firstName, body) };
}

function shell(title: string, preheader: string, firstName: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.warmWhite};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warmWhite};padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        ${emailHeader()}
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${BRAND.charcoal};letter-spacing:-0.3px;">
              Hej ${escapeHtml(firstName)},
            </p>
            ${body}
            <p style="margin:24px 0 0;font-size:15px;color:#555;line-height:1.6;">
              Venlig hilsen<br />PhoneSpot
            </p>
          </td>
        </tr>
        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
