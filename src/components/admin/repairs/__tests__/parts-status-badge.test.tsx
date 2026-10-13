import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PartsStatusBadge } from "../parts-status-badge";

it("shows Skal bestilles and Bestilt, nothing for ok, unknown or unchecked", () => {
  const { rerender, container } = render(<PartsStatusBadge status="needs_order" />);
  expect(screen.getByText("Skal bestilles")).toBeVisible();
  rerender(<PartsStatusBadge status="ordered" />);
  expect(screen.getByText("Bestilt")).toBeVisible();
  for (const s of ["ok", "unknown", null, undefined] as const) {
    rerender(<PartsStatusBadge status={s} />);
    expect(container).toBeEmptyDOMElement();
  }
});
