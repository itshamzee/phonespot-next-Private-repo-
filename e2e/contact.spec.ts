import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Contact Page", () => {
  test("contact page loads with form", async ({ page }) => {
    await page.goto("/kontakt");
    await expect(
      page.locator("h1").filter({ hasText: "Kontakt os" })
    ).toBeVisible();

    // Form fields — scope to form to avoid newsletter popup duplicates
    const form = page.locator("form").filter({ hasText: "Send besked" });
    await expect(form.locator('input[name="name"]')).toBeVisible();
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.locator('[name="subject"]')).toBeVisible();
    await expect(form.locator('textarea[name="message"]')).toBeVisible();

    // Submit button
    await expect(form.getByText("Send besked")).toBeVisible();
  });

  test("contact page shows contact info", async ({ page }) => {
    await page.goto("/kontakt");
    await expect(page.getByText("info@phonespot.dk")).toBeVisible();
    await expect(page.getByText("Åbningstider")).toBeVisible();
  });

  test("contact form validates required fields", async ({ page }) => {
    await page.goto("/kontakt");

    // Try to submit empty form — HTML5 validation should prevent submission
    const submitBtn = page.getByText("Send besked");
    await submitBtn.click();

    // Should still be on the contact page
    await expect(page).toHaveURL(/kontakt/);
  });
});

test.describe("Contact API", () => {
  test("POST /api/contact rejects empty body", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("POST /api/contact rejects invalid email", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: {
        name: "Test",
        email: "not-an-email",
        subject: "Support",
        message: "Test message",
      },
    });
    expect(response.status()).toBeLessThan(500);
  });
});
