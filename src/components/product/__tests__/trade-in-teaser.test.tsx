import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TradeInTeaser } from "@/components/product/trade-in-teaser";

describe("TradeInTeaser", () => {
  it("renders a link to the sell flow", () => {
    render(<TradeInTeaser category="laptop" />);
    const link = screen.getByRole("link", { name: /Få en pris på 30 sekunder/ });
    expect(link).toHaveAttribute("href", "/saelg-din-enhed");
  });

  it("picks a natural Danish word per device category", () => {
    render(<TradeInTeaser category="iphone" />);
    expect(screen.getByText(/Har du en gammel telefon\?/)).toBeInTheDocument();
  });

  it("falls back to a generic word for an unrecognised or missing category", () => {
    render(<TradeInTeaser category="something-unknown" />);
    expect(screen.getByText(/Har du en gammel enhed\?/)).toBeInTheDocument();
  });

  // Guard against a number creeping back into this component later — the
  // public trade-in endpoint it used to consume was removed because any
  // published figure was unsafe to honour (see Job 1 of this change).
  // "30 sekunder" (a time claim, not money) is intentionally allowed through
  // — the guard is specifically against a kroner amount.
  it("never renders a kroner amount — no price claim, ever", () => {
    render(<TradeInTeaser category="laptop" />);
    expect(screen.queryByText(/kr\.?\b/)).not.toBeInTheDocument();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/kr\.?\b/i);
    // No thousand-formatted or multi-digit figure that could read as a price.
    expect(text).not.toMatch(/\d{2,}[.,]?\d*\s*(kr|kroner|,-)/i);
  });

  it("never uses 'op til' or 'fra' wording that implies an amount", () => {
    render(<TradeInTeaser category="laptop" />);
    const text = document.body.textContent ?? "";
    expect(text.toLowerCase()).not.toMatch(/op til|\bfra\b/);
  });
});
