import { describe, it, expect, vi } from "vitest";
import { passwordEnvName, displayNameFor, storeIdFor, loadMailboxes } from "@/lib/mail-agent/config";

describe("passwordEnvName", () => {
  it("uppercases the local part", () => {
    expect(passwordEnvName("info@phonespot.dk")).toBe("ONECOM_MAIL_PASSWORD_INFO");
    expect(passwordEnvName("Slagelse@phonespot.dk")).toBe("ONECOM_MAIL_PASSWORD_SLAGELSE");
  });
});

describe("displayNameFor / storeIdFor", () => {
  it("maps store mailboxes to the store and everything else to PhoneSpot", () => {
    expect(displayNameFor("slagelse@phonespot.dk")).toBe("PhoneSpot Slagelse");
    expect(storeIdFor("slagelse@phonespot.dk")).toBe("slagelse");
    expect(displayNameFor("vejle@phonespot.dk")).toBe("PhoneSpot Vejle");
    expect(displayNameFor("info@phonespot.dk")).toBe("PhoneSpot");
    expect(storeIdFor("ha@phonespot.dk")).toBeNull();
  });
});

describe("loadMailboxes", () => {
  it("returns configured mailboxes with passwords and skips the rest", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = {
      MAIL_AGENT_MAILBOXES: "info@phonespot.dk, slagelse@phonespot.dk,ha@phonespot.dk",
      ONECOM_MAIL_PASSWORD_INFO: "a",
      ONECOM_MAIL_PASSWORD_HA: "c",
    } as unknown as NodeJS.ProcessEnv;
    const boxes = loadMailboxes(env);
    expect(boxes.map((b) => b.address)).toEqual(["info@phonespot.dk", "ha@phonespot.dk"]);
    expect(boxes[0]).toMatchObject({ localPart: "info", password: "a", displayName: "PhoneSpot", storeId: null });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("slagelse@phonespot.dk"));
    warn.mockRestore();
  });

  it("returns [] when MAIL_AGENT_MAILBOXES is unset", () => {
    expect(loadMailboxes({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});
