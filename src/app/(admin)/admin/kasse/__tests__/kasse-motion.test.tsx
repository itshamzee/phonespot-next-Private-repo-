import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

// Kassen: skelet i stedet for ingenting, kurvens knapper, terminalens ventetilstand og
// Modal-indpakningen om den fælles Dialog. Ingen beløb eller betalingslogik testes her.

vi.mock("@/lib/pos/payment-terminal", () => ({ paymentTerminalKind: () => "manual" }));
vi.mock("../_components/kasse-screen", () => ({
  KasseScreen: () => {
    // Suspenderer for altid, så Suspense-grænsens fallback er det, der vises.
    throw new Promise(() => {});
  },
}));
vi.mock("@/lib/supabase/client", () => ({ createBrowserClient: () => ({}) }));
vi.mock("@/lib/pos/client", () => ({ posJson: vi.fn(), printBase64Pdf: vi.fn() }));

import KassePage from "../page";
import { CartPanel } from "../_components/cart-panel";
import { CardDialog, DepositDialog, Modal, SplitDialog } from "../_components/dialogs";
import type { CartLine, CartTotals, CaseContext } from "@/lib/pos/kasse-logic";
import { newPaymentLine } from "../_components/payment-lines";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Kasse: siden", () => {
  it("viser et skelet i kassens layout, mens skærmen indlæses", () => {
    render(<KassePage />);
    const skeleton = screen.getByLabelText("Indlæser kassen");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("data-skeleton");
    expect(skeleton.querySelector("[data-kasse-skeleton='tiles']")).not.toBeNull();
    expect(skeleton.querySelector("[data-kasse-skeleton='cart']")).not.toBeNull();
  });
});

const totals = (total: number) => ({ total, vat: Math.round(total / 5), discount: 0, bundleDiscount: 0, bundleUnitsToNextFree: 0 }) as unknown as CartTotals;

function cart(props: Partial<Parameters<typeof CartPanel>[0]> = {}) {
  const lines: CartLine[] = [{ key: "l1", type: "sku_product", skuProductId: "s1", name: "Cover", price: 19_900, quantity: 2 } as CartLine];
  const onQty = vi.fn();
  render(
    <CartPanel
      lines={lines}
      applied={[]}
      totals={totals(39_800)}
      customer={null}
      discountOere={0}
      discountReason=""
      payChoice={{ kind: "single", type: "kontant" }}
      canCharge
      processing={false}
      blockReason={null}
      error=""
      hasOpenSession
      onQty={onQty}
      onRemove={vi.fn()}
      onPrice={vi.fn()}
      onCustomer={vi.fn()}
      onClearCustomer={vi.fn()}
      onDiscount={vi.fn()}
      onMethod={vi.fn()}
      onSplit={vi.fn()}
      onCharge={vi.fn()}
      {...props}
    />,
  );
  return { onQty };
}

