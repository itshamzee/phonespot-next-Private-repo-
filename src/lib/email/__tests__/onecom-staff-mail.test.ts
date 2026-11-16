// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { MailboxConfig } from "@/lib/mail-agent/config";
import { pickSenderMailbox, sendStaffMail } from "../onecom-staff-mail";

const box = (address: string): MailboxConfig => ({ address, localPart: address.split("@")[0], password: "pw", displayName: `PS ${address}`, storeId: null });

describe("pickSenderMailbox", () => {
  it("sends from the recipient's own mailbox when it is configured", () => {
    expect(pickSenderMailbox([box("info@phonespot.dk"), box("slagelse@phonespot.dk")], "Slagelse@phonespot.dk")?.address).toBe("slagelse@phonespot.dk");
  });
  it("falls back to info@, then to any configured mailbox", () => {
    expect(pickSenderMailbox([box("ha@phonespot.dk"), box("info@phonespot.dk")], "vejle@phonespot.dk")?.address).toBe("info@phonespot.dk");
    expect(pickSenderMailbox([box("ha@phonespot.dk")], "vejle@phonespot.dk")?.address).toBe("ha@phonespot.dk");
    expect(pickSenderMailbox([], "vejle@phonespot.dk")).toBeNull();
  });
});

describe("sendStaffMail", () => {
  it("sends over the chosen mailbox's SMTP login", async () => {
    const sendMail = vi.fn(async () => ({}));
    const transport = vi.fn(() => ({ sendMail }));
    await sendStaffMail({ to: "slagelse@phonespot.dk", subject: "S", text: "T" }, { mailboxes: () => [box("slagelse@phonespot.dk")], transport });
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ address: "slagelse@phonespot.dk" }));
    expect(sendMail).toHaveBeenCalledWith({ from: { name: "PS slagelse@phonespot.dk", address: "slagelse@phonespot.dk" }, to: "slagelse@phonespot.dk", subject: "S", text: "T" });
  });
  it("throws when no one.com mailbox is configured, so the caller can retry later", async () => {
    await expect(sendStaffMail({ to: "x@phonespot.dk", subject: "S", text: "T" }, { mailboxes: () => [], transport: vi.fn() }))
      .rejects.toThrow("Ingen one.com-postkasse");
  });
});
