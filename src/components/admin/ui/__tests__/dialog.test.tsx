import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Dialog } from "../dialog";

afterEach(cleanup);

function Harness({ dismissable, autoFocusField = false }: { dismissable?: boolean; autoFocusField?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Åbn
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Flyt varer"
        description="Vælg butik"
        dismissable={dismissable}
        footer={<button type="button">Gem</button>}
      >
        <button type="button">Første</button>
        <input aria-label="Antal" autoFocus={autoFocusField} />
      </Dialog>
    </>
  );
}

function openIt() {
  const trigger = screen.getByRole("button", { name: "Åbn" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

describe("Dialog", () => {
  it("åbner som navngivet dialog med beskrivelse", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
    openIt();
    const dialog = screen.getByRole("dialog", { name: "Flyt varer" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription("Vælg butik");
    expect(dialog.className).toContain("m-dialog");
    expect(dialog.className).not.toMatch(/shadow/);
  });

  it("fokus går til det første fokuserbare element", () => {
    render(<Harness />);
    openIt();
    expect(screen.getByRole("button", { name: "Luk" })).toHaveFocus();
  });

  it("fokus går til elementet med autoFocus", () => {
    render(<Harness autoFocusField />);
    openIt();
    expect(screen.getByRole("textbox", { name: "Antal" })).toHaveFocus();
  });

  it("Esc lukker og giver fokus tilbage", () => {
    render(<Harness autoFocusField />);
    const trigger = openIt();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Antal" }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("klik på baggrunden lukker, klik i indholdet gør ikke", () => {
    render(<Harness />);
    openIt();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Første" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dismissable={false} ignorerer Esc og baggrund og har ingen lukkeknap", () => {
    render(<Harness dismissable={false} />);
    openIt();
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.queryByRole("button", { name: "Luk" })).toBeNull();
    // Fokus står i dialogen (første fokuserbare i indholdet).
    expect(screen.getByRole("button", { name: "Første" })).toHaveFocus();
  });

  it("afmonteret mens den er åben: fokus tilbage til det, der havde det før", () => {
    function Mounted() {
      const [show, setShow] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setShow(true)}>
            Åbn
          </button>
          {show && (
            <Dialog open onClose={() => setShow(false)} title="Kort">
              <button type="button" onClick={() => setShow(false)}>
                Færdig
              </button>
            </Dialog>
          )}
        </>
      );
    }
    render(<Mounted />);
    const trigger = openIt();
    fireEvent.click(screen.getByRole("button", { name: "Færdig" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("kun den øverste af to åbne dialoger reagerer på Esc", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Dialog open onClose={outer} title="Ydre">
          <p>ydre</p>
        </Dialog>
        <Dialog open onClose={inner} title="Indre">
          <p>indre</p>
        </Dialog>
      </>,
    );
    act(() => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("holder indholdet monteret, mens den toner ud", () => {
    vi.useFakeTimers();
    try {
      render(<Harness />);
      openIt();
      fireEvent.keyDown(document.body, { key: "Escape" });
      const dialog = document.querySelector("dialog")!;
      expect(dialog).not.toHaveAttribute("open");
      expect(dialog).toHaveTextContent("Første");
      act(() => vi.advanceTimersByTime(160));
      expect(dialog).not.toHaveTextContent("Første");
    } finally {
      vi.useRealTimers();
    }
  });
});
