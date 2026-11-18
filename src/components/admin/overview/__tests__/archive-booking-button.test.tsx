import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { ToastProvider } from "@/components/admin/ui/toast";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

import { ArchiveBookingButton, ARCHIVE_REASON } from "../archive-booking-button";

const fetchMock = vi.fn();
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: ToastProvider });

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

  it("Ja kalder cancel-endpointet, dæmper rækken, opdaterer og viser en toast", async () => {
    let answer!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (answer = r)));
    const onDone = vi.fn();
    render(
      <div data-testid="row" data-archive-row>
        <ArchiveBookingButton id="abc" onDone={onDone} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Arkivér" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/repairs/abc/cancel",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ reason: ARCHIVE_REASON }) }),
    );
    // Mens det sker: knappen er slået fra, og rækken er dæmpet.
    const pending = screen.getByRole("button", { name: "Arkiverer…" });
    expect(pending).toBeDisabled();
    expect(screen.getByTestId("row")).toHaveAttribute("aria-busy", "true");

    answer({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(onDone).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Booking arkiveret");
    await waitFor(() => expect(screen.queryByRole("button", { name: /Arkiv/ })).toBeNull());
    expect(screen.getByTestId("row")).not.toHaveAttribute("aria-busy");
  });

  it("viser fejl og gendanner knappen ved fejl", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Ikke tilladt" }) });
    render(
      <div data-testid="row" data-archive-row>
        <ArchiveBookingButton id="abc" />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Arkivér" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    // Fejlen står inline ved knappen (toastens egen alert-flade er tom).
    expect(await screen.findByText("Ikke tilladt")).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Arkivér" })).toBeTruthy();
    expect(screen.getByTestId("row")).not.toHaveAttribute("aria-busy");
    expect(refresh).not.toHaveBeenCalled();
  });
});
