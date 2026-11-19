import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { Composer, type ComposerProps, type ComposerState } from "../composer";

afterEach(cleanup);

const DRAFT = "Skærmskift koster 1.169 kr.";

function Harness(props: Partial<ComposerProps> & { initial?: Partial<ComposerState> }) {
  const [state, setState] = useState<ComposerState>({ mode: "reply", text: "", channel: "email", draftId: null, error: null, ...props.initial });
  return (
    <Composer
      state={state}
      onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
      channels={["email", "sms"]}
      mailbox="info@phonespot.dk"
      publicChannel={null}
      draft={null}
      savedReplies={[]}
      fillVars={{ fornavn: "Camilla", butik: "Vejle" }}
      sending={null}
      textareaRef={createRef<HTMLTextAreaElement>()}
      onSend={vi.fn()}
      onNote={vi.fn()}
      onReview={vi.fn()}
      {...props}
    />
  );
}

describe("Composer", () => {
  it("viser forudfyldt udkast med mærke og Bygger på, og Oprindeligt udkast gendanner teksten", () => {
    render(<Harness initial={{ text: DRAFT, draftId: "d1" }} draft={{ body: DRAFT, basedOn: "Bygger på: prisopslag reparation" }} />);
    expect(screen.getByText(/Udkast fra Fiks, ikke sendt\. Bygger på: prisopslag reparation/)).toBeTruthy();
    const box = screen.getByLabelText("Svar til kunden") as HTMLTextAreaElement;
    expect(box.value).toBe(DRAFT);
    expect(screen.queryByRole("button", { name: "Oprindeligt udkast" })).toBeNull();
    fireEvent.change(box, { target: { value: "Noget andet" } });
    fireEvent.click(screen.getByRole("button", { name: "Oprindeligt udkast" }));
    expect(box.value).toBe(DRAFT);
  });

  it("kanalvælgeren viser kun de kanaler, sagen har adresse til, og SMS får tegntæller", () => {
    render(<Harness channels={["sms"]} initial={{ channel: "sms", text: "hej" }} />);
    const select = screen.getByLabelText("Svar via") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["SMS"]);
    expect(screen.getByText("3 tegn, 1 sms")).toBeTruthy();
  });

  it("uden kanaler kan der ikke svares, men noter virker stadig", () => {
    render(<Harness channels={[]} initial={{ channel: null }} />);
    expect(screen.getByText(/hverken en mailadresse eller et telefonnummer/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send og luk" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Intern note" }));
    expect(screen.getByLabelText("Intern note")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gem note" })).toBeTruthy();
  });

  it("send-knapperne kalder onSend med vent eller luk og er låst, når feltet er tomt", () => {
    const onSend = vi.fn();
    render(<Harness onSend={onSend} />);
    const done = screen.getByRole("button", { name: "Send og luk" }) as HTMLButtonElement;
    expect(done.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Svar til kunden"), { target: { value: "Tak" } });
    fireEvent.click(screen.getByRole("button", { name: "Send og vent på kunden" }));
    fireEvent.click(done);
    expect(onSend.mock.calls).toEqual([["waiting"], ["done"]]);
  });

  it("viser fejlen over feltet og beholder teksten", () => {
    render(<Harness initial={{ text: "Min tekst", error: "Der er ingen mailadresse på henvendelsen" }} />);
    expect(screen.getByRole("alert").textContent).toContain("Der er ingen mailadresse på henvendelsen");
    expect((screen.getByLabelText("Svar til kunden") as HTMLTextAreaElement).value).toBe("Min tekst");
  });

  it("anmeldelser: advarsel, ingen kanalvælger, kopier-knap", () => {
    const onReview = vi.fn();
    render(<Harness publicChannel="Trustpilot" channels={[]} initial={{ text: "Tak, Mette." }} onReview={onReview} />);
    expect(screen.getByText(/bliver offentligt hos Trustpilot/)).toBeTruthy();
    expect(screen.queryByLabelText("Svar via")).toBeNull();
    expect(screen.queryByRole("button", { name: /Send/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Kopiér svar og åbn anmeldelsen" }));
    expect(onReview).toHaveBeenCalledOnce();
  });

  it("gemte svar skjules uden skabeloner og indsætter udfyldt tekst", () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByLabelText("Gemte svar")).toBeNull();
    unmount();
    render(<Harness savedReplies={[{ id: "t1", name: "Klar", body: "Hej {fornavn}, din telefon er klar i {butik}." }]} />);
    fireEvent.change(screen.getByLabelText("Gemte svar"), { target: { value: "t1" } });
    expect((screen.getByLabelText("Svar til kunden") as HTMLTextAreaElement).value).toBe("Hej Camilla, din telefon er klar i Vejle.");
  });
});
