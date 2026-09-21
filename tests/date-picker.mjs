import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    locale: "en-US",
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on(
    "pageerror",
    (error) => (errors.push(error.message), console.log(error.message)),
  );
  // Keep this UI regression independent of database accounts and real records.
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const json =
      path === "/api/bootstrap"
        ? {
            user: { id: "test-owner", name: "Date picker test", role: "OWNER" },
            farms: [{ id: "test-farm", name: "Test farm", status: "ACTIVE" }],
            categories: [
              {
                id: "test-category",
                name: "Test expense",
                type: "EXPENSE",
                status: "ACTIVE",
              },
            ],
            plots: [],
            cropTypes: [],
            units: [],
          }
        : { rows: [], count: 0 };
    return route.fulfill({ json });
  });
  await page.goto(
    `${process.env.TEST_BASE_URL || "http://localhost:3000"}/transactions`,
  );
  await page
    .getByRole("button", { name: "เพิ่มรายการ", exact: true })
    .first()
    .click();
  const editor = page.locator("#editor-dialog");
  const date = editor.locator(".mui-date-field input");
  await date.fill("17/09/2026");
  await date.press("Tab");
  assert.equal((await date.inputValue()).replace(/\u200e/g, ""), "17/09/2026");
  await editor.getByRole("button", { name: "เลือกวันที่จากปฏิทิน" }).click();
  const calendar = page.locator("[data-farm-date-picker]");
  await calendar.waitFor();
  await calendar.getByRole("gridcell", { name: "25", exact: true }).click();
  assert.equal((await date.inputValue()).replace(/\u200e/g, ""), "25/09/2026");
  await editor.getByRole("button", { name: "เลือกวันที่จากปฏิทิน" }).click();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    animations: "disabled",
    path: "test-results/mui-date-picker-desktop.png",
  });
  await page.keyboard.press("Escape");
  assert.equal(
    await editor.isVisible(),
    true,
    "Escape closes the calendar, not the editor",
  );
  await date.fill("31/04/2026");
  await date.press("Tab");
  assert.equal(await date.evaluate((el) => el.checkValidity()), false);
  await date.fill("29/02/2028");
  await date.press("Tab");
  assert.equal(await date.evaluate((el) => el.checkValidity()), true);
  await date.fill("");
  assert.equal(await date.evaluate((el) => el.checkValidity()), false);
  await date.fill("21/09/2026");
  await date.press("Tab");
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.getByRole("button", { name: "เลือกวันที่จากปฏิทิน" }).click();
  await calendar.waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const bounds = await calendar.locator(".MuiDateCalendar-root").boundingBox();
  assert.ok(
    bounds.x >= 0 && bounds.x + bounds.width <= 390,
    "calendar fits mobile viewport",
  );
  await page.screenshot({
    animations: "disabled",
    path: "test-results/mui-date-picker-mobile.png",
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS MUI day-first typing, calendar selection, Escape, invalid dates, leap day, required date and mobile layout",
  );
} finally {
  await browser.close();
}
