import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AdminLoading from "../loading";

afterEach(cleanup);

describe("admin loading.tsx", () => {
  it("viser sideskelettet", () => {
    render(<AdminLoading />);
    const page = screen.getByLabelText("Indlæser");
    expect(page).toHaveAttribute("aria-busy", "true");
    // Skelettet står bare der; .m-page lader kun den rigtige side glide ind.
    expect(page).toHaveAttribute("data-skeleton");
    expect(page.querySelectorAll("[data-skeleton-surface]")).toHaveLength(3);
  });
});
