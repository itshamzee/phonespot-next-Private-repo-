import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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

  it("submits the existing value when an option has a corrected display label", () => {
    const onChange = vi.fn();
    render(
      <form aria-label="Reparation">
        <FormField
          label="Reparationstype"
          name="repairType"
          type="select"
          options={["Skaermudskiftning", "Batteri"]}
          optionLabels={{ Skaermudskiftning: "Skærmudskiftning" }}
          onChange={onChange}
        />
      </form>,
    );
    fireEvent.change(screen.getByLabelText("Reparationstype"), { target: { value: "Skaermudskiftning" } });
    expect(screen.getByRole("option", { name: "Skærmudskiftning" })).toBeInTheDocument();
    expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("repairType")).toBe("Skaermudskiftning");
    expect(screen.getByRole("option", { name: "Batteri" })).toHaveValue("Batteri");
    expect(onChange).toHaveBeenCalledOnce();
  });
});
