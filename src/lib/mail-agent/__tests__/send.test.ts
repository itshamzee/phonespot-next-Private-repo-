import { describe, it, expect } from "vitest";
import { buildMailOptions } from "@/lib/mail-agent/send";

const box = {
  address: "slagelse@phonespot.dk",
  localPart: "slagelse",
  password: "x",
  displayName: "PhoneSpot Slagelse",
  storeId: "slagelse" as const,
};

describe("buildMailOptions", () => {
  it("sets From with display name, threading headers and both bodies", () => {
    const o = buildMailOptions({
      mailbox: box,
      to: "kunde@example.com",
      toName: "Kunde",
      subject: "Re: Hej",
      text: "Hej",
      html: "<p>Hej</p>",
      inReplyTo: "<a@b>",
      references: ["<z@y>", "<a@b>"],
    });
    expect(o.from).toEqual({ name: "PhoneSpot Slagelse", address: "slagelse@phonespot.dk" });
    expect(o.to).toEqual({ name: "Kunde", address: "kunde@example.com" });
    expect(o.inReplyTo).toBe("<a@b>");
    expect(o.references).toEqual(["<z@y>", "<a@b>"]);
    expect(o.text).toBe("Hej");
    expect(o.html).toBe("<p>Hej</p>");
  });

  it("omits threading headers when there is nothing to thread to", () => {
    const o = buildMailOptions({
      mailbox: box,
      to: "k@e.com",
      toName: null,
      subject: "s",
      text: "t",
      html: "h",
      inReplyTo: null,
      references: [],
    });
    expect(o.inReplyTo).toBeUndefined();
    expect(o.references).toBeUndefined();
    expect(o.to).toBe("k@e.com");
  });
});
