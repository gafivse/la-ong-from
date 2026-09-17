import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { mkdir } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000");
  await page.waitForURL("**/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(process.env.SEED_EMAIL);
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  try {
    await page
      .getByRole("heading", { name: "ภาพรวมบัญชี", exact: true })
      .waitFor();
  } catch (e) {
    console.log(await page.locator("body").innerText());
    console.log(errors);
    throw e;
  }
  await page.getByRole("heading", { name: "แนวโน้มรายรับ–รายจ่าย" }).waitFor();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "เพิ่มรายการ", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByLabel("ราคาต่อหน่วย", { exact: true }).fill("6.50");
  await page.getByLabel("จำนวน / น้ำหนัก", { exact: true }).fill("580");
  await page.getByLabel("จำนวนเงิน (บาท) *", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("จำนวนเงิน (บาท) *", { exact: true }).inputValue(),
    "3770.00",
  );
  await page.getByLabel("จำนวนเงิน (บาท) *", { exact: true }).fill("3800");
  assert.equal(
    await page.getByLabel("จำนวนเงิน (บาท) *", { exact: true }).inputValue(),
    "3800",
  );
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await page
    .getByRole("link", { name: "รายงานและวิเคราะห์", exact: true })
    .click();
  await page
    .getByRole("button", { name: "รายปีแยกแปลง / ต้นทุนต่อต้น", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "รายปีแยกแปลง / ต้นทุนต่อต้น", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await page.getByRole("link", { name: "ภาพรวมบัญชี", exact: true }).click();
  await page.getByRole("heading", { name: "แนวโน้มรายรับ–รายจ่าย" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "mobile must not overflow",
  );
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "ตัวกรองข้อมูล", exact: true })
    .click();
  await page
    .locator(".filters.show select")
    .first()
    .waitFor({ state: "visible" });
  await page.locator(".fab").click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "test-results/transaction-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  assert.deepEqual(errors, [], "no browser exceptions");
  console.log(
    "PASS: desktop/mobile login, charts, navigation, filters, transaction calculation and manual override, modal, no horizontal overflow or JS errors",
  );
} finally {
  await browser.close();
}
