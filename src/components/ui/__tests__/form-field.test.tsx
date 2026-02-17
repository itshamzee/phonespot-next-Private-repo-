import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField } from "../form-field";

describe("FormField", () => {
  it("renders input with label", () => {
    render(<FormField label="Navn" name="name" />);
    expect(screen.getByLabelText("Navn")).toBeInTheDocument();
  });

  it("renders textarea when type is textarea", () => {
    render(<FormField label="Besked" name="message" type="textarea" />);
    const el = screen.getByLabelText("Besked");
    expect(el.tagName).toBe("TEXTAREA");
  });

  it("renders select with options", () => {
    render(
      <FormField
        label="Emne"
        name="subject"
        type="select"
        options={["Support", "Salg"]}
      />
    );
    expect(screen.getByLabelText("Emne")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("shows required indicator", () => {
    render(<FormField label="Email" name="email" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
