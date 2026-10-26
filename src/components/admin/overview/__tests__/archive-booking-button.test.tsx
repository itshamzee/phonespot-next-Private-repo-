import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

import { ArchiveBookingButton, ARCHIVE_REASON } from "../archive-booking-button";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("ArchiveBookingButton", () => {
  it("viser to-trins bekræftelse og Fortryd annullerer", () => {
    render(<ArchiveBookingButton id="abc" />);
    fireEvent.click(screen.getByRole("button", { name: "Arkivér" }));
    expect(screen.getByText("Arkivér?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fortryd" }));
    expect(screen.getByRole("button", { name: "Arkivér" })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Ja kalder cancel-endpointet, skjuler rækken og opdaterer", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const onDone = vi.fn();
    const { container } = render(<ArchiveBookingButton id="abc" onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Arkivér" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(container.textContent).toBe("");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/repairs/abc/cancel",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ reason: ARCHIVE_REASON }) }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(onDone).toHaveBeenCalled();
  });

  it("viser fejl og gendanner knappen ved fejl", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Ikke tilladt" }) });
    render(<ArchiveBookingButton id="abc" />);
    fireEvent.click(screen.getByRole("button", { name: "Arkivér" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Ikke tilladt");
    expect(screen.getByRole("button", { name: "Arkivér" })).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
