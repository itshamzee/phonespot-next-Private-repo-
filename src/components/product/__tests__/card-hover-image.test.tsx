import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductGridCard } from "../product-grid-card";

afterEach(cleanup);

const base = {
  slug: "iphone-15",
  title: "iPhone 15",
  deviceCount: 3,
  brand: "Apple",
  category: "iphone",
  minPrice: 399900,
  image: "https://example.com/front.png",
};

function hoverHost(container: HTMLElement) {
  return container.querySelector("[data-hover-image]");
}

function enter(card: Element, pointerType: string) {
  const event = new Event("pointerenter");
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(card, event);
}

describe("product card hover image", () => {
  it("does not render the second image before the pointer enters the card", () => {
    const { container } = render(<ProductGridCard {...base} hoverImage="https://example.com/back.png" />);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(hoverHost(container)?.querySelector("img")).toBeNull();
  });

  it("renders a lazy, decorative second image after a mouse enters the card", async () => {
    const { container } = render(<ProductGridCard {...base} hoverImage="https://example.com/back.png" />);
    enter(screen.getByRole("link"), "mouse");
    const host = hoverHost(container)!;
    const img = host.querySelector("img")!;
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img.getAttribute("src")).toContain("back.png");
    expect(host).toHaveAttribute("aria-hidden", "true");
    // The first image keeps the real alt text and stays the only one named.
    expect(screen.getByRole("img", { name: "iPhone 15" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(host).not.toHaveAttribute("data-loaded");
    // next/image reports load after decode, asynchronously.
    fireEvent.load(img);
    await waitFor(() => expect(host).toHaveAttribute("data-loaded"));
  });

  it("never arms on touch", () => {
    const { container } = render(<ProductGridCard {...base} hoverImage="https://example.com/back.png" />);
    enter(screen.getByRole("link"), "touch");
    expect(hoverHost(container)?.querySelector("img")).toBeNull();
  });

  it("renders no hover layer when there is no second image", () => {
    const { container } = render(<ProductGridCard {...base} />);
    enter(screen.getByRole("link"), "mouse");
    expect(hoverHost(container)).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("renders no hover layer when the second image is the same as the first", () => {
    const { container } = render(<ProductGridCard {...base} hoverImage={base.image} />);
    expect(hoverHost(container)).toBeNull();
  });
});
