import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StoreScopeProvider, type AdminMe } from "@/components/admin/shell/store-scope-context";
import { ToastProvider } from "@/components/admin/ui";
import { InboxScreen } from "../inbox-screen";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const me: AdminMe = { id: "me", name: "Mads", email: "m@phonespot.dk", role: "employee", isOwner: false, ownSlug: "vejle", scope: "vejle" };
const DRAFT = "Skærmskift på iPhone 13 koster 1.169 kr.";

const listRow = {
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
  lastInboundAt: "2026-11-19T08:00:00Z",
  needsHuman: false,
  needsHumanReason: null,
  hasDraft: true,
  fiksAnswered: false,
  isPublic: false,
  source: "mail",
};

const detail = {
  inquiry: {
    id: "a",
    name: "Camilla Holm",
    email: "camilla@eksempel.dk",
    phone: "20123456",
    subject: "Skærmen er sort",
    message: "Min iPhone 13 blev tabt",
    status: "ny",
    channel: "email",
    mailbox: "info@phonespot.dk",
    store_id: "vejle",
    assigned_to: null,
    assigned_name: null,
    snoozed_until: null,
    created_at: "2026-11-19T08:00:00Z",
  },
  messages: [
    { id: "m1", sender: "customer", channel: "email", body: "Min iPhone 13 blev tabt", staff_name: null, is_internal: false, created_at: "2026-11-19T08:00:00Z" },
  ],
  drafts: [
    { id: "d1", status: "pending", needs_human: false, reason: null, draft_body: DRAFT, lookups: [{ tool: "quote_repair" }], created_at: "2026-11-19T08:01:00Z" },
  ],
};

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[] = [];
let takeStatus = 200;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  calls = [];
  takeStatus = 200;
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
      calls.push({ url, method, body });
      if (url.startsWith("/api/admin/inbox?")) return json({ rows: [listRow], counts: { mine: 0, unassigned: 1, need: 0 }, me: { id: "me", name: "Mads" } });
      if (url === "/api/admin/inbox/a") return json(detail);
      if (url === "/api/admin/inbox/a/customer")
        return json({ known: true, matchedBy: "email", name: "Camilla Holm", email: "camilla@eksempel.dk", phone: "20123456", repairs: [], orders: [], buyback: [], previous: [] });
      if (url.startsWith("/api/admin/templates")) return json([]);
      if (url.endsWith("/approve")) return json({ ok: true });
      if (url.endsWith("/discard")) return json({ ok: true });
      if (url === "/api/contact/a/reply") return json({ id: "m2" }, 201);
      if (url === "/api/admin/inbox/a/action") {
        if (body?.type === "take" && takeStatus === 409) return json({ error: "Sagen er allerede taget af Sara.", assignedName: "Sara" }, 409);
        return json({ ok: true, inquiry: { id: "a", status: "ny", assigned_to: "me", assigned_name: "Mads", snoozed_until: null } });
      }
      return json({ error: "ukendt" }, 404);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openFirst() {
  render(
    <StoreScopeProvider initialMe={me}>
      <ToastProvider>
        <InboxScreen />
      </ToastProvider>
    </StoreScopeProvider>,
  );
  const list = await screen.findByRole("list", { name: "Samtaler" });
  fireEvent.click(within(list).getAllByRole("button")[0], { detail: 1 });
  await screen.findByRole("heading", { name: "Skærmen er sort" });
  return (await screen.findByLabelText("Svar til kunden")) as HTMLTextAreaElement;
}

describe("InboxScreen", () => {
  it("forudfylder udkastet og sender det via godkend-ruten med den redigerede tekst, uden medarbejdernavn", async () => {
    const box = await openFirst();
    expect(box.value).toBe(DRAFT);
    expect(screen.getByText(/Bygger på: prisopslag reparation/)).toBeTruthy();
    expect(await screen.findByText("Fundet på mail")).toBeTruthy();
    fireEvent.change(box, { target: { value: `${DRAFT} Venlig hilsen` } });
    fireEvent.click(screen.getByRole("button", { name: "Send og vent på kunden" }));
    await screen.findByText("Sendt til Camilla Holm.");
    const approve = calls.find((c) => c.url === "/api/admin/mail-agent/drafts/d1/approve");
    expect(approve?.body).toEqual({ body: `${DRAFT} Venlig hilsen` });
    expect(calls.some((c) => c.url === "/api/contact/a/reply")).toBe(false);
    // Sagen var ledig: den tages bagefter (godkend-ruten tildeler ikke).
    expect(calls.find((c) => c.url === "/api/admin/inbox/a/action")?.body).toEqual({ type: "take", expectAssignedTo: null });
    for (const c of calls) expect(JSON.stringify(c.body ?? {})).not.toContain("staff_name");
  });

  it("SMS går via svar-ruten med after og lægger udkastet væk", async () => {
    await openFirst();
    fireEvent.change(screen.getByLabelText("Svar via"), { target: { value: "sms" } });
    fireEvent.click(screen.getByRole("button", { name: "Send og luk" }));
    await screen.findByText("Sendt til Camilla Holm.");
    expect(calls.find((c) => c.url === "/api/contact/a/reply")?.body).toEqual({ body: DRAFT, channel: "sms", after: "done" });
    expect(calls.some((c) => c.url === "/api/admin/mail-agent/drafts/d1/discard")).toBe(true);
    expect(calls.some((c) => c.url.endsWith("/approve"))).toBe(false);
  });

  it("Tag den sender den nuværende ansvarlige med og viser serverens besked ved 409", async () => {
    takeStatus = 409;
    await openFirst();
    fireEvent.click(screen.getByRole("button", { name: "Tag den" }));
    expect(await screen.findByText("Sagen er allerede taget af Sara.")).toBeTruthy();
    expect(calls.find((c) => c.body?.type === "take")?.body).toEqual({ type: "take", expectAssignedTo: null });
  });

  it("adressen følger den valgte samtale", async () => {
    await openFirst();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/kundecenter?id=a", { scroll: false }));
  });
});
