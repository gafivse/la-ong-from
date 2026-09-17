import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto("http://localhost:3000/transactions");
  await page.waitForURL("**/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(process.env.SEED_EMAIL);
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await page
    .getByRole("heading", { name: "ภาพรวมบัญชี", exact: true })
    .waitFor();
  for (const [name, path] of [
    ["รายรับ–รายจ่าย", "transactions"],
    ["ข้อมูลสวน", "farms"],
    ["ข้อมูลแปลง", "plots"],
    ["รายงานและวิเคราะห์", "reports"],
    ["ตั้งค่า", "settings"],
    ["นำเข้าข้อมูล", "import"],
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await page.waitForURL("**/" + path);
    await page.getByRole("heading", { name, exact: true }).waitFor();
  }
  await page.goto("http://localhost:3000/reports/yearly-by-plot");
  await page
    .getByRole("heading", { name: "รายปีแยกแปลง / ต้นทุนต่อต้น", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "รายปีแยกแปลง / ต้นทุนต่อต้น", exact: true })
    .waitFor();
  await page.goto("http://localhost:3000/settings/units");
  await page.getByRole("heading", { name: /หน่วยทั้งหมด/ }).waitFor();
  await page.getByRole("link", { name: "ภาพรวมบัญชี", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await page.evaluate(() => document.fonts.ready);
  assert.match(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily),
    /prompt/i,
  );
  assert.ok(
    await page.evaluate(() =>
      [...document.fonts].some(
        (f) => /prompt/i.test(f.family) && f.status === "loaded",
      ),
    ),
  );
  await page.evaluate(() => localStorage.setItem("farm-text-scale", "1.45"));
  await page.reload();
  await page
    .getByRole("heading", { name: "ภาพรวมบัญชี", exact: true })
    .waitFor();
  await page
    .getByRole("heading", { name: "แนวโน้มรายรับ–รายจ่าย", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.getByRole("group", { name: "ขนาดตัวหนังสือ" }).count(),
    0,
  );
  assert.equal(
    await page.evaluate(() =>
      parseFloat(getComputedStyle(document.body).fontSize),
    ),
    16.2,
  );
  const profile = page.getByRole("button", { name: "โปรไฟล์", exact: true });
  assert.equal(
    await page
      .getByRole("menuitem", { name: "ออกจากระบบ", exact: true })
      .count(),
    0,
  );
  await profile.click();
  await page.getByRole("menu", { name: "เมนูโปรไฟล์" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await profile.getAttribute("aria-expanded"), "false");
  assert.equal(
    await profile.evaluate((e) => e === document.activeElement),
    true,
  );
  await profile.click();
  await page.locator("h1").click();
  assert.equal(await profile.getAttribute("aria-expanded"), "false");
  await profile.focus();
  await page.keyboard.press("ArrowDown");
  await page
    .getByRole("menuitem", { name: "ออกจากระบบ", exact: true })
    .waitFor();
  await page.screenshot({
    path: "test-results/routes-font-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "profile menu should fit mobile viewport",
  );
  await page.screenshot({
    path: "test-results/routes-font-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .locator("header")
    .getByRole("menuitem", { name: "ออกจากระบบ", exact: true })
    .click();
  await page.waitForURL("**/login");
  assert.equal(
    await page.evaluate(async () => (await fetch("/api/auth/me")).status),
    401,
  );
  await page.goto("http://localhost:3000/transactions");
  await page.waitForURL("**/login");
  console.log(
    "PASS: routes, Prompt, smaller CSS typography ignores old saved scale, profile menu keyboard/outside dismissal, mobile layout and logout invalidates session",
  );
} finally {
  await browser.close();
}
