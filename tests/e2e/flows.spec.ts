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
  await signInDemo(page, "riverbend", "/riverbend");
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

test("email code sign-in only accepts @crimson.ua.edu", async ({ page }) => {
  await page.goto("/ua/signin");
  await page.getByLabel("Campus email").fill("someone@ua.edu");
  await page.getByTestId("send-code").click();
  await expect(page.locator("p[role=alert]")).toContainText("@crimson.ua.edu");
  await page.getByLabel("Campus email").fill("e2e.student@crimson.ua.edu");
  await page.getByTestId("send-code").click();
  const code = (await page.getByTestId("screen-code").innerText()).trim();
  await page.getByLabel("Code").fill(code === "000000" ? "111111" : "000000");
  await page.getByTestId("verify-code").click();
  await expect(page.locator("p[role=alert]")).toContainText("Wrong code");
  await page.getByLabel("Code").fill(code);
  await page.getByTestId("verify-code").click();
  await page.waitForURL("**/ua");
  await page.goto("/ua/me");
  await expect(page.getByText("e2e.student@crimson.ua.edu")).toBeVisible();
});

test("handoff: confirm payment and hand off", async ({ page }) => {
  await signInDemo(page, "ua", "/ua/x/handoffs");
  const kettle = page.getByTestId("handoff-card").filter({ hasText: "Gooseneck electric kettle" });
  await expect(kettle.getByTestId("complete-handoff")).toBeDisabled();
  await kettle.getByTestId("ack-received").click();
  await expect(kettle.getByTestId("complete-handoff")).toBeEnabled();
  await kettle.getByTestId("complete-handoff").click();
  await expect(page.getByText("Handed off. All square.")).toBeVisible();
});

test("class swap finds the 3-way loop", async ({ page }) => {
  await signInDemo(page, "ua", "/ua/x/class-swap");
  await page.getByTestId("post-swap").click();
  await expect(page.getByTestId("swap-cycle")).toContainText("3-way swap");
  await page.getByTestId("confirm-swap").click();
  await expect(page.getByTestId("swap-cycle")).toContainText("Locked in");
});

test("guided tour walks all stops", async ({ page }) => {
  await page.goto("/demo");
  await page.getByTestId("start-tour").click();
  await expect(page.getByTestId("tour-card")).toContainText("1/16");
  for (let i = 2; i <= 16; i++) {
    await page.getByTestId("tour-next").click();
    await expect(page.getByTestId("tour-card")).toContainText(`${i}/16`);
  }
  await expect(page).toHaveURL(/\/ua\/me/);
  await page.getByTestId("tour-next").click();
  await expect(page.getByTestId("tour-card")).toHaveCount(0);
});
