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
let approveResponse = () => json({ ok: true, transport: "onecom", filed: 0 });
let actionResponse: ((body: Record<string, unknown> | null) => Response) | null = null;
let listExtra: Record<string, unknown> = {};
let customerData: Record<string, unknown> | null = null;
let detailData: { inquiry: Record<string, unknown>; messages: typeof detail.messages; drafts: typeof detail.drafts } = detail;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  calls = [];
  takeStatus = 200;
  approveResponse = () => json({ ok: true, transport: "onecom", filed: 0 });
  actionResponse = null;
  listExtra = {};
  customerData = null;
  detailData = detail;
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
      calls.push({ url, method, body });
      if (url.startsWith("/api/admin/inbox?")) return json({ rows: [listRow], counts: { mine: 0, unassigned: 1, need: 0 }, me: { id: "me", name: "Mads" }, ...listExtra });
      if (url === "/api/admin/inbox/a") return json(detailData);
      if (url === "/api/admin/inbox/a/customer")
        return customerData ? json(customerData) : json({ known: true, matchedBy: "email", name: "Camilla Holm", email: "camilla@eksempel.dk", phone: "20123456", repairs: [], orders: [], buyback: [], previous: [] });
      if (url.startsWith("/api/admin/templates")) return json([]);
      if (url.endsWith("/approve")) return approveResponse();
      if (url.endsWith("/discard")) return json({ ok: true });
      if (url === "/api/contact/a/reply") return json({ id: "m2" }, 201);
      if (url === "/api/admin/inbox/a/action") {
        if (actionResponse) return actionResponse(body);
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

async function openFirst(label = "Svar til kunden") {
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
  return (await screen.findByLabelText(label)) as HTMLTextAreaElement;
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
    expect(approve?.body).toEqual({ body: `${DRAFT} Venlig hilsen`, after: "waiting" });
    expect(calls.some((c) => c.url === "/api/contact/a/reply")).toBe(false);
    // Godkend-ruten bogfører selv: ingen efterfølgende handlinger.
    expect(calls.some((c) => c.url === "/api/admin/inbox/a/action")).toBe(false);
    for (const c of calls) expect(JSON.stringify(c.body ?? {})).not.toContain("staff_name");
  });

  it("SMS går via svar-ruten med after, uden egne kald til at kassere udkastet", async () => {
    await openFirst();
    fireEvent.change(screen.getByLabelText("Svar via"), { target: { value: "sms" } });
    fireEvent.click(screen.getByRole("button", { name: "Send og luk" }));
    await screen.findByText("Sendt til Camilla Holm.");
    expect(calls.find((c) => c.url === "/api/contact/a/reply")?.body).toEqual({ body: DRAFT, channel: "sms", after: "done" });
    // Svar-ruten kasserer selv ventende udkast.
    expect(calls.some((c) => c.url.endsWith("/discard"))).toBe(false);
    expect(calls.some((c) => c.url.endsWith("/approve"))).toBe(false);
  });

  it("Tag den sender den nuværende ansvarlige med og viser serverens besked ved 409", async () => {
    takeStatus = 409;
    await openFirst();
    fireEvent.click(screen.getByRole("button", { name: "Tag den" }));
    expect(await screen.findByText("Sagen er allerede taget af Sara.")).toBeTruthy();
    expect(calls.find((c) => c.body?.type === "take")?.body).toEqual({ type: "take", expectAssignedTo: null });
  });

  it("godkendelse med warning er en succes med advarslen i en toast; 409 viser fejlen og henter tråden", async () => {
    approveResponse = () => json({ ok: true, warning: "Svaret er sendt, men sagen kunne ikke opdateres. Opdater siden." });
    const box = await openFirst();
    fireEvent.click(screen.getByRole("button", { name: "Send og luk" }));
    await screen.findByText("Sendt til Camilla Holm.");
    expect(calls.find((c) => c.url.endsWith("/approve"))?.body).toEqual({ body: DRAFT, after: "done" });
    expect(await screen.findByText("Svaret er sendt, men sagen kunne ikke opdateres. Opdater siden.", {}, { timeout: 6000 })).toBeTruthy();
    expect(box).toBeTruthy();
  }, 10000);

  it("409 fra godkendelse står over feltet, teksten bliver, og tråden hentes igen", async () => {
    approveResponse = () => json({ error: "Udkastet er allerede behandlet." }, 409);
    const box = await openFirst();
    const before = calls.filter((c) => c.url === "/api/admin/inbox/a").length;
    fireEvent.click(screen.getByRole("button", { name: "Send og vent på kunden" }));
    expect(await screen.findByText("Udkastet er allerede behandlet.")).toBeTruthy();
    expect(box.value).toBe(DRAFT);
    await waitFor(() => expect(calls.filter((c) => c.url === "/api/admin/inbox/a").length).toBeGreaterThan(before));
  });

  it("fortryd af Færdig genåbner til den forrige status og udsættelse", async () => {
    const until = new Date(Date.now() + 86_400_000).toISOString();
    detailData = { ...detail, inquiry: { ...detail.inquiry, status: "besvaret", snoozed_until: until } };
    await openFirst();
    fireEvent.click(within(screen.getByRole("region", { name: "Samtale" })).getByRole("button", { name: "Færdig" }));
    fireEvent.click(await screen.findByRole("button", { name: /Fortryd/ }));
    await waitFor(() => expect(calls.some((c) => c.body?.type === "reopen")).toBe(true));
    expect(calls.find((c) => c.body?.type === "reopen")?.body).toEqual({ type: "reopen", to: "besvaret", snoozedUntil: until });
  });

  it("anmeldelse: kopierer, åbner linket og sætter sagen til at vente", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    detailData = {
      ...detail,
      inquiry: { ...detail.inquiry, channel: "google_review", email: null, phone: null, name: "Google-anmeldelse" },
      messages: [{ ...detail.messages[0], channel: "google_review", body: "Ventede længe. https://g.page/r/abc" }],
    };
    await openFirst("Offentligt svar");
    fireEvent.click(screen.getByRole("button", { name: "Kopiér svar og åbn anmeldelsen" }));
    expect(await screen.findByText("Svaret er kopieret. Sagen venter nu på, at du har lagt det ud.")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(DRAFT);
    expect(open).toHaveBeenCalledWith("https://g.page/r/abc", "_blank", "noopener,noreferrer");
    expect(calls.find((c) => c.url === "/api/admin/inbox/a/action")?.body).toEqual({ type: "waiting" });
    expect(calls.some((c) => c.url.endsWith("/approve") || c.url.endsWith("/reply"))).toBe(false);
    open.mockRestore();
  });

  it("noten rører aldrig svaret: udkastet står der stadig og sendes via godkend-ruten", async () => {
    const reply = await openFirst();
    fireEvent.click(screen.getByRole("radio", { name: "Intern note" }));
    fireEvent.change(screen.getByLabelText("Intern note"), { target: { value: "Ring efter frokost" } });
    fireEvent.click(screen.getByRole("button", { name: "Gem note" }));
    await screen.findByText("Noten er gemt.");
    expect(calls.find((c) => c.body?.type === "note")?.body).toEqual({ type: "note", body: "Ring efter frokost" });
    const back = screen.getByLabelText("Svar til kunden") as HTMLTextAreaElement;
    expect(back.value).toBe(DRAFT);
    expect(screen.getByText(/Udkast fra Fiks, ikke sendt/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Send og vent på kunden" }));
    // Toasten for afsendelsen står i kø bag "Noten er gemt."; selve kaldet er det, der tæller.
    await waitFor(() => expect(calls.find((c) => c.url.endsWith("/approve"))?.body).toEqual({ body: DRAFT, after: "waiting" }));
    expect(calls.some((c) => c.url === "/api/contact/a/reply")).toBe(false);
    expect(reply).toBeTruthy();
  });

  it("uden gemt visning skiftes til Ikke tildelt, når Mine er tom; en gemt visning bruges som den er", async () => {
    await openFirst();
    const views = calls.filter((c) => c.url.startsWith("/api/admin/inbox?")).map((c) => new URL(c.url, "http://x").searchParams.get("view"));
    expect(views[0]).toBe("mine");
    expect(views).toContain("unassigned");
    cleanup();
    calls = [];
    window.localStorage.setItem("kundecenter.view", "waiting");
    await openFirst();
    const after = calls.filter((c) => c.url.startsWith("/api/admin/inbox?")).map((c) => new URL(c.url, "http://x").searchParams.get("view"));
    expect(after.every((v) => v === "waiting")).toBe(true);
  });

  it("klippet liste får en rolig linje over rækkerne", async () => {
    listExtra = { truncated: true };
    await openFirst();
    expect(screen.getByText("Viser de 200 længst ventende. Brug søgning for at finde resten.")).toBeTruthy();
  });

  it("fejler Færdig (500), står sagen åben, fejlen vises, og tråd og liste hentes igen", async () => {
    actionResponse = () => json({ error: "Handlingen kunne ikke gennemføres. Prøv igen." }, 500);
    await openFirst();
    const detailsBefore = calls.filter((c) => c.url === "/api/admin/inbox/a").length;
    const listsBefore = calls.filter((c) => c.url.startsWith("/api/admin/inbox?")).length;
    const thread = screen.getByRole("region", { name: "Samtale" });
    fireEvent.click(within(thread).getByRole("button", { name: "Færdig" }));
    expect(await screen.findByText("Handlingen kunne ikke gennemføres. Prøv igen.")).toBeTruthy();
    await waitFor(() => expect(calls.filter((c) => c.url === "/api/admin/inbox/a").length).toBeGreaterThan(detailsBefore));
    await waitFor(() => expect(calls.filter((c) => c.url.startsWith("/api/admin/inbox?")).length).toBeGreaterThan(listsBefore));
    expect(within(thread).getByRole("button", { name: "Færdig" })).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Samtaler" })).getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Fortryd/ })).toBeNull();
  });

  it("Slip sagen sender den ansvarlige med og viser 409-teksten", async () => {
    detailData = { ...detail, inquiry: { ...detail.inquiry, assigned_to: "me", assigned_name: "Mads" } };
    actionResponse = (body) =>
      body?.type === "release" ? json({ error: "Sagen er allerede taget af Sara.", assignedName: "Sara" }, 409) : json({ ok: true, inquiry: {} });
    await openFirst();
    expect(screen.queryByRole("button", { name: "Tag den" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Slip sagen" }));
    expect(await screen.findByText("Sagen er allerede taget af Sara.")).toBeTruthy();
    expect(calls.find((c) => c.body?.type === "release")?.body).toEqual({ type: "release", expectAssignedTo: "me" });
  });

  it("en udsat sag viser tidspunktet og Væk nu, som fjerner udsættelsen", async () => {
    const until = new Date(Date.now() + 2 * 86_400_000).toISOString();
    detailData = { ...detail, inquiry: { ...detail.inquiry, snoozed_until: until } };
    await openFirst();
    expect(screen.getByText(/Udsat til /)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Udsæt" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Væk nu" }));
    await waitFor(() => expect(calls.some((c) => c.body?.type === "unsnooze")).toBe(true));
  });

  it("kundekortet viser danske statusser, aldrig rå koder", async () => {
    customerData = {
      known: true,
      matchedBy: "both",
      name: "Camilla Holm",
      email: "camilla@eksempel.dk",
      phone: "20123456",
      repairs: [],
      orders: [
        { id: "o1", orderNumber: 1042, status: "shipped", total: 349900, createdAt: "2026-11-01T10:00:00Z", href: "/admin/platform/orders/o1" },
        { id: "o2", orderNumber: 1043, status: "weird_code", total: null, createdAt: "2026-11-02T10:00:00Z", href: "/admin/platform/orders/o2" },
      ],
      buyback: [{ id: "b1", subject: "Sælg iPhone 13", status: "ny", offerStatus: "expired", offerAmount: 200000, createdAt: "2026-11-03T10:00:00Z", href: "/admin/opkoeb/b1" }],
      previous: [{ id: "p1", subject: "Cover", status: "venter_paa_svar", channel: "email", createdAt: "2026-10-01T10:00:00Z", href: "/admin/henvendelser?id=p1" }],
    };
    await openFirst();
    const card = screen.getByRole("complementary", { name: "Kunde" });
    expect(await within(card).findByText("Fundet på mail og telefon")).toBeTruthy();
    expect(within(card).getByText(/3\.499 kr\., Afsendt/)).toBeTruthy();
    expect(within(card).queryByText(/weird_code/)).toBeNull();
    expect(within(card).getByText(/Tilbud 2\.000 kr\., Udløbet/)).toBeTruthy();
    expect(within(card).getByText(/Mail, Venter på svar/)).toBeTruthy();
    expect(within(card).getByRole("link", { name: /Cover/ }).getAttribute("href")).toBe("/admin/kundecenter?id=p1");
  });

  it("kundekortet uden mail og telefon beder om kontaktoplysninger og nævner ikke Fiks", async () => {
    customerData = { known: false, matchedBy: null, name: "Mads K.", email: null, phone: null, repairs: [], orders: [], buyback: [], previous: [] };
    detailData = { ...detail, inquiry: { ...detail.inquiry, email: null, phone: null } };
    render(
      <StoreScopeProvider initialMe={me}>
        <ToastProvider>
          <InboxScreen />
        </ToastProvider>
      </StoreScopeProvider>,
    );
    const list = await screen.findByRole("list", { name: "Samtaler" });
    fireEvent.click(within(list).getAllByRole("button")[0], { detail: 1 });
    const card = screen.getByRole("complementary", { name: "Kunde" });
    expect(
      await within(card).findByText("Ingen kontaktoplysninger på sagen. Bed kunden om mail eller telefon, før du slår noget op."),
    ).toBeTruthy();
    expect(within(card).queryByText(/Fiks/)).toBeNull();
  });

  it("adressen følger den valgte samtale", async () => {
    await openFirst();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/kundecenter?id=a", { scroll: false }));
  });
});
