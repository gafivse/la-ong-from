import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import assert from "node:assert/strict";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
let browser;
let farm;
try {
  const owner = await db.user.findUnique({
    where: { email: process.env.SEED_EMAIL },
  });
  const crop = await db.cropType.findUnique({ where: { code: "PALM" } });
  farm = await db.farm.create({
    data: {
      name: "TEST สวนทดสอบหน้าจอ",
      ownerId: owner.id,
      cropTypeId: crop.id,
    },
  });
  const plot = await db.plot.create({
    data: {
      name: "TEST แปลงหนึ่ง",
      farmId: farm.id,
      treeCount: 140,
      treeHistories: {
        create: { treeCount: 140, startDate: new Date("2020-01-01") },
      },
    },
  });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto("http://localhost:3000");
  await page.waitForURL("**/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(process.env.SEED_EMAIL);
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page
    .getByRole("heading", { name: "ภาพรวมบัญชี", exact: true })
    .waitFor();
  await page.evaluate(() =>
    localStorage.setItem(
      "farm-last-v1",
      JSON.stringify({
        farmId: "deleted-farm",
        plotId: "deleted-plot",
        categoryId: "deleted-category",
        transactionDate: "2020-01-01",
      }),
    ),
  );
  await page
    .getByRole("button", { name: "เพิ่มรายการ", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  assert.equal(
    await dialog.getByLabel("แปลง", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await dialog.getByLabel("หมวดหมู่ *", { exact: true }).inputValue(),
    "",
  );
  await dialog.getByRole("button", { name: "รายรับ", exact: true }).click();
  await dialog.getByLabel("สวน *", { exact: true }).selectOption(farm.id);
  await dialog.getByLabel("แปลง", { exact: true }).selectOption(plot.id);
  await dialog
    .getByLabel("หมวดหมู่ *", { exact: true })
    .selectOption({ label: "ขายผลปาล์ม" });
  await dialog.getByLabel("ราคาต่อหน่วย", { exact: true }).fill("6.5");
  await dialog.getByLabel("จำนวน / น้ำหนัก", { exact: true }).fill("580");
  await dialog
    .getByLabel("รายละเอียด", { exact: true })
    .fill("ทดสอบขายผลปาล์ม");
  await dialog
    .getByRole("button", { name: "บันทึกข้อมูล", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByRole("status")
    .filter({ hasText: "บันทึกข้อมูลเรียบร้อยแล้ว" })
    .waitFor();
  const txn = await db.transaction.findFirst({ where: { farmId: farm.id } });
  assert.equal(Number(txn.amount), 3770);
  assert.equal(txn.plotId, plot.id);
  await page.getByRole("link", { name: "รายรับ–รายจ่าย", exact: true }).click();
  await page.getByText("ทดสอบขายผลปาล์ม", { exact: false }).waitFor();
  await page
    .locator("tr")
    .filter({ hasText: "ทดสอบขายผลปาล์ม" })
    .getByRole("button", { name: "แก้ไขรายการ", exact: true })
    .click();
  await dialog.getByLabel("จำนวนเงิน (บาท) *", { exact: true }).fill("3800");
  await dialog
    .getByRole("button", { name: "บันทึกข้อมูล", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    Number((await db.transaction.findUnique({ where: { id: txn.id } })).amount),
    3800,
  );
  await page.getByRole("link", { name: "นำเข้าข้อมูล", exact: true }).click();
  const date = new Date().toISOString().slice(0, 10);
  const csv = `วันที่,ประเภท,สวน,แปลง,หมวดหมู่,จำนวนเงิน\r\n${date},รายจ่าย,${farm.name},${plot.name},ปุ๋ย,500\r\n`;
  await page.getByLabel("เลือกไฟล์นำเข้า", { exact: true }).setInputFiles({
    name: "test.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("\uFEFF" + csv),
  });
  await page
    .getByRole("button", { name: "ยืนยันนำเข้า 1 รายการ", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "นำเข้า 1 รายการเรียบร้อยแล้ว" })
    .waitFor();
  assert.equal(await db.transaction.count({ where: { farmId: farm.id } }), 2);
  await page.getByRole("link", { name: "ภาพรวมบัญชี", exact: true }).click();
  await page
    .getByRole("heading", { name: "เปรียบเทียบผลประกอบการแต่ละแปลง" })
    .waitFor();
  await page.screenshot({
    path: "test-results/dashboard-with-data.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await page.getByRole("link", { name: "รายรับ–รายจ่าย", exact: true }).click();
  await page.getByText("ทดสอบขายผลปาล์ม", { exact: false }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "test-results/transactions-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  console.log(
    "PASS: UI saves income, edits manual amount, imports CSV after preview, displays plot chart and mobile transaction cards",
  );
} finally {
  if (browser) await browser.close();
  if (farm) {
    await db.transaction.deleteMany({ where: { farmId: farm.id } });
    await db.plot.deleteMany({ where: { farmId: farm.id } });
    await db.farm.delete({ where: { id: farm.id } });
  }
  await db.$disconnect();
}
