import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import StatistikError from "../error";

afterEach(cleanup);

describe("StatistikError", () => {
  it("viser overskriften, og Prøv igen kalder reset", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    render(<StatistikError error={new Error("boom")} reset={reset} />);
    expect(screen.getByRole("heading", { name: "Statistikken kunne ikke hentes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Prøv igen" }));
    expect(reset).toHaveBeenCalledTimes(1);
    logged.mockRestore();
  });
});
