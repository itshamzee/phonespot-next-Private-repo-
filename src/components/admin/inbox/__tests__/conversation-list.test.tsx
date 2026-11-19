import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { InboxRow } from "@/lib/inquiries/inbox";
import { ConversationList, type ConversationListProps } from "../conversation-list";

afterEach(cleanup);

const row = (over: Partial<InboxRow>): InboxRow => ({
  id: "a",
  name: "Camilla Holm",
  subject: "Skærmen er sort",
  preview: "Min iPhone 13 blev tabt",
  channel: "email",
  mailbox: "info@phonespot.dk",
  store: "vejle",
  status: "ny",
  assignedTo: null,
  assignedName: null,
  snoozedUntil: null,
  lastInboundAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
  needsHuman: false,
  needsHumanReason: null,
  hasDraft: true,
  fiksAnswered: false,
  isPublic: false,
  source: "mail",
  ...over,
});

function renderList(over: Partial<ConversationListProps> = {}) {
  const props: ConversationListProps = {
    rows: [row({}), row({ id: "b", name: "Google-anmeldelse", channel: "google_review", isPublic: true, needsHuman: true, assignedTo: "me", hasDraft: true, store: null })],
    view: "unassigned",
    counts: { mine: 1, unassigned: 2, need: 1 },
    onViewChange: vi.fn(),
    query: "",
    onQuery: vi.fn(),
    searching: false,
    showStoreFilter: false,
    store: "alle",
    onStore: vi.fn(),
    loading: false,
    loaded: true,
    error: null,
    onRetry: vi.fn(),
    selectedId: "a",
    meId: "me",
    readSet: new Set(),
    onOpen: vi.fn(),
    ...over,
  };
  render(<ConversationList {...props} />);
  return props;
}

describe("ConversationList", () => {
  it("rækkerne er knapper med aria-current, ulæst-markering og mærker", () => {
    renderList();
    const list = screen.getByRole("list", { name: "Samtaler" });
    const buttons = within(list).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute("aria-current")).toBe("true");
    expect(buttons[1].getAttribute("aria-current")).toBeNull();
    expect(within(buttons[0]).getByText(/Ulæst/)).toBeTruthy();
    expect(within(buttons[0]).getByText("Mail · info@")).toBeTruthy();
    expect(within(buttons[0]).getByText("Vejle")).toBeTruthy();
    expect(within(buttons[0]).getByText("Udkast klar")).toBeTruthy();
    expect(within(buttons[0]).getByText("5 t").className).toContain("font-semibold");
    // Anmeldelse: Offentlig, Kræver dig, Min; ingen "Udkast klar" og ingen ulæst (den er min).
    expect(within(buttons[1]).getByText("Offentlig")).toBeTruthy();
    expect(within(buttons[1]).getByText("Kræver dig")).toBeTruthy();
    expect(within(buttons[1]).getByText("Min")).toBeTruthy();
    expect(within(buttons[1]).queryByText("Udkast klar")).toBeNull();
    expect(within(buttons[1]).queryByText(/Ulæst/)).toBeNull();
  });

  it("klik åbner med mus, Enter fra tastaturet melder det", () => {
    const props = renderList();
    const [first] = within(screen.getByRole("list", { name: "Samtaler" })).getAllByRole("button");
    fireEvent.click(first, { detail: 1 });
    fireEvent.click(first, { detail: 0 });
    expect(props.onOpen).toHaveBeenNthCalledWith(1, "a", false);
    expect(props.onOpen).toHaveBeenNthCalledWith(2, "a", true);
  });

  it("tom visning siger det uden opdigtet statistik", () => {
    renderList({ rows: [] });
    expect(screen.getByText("Ingen sager her.")).toBeTruthy();
  });

  it("butiksfilteret vises kun, når skærmen beder om det", () => {
    renderList();
    expect(screen.queryByRole("radiogroup", { name: "Butik" })).toBeNull();
    cleanup();
    const props = renderList({ showStoreFilter: true });
    fireEvent.click(screen.getByRole("radio", { name: "Slagelse" }));
    expect(props.onStore).toHaveBeenCalledWith("slagelse");
  });

  it("viser skelet under første hentning og fejl med Prøv igen", () => {
    renderList({ loaded: false, loading: true });
    expect(screen.getByLabelText("Henter samtaler")).toBeTruthy();
    cleanup();
    const props = renderList({ loaded: false, error: "Kunne ikke hente indbakken" });
    fireEvent.click(screen.getByRole("button", { name: "Prøv igen" }));
    expect(props.onRetry).toHaveBeenCalled();
  });
});
