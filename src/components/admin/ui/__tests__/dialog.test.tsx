import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Dialog } from "../dialog";
import { MOTION_MS } from "../motion";

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

  it("dismissOnBackdrop={false}: baggrunden lukker ikke, Esc og Luk gør stadig", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Meld klar" dismissOnBackdrop={false}>
        <input aria-label="Begrundelse" />
      </Dialog>,
    );
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('initialFocus="container": fokus på selve dialogen, ikke på Luk; autoFocus vinder stadig', () => {
    function Box({ autoFocusField }: { autoFocusField?: boolean }) {
      return (
        <Dialog open onClose={vi.fn()} title="Skift ekspedient" initialFocus="container">
          <button type="button">Mads</button>
          {autoFocusField && <input aria-label="Felt" autoFocus />}
        </Dialog>
      );
    }
    const { unmount } = render(<Box />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(dialog.className).toContain("outline-none");
    unmount();
    render(<Box autoFocusField />);
    expect(screen.getByRole("textbox", { name: "Felt" })).toHaveFocus();
  });

  it("uden initialFocus er dialogen ikke selv fokuserbar", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Rabat">
        <p>tekst</p>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).not.toHaveAttribute("tabindex");
  });

  it("restoreFocus={false}: fokus lægges ikke tilbage på udløseren", () => {
    function NoRestore() {
      const [show, setShow] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setShow(true)}>
            Åbn
          </button>
          {show && (
            <Dialog open onClose={() => setShow(false)} title="Skift" restoreFocus={false}>
              <button type="button" onClick={() => setShow(false)}>
                Færdig
              </button>
            </Dialog>
          )}
        </>
      );
    }
    render(<NoRestore />);
    const trigger = openIt();
    fireEvent.click(screen.getByRole("button", { name: "Færdig" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).not.toHaveFocus();
    expect(document.activeElement).toBe(document.body);
  });

  it("kalderens attributter kommer med, men Dialogs egne vinder", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Fotos" data-kasse-dialog="" aria-labelledby="andet" style={{ maxWidth: 768 }}>
        <p>tekst</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Fotos" });
    expect(dialog).toHaveAttribute("data-kasse-dialog");
    expect(dialog.style.maxWidth).toBe("768px");
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
      act(() => vi.advanceTimersByTime(MOTION_MS.fast));
      expect(dialog).not.toHaveTextContent("Første");
    } finally {
      vi.useRealTimers();
    }
  });
});