describe("Kasse: kurven", () => {
  it("antalsknapperne har navne, store berøringsflader og virker som før", () => {
    const { onQty } = cart();
    const less = screen.getByRole("button", { name: "Færre" });
    const more = screen.getByRole("button", { name: "Flere" });
    for (const b of [less, more]) {
      expect(b.className).toContain("m-tap");
      expect(b.className).toContain("m-press");
      expect(b.className).toMatch(/min-h-8/);
    }
    fireEvent.click(more);
    fireEvent.click(less);
    expect(onQty.mock.calls).toEqual([
      ["l1", 1],
      ["l1", -1],
    ]);
  });

  it("nye linjer toner ind, og betalingsknapperne har tryk-feedback", () => {
    cart();
    expect(screen.getByText("Cover").closest(".m-row-in")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Kontant" }).className).toContain("m-press");
    expect(screen.getByRole("button", { name: /Opkræv/ }).className).toContain("m-press");
  });

  it("under behandling viser opkræv-knappen Behandler... med spinner og aria-busy", () => {
    cart({ processing: true, canCharge: false });
    const charge = screen.getByRole("button", { name: /Behandler/ });
    expect(charge).toHaveAttribute("aria-busy", "true");
    expect(charge.querySelector("[data-spinner]")).not.toBeNull();
    expect(charge).toBeDisabled();
  });
});

describe("Kasse: terminalen venter", () => {
  it("viser en rolig indikator og sekunder siden start, som status", () => {
    vi.useFakeTimers();
    render(<CardDialog amountOere={100_000} busy error="" terminalKind="worldline" onApproved={vi.fn()} onClose={vi.fn()} onCancelTerminal={vi.fn()} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Sender beløb til terminalen…");
    expect(status.querySelector("[data-spinner]")).not.toBeNull();
    expect(status).toHaveTextContent("0 sek.");
    act(() => vi.advanceTimersByTime(12_000));
    expect(status).toHaveTextContent("12 sek.");
  });
});

describe("Kasse: Modal om den fælles Dialog", () => {
  function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Rabat
        </button>
        {open && (
          <Modal
            title="Rabat"
            onClose={() => {
              onClose();
              setOpen(false);
            }}
          >
            <input aria-label="Rabat (kr.)" autoFocus />
            <button type="button">Gem</button>
          </Modal>
        )}
      </>
    );
  }

  // Fokusfælden selv er browserens (showModal gør siden inert) og kan ikke testes i jsdom.
  it("er en navngiven dialog med kassens markør; fokus flyttes ind ved åbning og tilbage ved lukning", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Rabat" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Rabat" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("data-kasse-dialog");
    expect(screen.getByLabelText("Rabat (kr.)")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("Esc og klik på baggrunden lukker som før", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Rabat" }));
    fireEvent.keyDown(screen.getByLabelText("Rabat (kr.)"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Rabat" }));
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("en kortbetaling i gang lukker ikke på Esc eller baggrund", () => {
    const onClose = vi.fn();
    render(<CardDialog amountOere={100_000} busy error="" onApproved={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });
});

describe("Kasse: scanneren rammer ingen knap", () => {
  const caseCtx = {
    id: "t1",
    ticketNumber: "PS-2026-1189",
    paid: false,
    customer: { id: null, name: "Anders Hansen", phone: null, email: null },
    deviceLabel: "OnePlus Nord 3",
    totalOere: 169_800,
    description: "Sag",
    deposits: [],
    depositsOk: true,
  } as CaseContext;

  it("TerminalPending (kort): fokus på selve dialogen, ikke på Luk; Enter lukker ikke", () => {
    const onClose = vi.fn();
    render(<CardDialog amountOere={100_000} busy error="" terminalKind="worldline" onApproved={vi.fn()} onClose={onClose} onCancelTerminal={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Kortbetaling" });
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute("open");
    // Knapperne virker som før.
    expect(screen.getByRole("button", { name: "Annuller betaling" })).toBeEnabled();
  });

  it("TerminalPending efter Prøv igen: fokus går fra knappen til dialogen", () => {
    const { rerender } = render(<CardDialog amountOere={100_000} busy={false} error="Afvist" terminalKind="worldline" onApproved={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Prøv igen" })).toHaveFocus();
    rerender(<CardDialog amountOere={100_000} busy error="" terminalKind="worldline" onApproved={vi.fn()} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("Del betaling uden felt med autoFocus: fokus på dialogen, ikke på Luk", () => {
    render(
      <SplitDialog total={10_000} hasCustomer={false} locationId="l1" initialLines={[newPaymentLine("kontant", 10_000)]} onConfirm={vi.fn()} onClose={vi.fn()} />,
    );
    expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "Del betaling" }));
  });

  it("DepositDialog under en terminalbetaling: Esc, baggrund og Luk lukker ikke; fokus på dialogen", () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();
    render(<DepositDialog c={caseCtx} busy error="" terminalKind="worldline" onSubmit={vi.fn()} onClose={onClose} onCancelTerminal={onCancel} />);
    const dialog = screen.getByRole("dialog", { name: "Depositum på sag" });
    expect(screen.getByText("Sender beløb til terminalen…")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.mouseDown(dialog);
    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    expect(onClose).not.toHaveBeenCalled();
    // Annuller betaling virker som før.
    fireEvent.click(screen.getByRole("button", { name: "Annuller betaling" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("DepositDialog efter terminalsvaret (godkendt eller afvist): lukker på Esc og baggrund som før", () => {
    const onClose = vi.fn();
    const props = { c: caseCtx, error: "", terminalKind: "worldline" as const, onSubmit: vi.fn(), onClose, onCancelTerminal: vi.fn() };
    const { rerender } = render(<DepositDialog {...props} busy />);
    rerender(<DepositDialog {...props} busy={false} error="Kortet blev afvist" />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("DepositDialog med manuel terminal under gemning: lukker som før (kun den integrerede terminal er låst)", () => {
    const onClose = vi.fn();
    render(<DepositDialog c={caseCtx} busy error="" terminalKind="manual" onSubmit={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
