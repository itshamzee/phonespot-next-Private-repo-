import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmoothAnchorScroll } from "../smooth-anchor-scroll";

let reducedMotion = false;
const scrollIntoView = vi.fn();

function setup(html: string) {
  document.body.innerHTML = html;
  return render(<SmoothAnchorScroll />, { container: document.body.appendChild(document.createElement("div")) });
}

/** Klik som med musen (detail 1); returnerer false, hvis standardhandlingen blev stoppet. */
function click(el: Element, init: MouseEventInit = {}) {
  return el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1, ...init }));
}

beforeEach(() => {
  reducedMotion = false;
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = vi.fn((query: string) => ({ matches: query.includes("reduce") && reducedMotion, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  window.history.replaceState(null, "", "/reparation");
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("SmoothAnchorScroll", () => {
  it("scrolls smoothly to a same-page anchor, updates the hash and moves focus", () => {
    setup(`<a href="#find-din-pris">Find model og pris</a><section id="find-din-pris">Finder</section>`);
    const pushState = vi.spyOn(window.history, "pushState");
    const allowed = click(document.querySelector("a")!);
    expect(allowed).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(pushState).toHaveBeenCalledWith(null, "", "#find-din-pris");
    expect(window.location.hash).toBe("#find-din-pris");
    const target = document.getElementById("find-din-pris")!;
    expect(document.activeElement).toBe(target);
    expect(target).toHaveAttribute("tabindex", "-1");
    target.blur();
    expect(target).not.toHaveAttribute("tabindex");
    pushState.mockRestore();
  });

  it("treats a link to the same path plus hash as same-page", () => {
    window.history.replaceState(null, "", "/");
    setup(`<a href="/#udvalg">Køb</a><div id="udvalg"></div>`);
    expect(click(document.querySelector("a")!)).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("leaves links to another page alone", () => {
    setup(`<a href="/saelg-din-enhed#start">Sælg</a><div id="start"></div>`);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1 });
    document.querySelector("a")!.addEventListener("click", (e) => e.preventDefault()); // ingen jsdom-navigation
    document.querySelector("a")!.dispatchEvent(event);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([
    ["ctrl", { ctrlKey: true }],
    ["cmd", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["middle", { button: 1 }],
  ])("leaves %s-clicks to the browser", (_name, init) => {
    setup(`<a href="#faq">FAQ</a><div id="faq"></div>`);
    expect(click(document.querySelector("a")!, init)).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("jumps instantly under reduced motion", () => {
    reducedMotion = true;
    setup(`<a href="#chat">Chat</a><div id="chat"></div>`);
    click(document.querySelector("a")!);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("jumps instantly when the link is activated from the keyboard", () => {
    setup(`<a href="#indhold">Gå til indhold</a><main id="indhold" tabindex="-1"></main>`);
    click(document.querySelector("a")!, { detail: 0 });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    expect(document.activeElement).toBe(document.getElementById("indhold"));
    expect(document.getElementById("indhold")).toHaveAttribute("tabindex", "-1");
  });

  it("falls back to the default behaviour when the target is missing", () => {
    setup(`<a href="#findes-ikke">Mangler</a>`);
    expect(click(document.querySelector("a")!)).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("ignores links opening in a new tab", () => {
    setup(`<a href="#x" target="_blank">Ny fane</a><div id="x"></div>`);
    expect(click(document.querySelector("a")!)).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
