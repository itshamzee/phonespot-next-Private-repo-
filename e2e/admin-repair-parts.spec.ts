import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const ticketId = process.env.E2E_REPAIR_TICKET_ID; // en sag med butik Vejle

test.skip(!email || !password || !ticketId, "kræver E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD og E2E_REPAIR_TICKET_ID");

test("tilføj og fjern en del på en reparationssag", async ({ page }) => {
  const parts: Array<Record<string, unknown>> = [];
  await page.route("**/api/admin/lager/parts?**", (r) =>
    r.fulfill({ json: { parts: [{ shared_sku: "SCR-IP13-OLED", name: "Skærm iPhone 13", quality: "OLED", cost_price_ore: 41500, device_models: [], category: null, active: true }] } }));
  await page.route(`**/api/admin/lager/repair-parts/${ticketId}`, async (r) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      parts.push({ id: "e2e-1", ticket_id: ticketId, movement_type: "TAKE", reverses_id: null, shared_sku: body.shared_sku, part_name: body.part_name, qty: body.qty, location_code: "vejle-hub", status: "synced", voided_at: null });
      return r.fulfill({ status: 201, json: { part: parts[0] } });
    }
    return r.fulfill({ json: { enabled: true, location: "vejle-hub", parts } });
  });
  await page.route(`**/api/admin/lager/repair-parts/${ticketId}/e2e-1`, (r) => {
    parts[0] = { ...parts[0], voided_at: new Date().toISOString() };
    return r.fulfill({ json: { part: parts[0] } });
  });

  await page.goto(`/admin/reparationer/${ticketId}`);
  if (await page.getByPlaceholder("admin@phonespot.dk").isVisible()) {
    await page.getByPlaceholder("admin@phonespot.dk").fill(email!);
    await page.getByPlaceholder("Din adgangskode").fill(password!);
    await page.getByRole("button", { name: "Log ind" }).click();
  }

  const panel = page.getByRole("region", { name: "Dele brugt" });
  await expect(panel.getByText("Trækkes fra: Hovedlager Vejle")).toBeVisible();
  await panel.getByLabel("Søg i reservedelskataloget").fill("iphone 13");
  await panel.getByRole("button", { name: /Skærm iPhone 13/ }).click();
  await panel.getByLabel("Antal").fill("1");
  await panel.getByRole("button", { name: "Tilføj" }).click();
  await expect(panel.getByText("1 × Skærm iPhone 13")).toBeVisible();
  await panel.getByRole("button", { name: "Fjern Skærm iPhone 13" }).click();
  await expect(panel.getByText("Ingen dele registreret.")).toBeVisible();
});
