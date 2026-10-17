import { expect, test, type Page } from "@playwright/test";

async function signInDemo(page: Page, campus: string, next: string) {
  await page.goto(`/${campus}/signin?next=${encodeURIComponent(next)}`);
  await page.getByTestId("demo-signin").click();
  await page.waitForURL(`**${next}`);
}

test.beforeEach(async ({ request }) => {
  // Fresh seed for each test (mock mode only).
  await request.get("/api/demo/reset");
});

test("landing page renders hero, campus picker and accessible CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See it.");
  await expect(page.getByRole("link", { name: /Enter UA/ })).toBeVisible();
  await expect(page.locator("#campuses")).toContainText("Riverbend State University");
});

test("call dibs reserves a fixed-price item", async ({ page }) => {
  await signInDemo(page, "ua", "/ua/listing/lst_ua_microwave");
  await page.getByTestId("call-dibs").click();
  await expect(page.getByTestId("reservation")).toBeVisible();
  await expect(page.getByTestId("reservation")).toContainText("Held until");
  await page.goto("/ua/me?tab=dibs");
  await expect(page.getByText("700W microwave")).toBeVisible();
});

test("place a bid and win via demo settlement", async ({ page }) => {
  await signInDemo(page, "ua", "/ua/listing/lst_ua_desk");
  await expect(page.getByTestId("current-bid")).toHaveText("$110.00");
  await page.getByTestId("bid-input").fill("120");
  await page.getByTestId("review-bid").click();
  await page.getByTestId("confirm-bid").click();
  await expect(page.getByTestId("current-bid")).toHaveText("$120.00");
  await expect(page.getByText("You're the highest bidder.")).toBeVisible();
  await page.getByTestId("demo-end-auction").click();
  // Reserve is $150, so a $120 high bid closes without a sale.
  await expect(page.getByTestId("auction-panel")).toContainText("reserve not met");
});

test("visitors from another campus are view-only", async ({ page }) => {
  await signInDemo(page, "demo", "/demo");
  await page.goto("/ua/listing/lst_ua_rug");
  await expect(page.getByText(/Only students verified at UA can claim this/)).toBeVisible();
  await expect(page.getByTestId("call-dibs")).toHaveCount(0);
});

test("create a free listing", async ({ page }) => {
  await signInDemo(page, "ua", "/ua/create");
  await page.getByLabel("Title").fill("Desk fan that oscillates");
  await page.getByLabel("Category").selectOption("electronics");
  await page.getByTestId("next-step").click();
  await page.getByRole("radio", { name: /Free/ }).click();
  await page.getByTestId("next-step").click();
  await page.getByTestId("next-step").click();
  await page.getByTestId("post-listing").click();
  await page.waitForURL(/\/ua\/listing\/lst_/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Desk fan that oscillates");
  await expect(page.getByText("This is your listing")).toBeVisible();
});
