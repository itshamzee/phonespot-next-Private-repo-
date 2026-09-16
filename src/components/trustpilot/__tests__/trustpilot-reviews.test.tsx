import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrustpilotReviews } from "../trustpilot-reviews";
import {
  getTrustpilotReviews,
  getTrustpilotSummary,
} from "@/lib/trustpilot/client";
vi.mock("@/lib/trustpilot/client", () => ({
  getTrustpilotReviews: vi.fn(),
  getTrustpilotSummary: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(getTrustpilotReviews).mockResolvedValue([]);
  vi.mocked(getTrustpilotSummary).mockResolvedValue(null);
});
describe("Trustpilot review boundary", () => {
  it("renders only the known score and review link when API data is unavailable", async () => {
    render(await TrustpilotReviews());
    expect(screen.getByText("4,7/5")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Se alle anmeldelser/ }),
    ).toHaveAttribute("href", "https://dk.trustpilot.com/review/phonespot.dk");
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    expect(screen.queryByText(/verificerede/i)).not.toBeInTheDocument();
  });
  it("renders actual returned review content and summary in Danish", async () => {
    vi.mocked(getTrustpilotReviews).mockResolvedValue([
      {
        id: "actual",
        stars: 4,
        title: "Min oplevelse",
        text: "Dette er API-resultatet.",
        consumer: { displayName: "Kunde fra API" },
        createdAt: "2026-09-01",
      },
    ]);
    vi.mocked(getTrustpilotSummary).mockResolvedValue({
      stars: 5,
      score: 4.7,
      numberOfReviews: 1000,
    });
    render(await TrustpilotReviews());
    expect(
      screen.getByRole("heading", { name: "Min oplevelse" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dette er API-resultatet.")).toBeInTheDocument();
    expect(screen.getByText("Kunde fra API")).toBeInTheDocument();
    expect(screen.getByText(/1.000 anmeldelser/)).toBeInTheDocument();
  });
});
