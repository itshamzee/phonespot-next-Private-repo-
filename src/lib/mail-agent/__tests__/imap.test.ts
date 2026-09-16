import { describe, it, expect } from "vitest";
import { parseInbound, preferredBody } from "@/lib/mail-agent/imap";

describe("preferredBody", () => {
  it("prefers text and strips html otherwise", () => {
    expect(preferredBody({ text: "hej", html: "<p>x</p>" })).toBe("hej");
    expect(preferredBody({ text: "", html: "<p>Hej<br>med <b>dig</b></p>" })).toBe("Hej\nmed dig");
  });

  it("drops style blocks and decodes entities", () => {
    expect(preferredBody({ html: "<style>p{}</style><p>Tom &amp; Jerry&nbsp;!</p>" })).toBe("Tom & Jerry !");
  });
});

describe("parseInbound", () => {
  it("maps mailparser output to InboundMail", () => {
    const parsed = {
      messageId: "<abc@x.dk>",
      from: { value: [{ address: "Kunde@Example.com", name: "Kunde Hansen" }] },
      to: { value: [{ address: "info@phonespot.dk" }] },
      subject: "Hej",
      text: "Body",
      date: new Date("2026-09-16T08:00:00Z"),
      inReplyTo: "<prev@phonespot.dk>",
      references: ["<a@b>", "<prev@phonespot.dk>"],
      attachments: [{ filename: "faktura.pdf" }],
    } as never;
    const m = parseInbound({ mailbox: "info@phonespot.dk", uid: 42, parsed });
    expect(m).toMatchObject({
      uid: 42,
      messageId: "<abc@x.dk>",
      fromEmail: "kunde@example.com",
      fromName: "Kunde Hansen",
      to: ["info@phonespot.dk"],
      subject: "Hej",
      text: "Body",
      inReplyTo: "<prev@phonespot.dk>",
      attachments: ["faktura.pdf"],
    });
    expect(m.references).toEqual(["<a@b>", "<prev@phonespot.dk>"]);
  });

  it("synthesises a message id when missing", () => {
    const parsed = { from: { value: [{ address: "a@b.dk" }] }, subject: "", text: "" } as never;
    const m = parseInbound({ mailbox: "info@phonespot.dk", uid: 7, parsed });
    expect(m.messageId).toBe("<uid-7@info@phonespot.dk>");
    expect(m.fromName).toBeNull();
    expect(m.references).toEqual([]);
    expect(m.listUnsubscribe).toBe(false);
  });

  it("flags newsletters via List-Unsubscribe", () => {
    const parsed = { from: { value: [{ address: "news@x.dk" }] }, subject: "Tilbud", text: "", headers: new Map([["list-unsubscribe", "<mailto:x>"]]) } as never;
    expect(parseInbound({ mailbox: "info@phonespot.dk", uid: 1, parsed }).listUnsubscribe).toBe(true);
  });
});
