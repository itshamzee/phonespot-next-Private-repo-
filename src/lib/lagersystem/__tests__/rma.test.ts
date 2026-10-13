import { describe, expect, it } from "vitest";
import { foundByText, isRmaStatus, OPEN_RMA_STATUSES, rmaActions, rmaKeyForTicketPart, RMA_STATUS_LABELS } from "../rma";

describe("rma helpers", () => {
  it("labels statuses in Danish", () => {
    expect(RMA_STATUS_LABELS).toEqual({ REGISTERED: "Registreret", SENT: "Sendt til leverandør", CREDITED: "Krediteret", REPLACED: "Erstattet", REJECTED: "Afvist" });
    expect(OPEN_RMA_STATUSES).toEqual(["REGISTERED", "SENT"]);
    expect(isRmaStatus("SENT")).toBe(true);
    expect(isRmaStatus("sent")).toBe(false);
  });
  it("shows who found the defect (spec §3.6 label)", () => {
    expect(foundByText({ found_by_label: "Fixon" })).toBe("Fundet af Fixon");
    expect(foundByText({ found_by_label: "PhoneSpot Vejle" })).toBe("Fundet af PhoneSpot Vejle");
  });
  it("allows send only from REGISTERED, and resolve from REGISTERED or SENT", () => {
    expect(rmaActions("REGISTERED")).toEqual({ send: true, resolve: true });
    expect(rmaActions("SENT")).toEqual({ send: false, resolve: true });
    for (const s of ["CREDITED", "REPLACED", "REJECTED"] as const) expect(rmaActions(s)).toEqual({ send: false, resolve: false });
  });
  it("one RMA per ticket part (double click is idempotent)", () => {
    expect(rmaKeyForTicketPart("t1", "p1")).toBe("repair:t1:defect:p1");
  });
});
