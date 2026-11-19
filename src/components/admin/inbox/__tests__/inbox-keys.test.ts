import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { inboxKeyAction, useInboxKeys } from "../inbox-keys";

const ids = ["a", "b", "c"];
const k = (key: string, over: Record<string, unknown> = {}) => ({ key, ...over });

describe("inboxKeyAction", () => {
  it("J og K flytter i listen og stopper ved enderne", () => {
    expect(inboxKeyAction(k("j"), ids, null)).toEqual({ type: "open", id: "a" });
    expect(inboxKeyAction(k("j"), ids, "a")).toEqual({ type: "open", id: "b" });
    expect(inboxKeyAction(k("J"), ids, "c")).toEqual({ type: "open", id: "c" });
    expect(inboxKeyAction(k("k"), ids, "b")).toEqual({ type: "open", id: "a" });
    expect(inboxKeyAction(k("k"), ids, "a")).toEqual({ type: "open", id: "a" });
    expect(inboxKeyAction(k("j"), [], null)).toBeNull();
  });

  it("T, E, H, R og N kræver en valgt sag", () => {
    expect(inboxKeyAction(k("t"), ids, "a")).toEqual({ type: "take" });
    expect(inboxKeyAction(k("e"), ids, "a")).toEqual({ type: "done" });
    expect(inboxKeyAction(k("h"), ids, "a")).toEqual({ type: "snooze" });
    expect(inboxKeyAction(k("r"), ids, "a")).toEqual({ type: "reply" });
    expect(inboxKeyAction(k("n"), ids, "a")).toEqual({ type: "note" });
    for (const key of ["t", "e", "h", "r", "n"]) expect(inboxKeyAction(k(key), ids, null)).toBeNull();
  });

  it("? viser hjælpen", () => {
    expect(inboxKeyAction(k("?"), ids, null)).toEqual({ type: "help" });
  });

  it("intet sker i felter eller med modifikatortaster", () => {
    for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) expect(inboxKeyAction(k("j", { targetTag: tag }), ids, "a")).toBeNull();
    expect(inboxKeyAction(k("j", { targetEditable: true }), ids, "a")).toBeNull();
    expect(inboxKeyAction(k("e", { ctrlKey: true }), ids, "a")).toBeNull();
    expect(inboxKeyAction(k("e", { metaKey: true }), ids, "a")).toBeNull();
    expect(inboxKeyAction(k("e", { altKey: true }), ids, "a")).toBeNull();
  });

  it("andre taster ignoreres", () => {
    expect(inboxKeyAction(k("x"), ids, "a")).toBeNull();
    expect(inboxKeyAction(k("Enter"), ids, "a")).toBeNull();
  });
});

describe("useInboxKeys", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("virker normalt, men ikke mens en dialog er åben", () => {
    const onAction = vi.fn();
    renderHook(() => useInboxKeys({ enabled: true, ids, selectedId: "a", onAction }));
    fireEvent.keyDown(window, { key: "e" });
    expect(onAction).toHaveBeenCalledWith({ type: "done" });
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    document.body.appendChild(dialog);
    onAction.mockClear();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.keyDown(window, { key: "j" });
    expect(onAction).not.toHaveBeenCalled();
  });
});
