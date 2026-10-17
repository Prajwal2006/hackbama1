import { expect, test } from "@playwright/test";

const SIZES = [
  { w: 375, h: 812 },
  { w: 768, h: 1024 },
  { w: 1280, h: 800 },
  { w: 1536, h: 900 },
  { w: 844, h: 390 }, // landscape phone
];
const ROUTES = ["/", "/demo", "/ua", "/ua/browse", "/ua/listing/lst_ua_fridge_galanz", "/riverbend", "/ua/x/swipe", "/ua/x/rides", "/ua/x/meals", "/ua/x/subs", "/ua/x/class-swap"];

for (const s of SIZES) {
  test(`no horizontal overflow at ${s.w}x${s.h}`, async ({ page }) => {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const r of ROUTES) {
      await page.goto(r);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${r} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
}

test("navigation adapts: tabs on phone, sidebar on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ua");
  await expect(page.locator("nav.fixed")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("aside")).toBeVisible();
  await expect(page.locator("nav.fixed")).toBeHidden();
});

test("phones can reach every feature from the menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ua");
  await page.getByTestId("mobile-menu").click();
  const sheet = page.getByRole("dialog");
  for (const name of ["Furniture Bank", "Handoffs", "Swipe", "Split subs", "Rides & trips", "Meal share", "Class swap"]) {
    await expect(sheet.getByRole("link", { name })).toBeVisible();
  }
  await sheet.getByRole("link", { name: "Class swap" }).click();
  await page.waitForURL("**/ua/x/class-swap");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("home-modules")).toHaveCount(0);
});
