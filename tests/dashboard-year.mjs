import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import assert from "node:assert/strict";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
let farm, browser;
try {
  const owner = await db.user.findUnique({
    where: { email: process.env.SEED_EMAIL },
  });
  farm = await db.farm.create({
    data: { name: "TEST year dashboard " + Date.now(), ownerId: owner.id },
  });
  const plot = await db.plot.create({
    data: {
      name: "TEST year plot",
      farmId: farm.id,
      treeCount: 200,
      treeHistories: {
        create: [
          { treeCount: 100, startDate: new Date("2026-01-01") },
          { treeCount: 200, startDate: new Date("2026-06-01") },
        ],
      },
    },
  });
  const income = await db.category.findFirst({
    where: { type: "INCOME", status: "ACTIVE" },
  });
  const expense = await db.category.findFirst({
    where: { type: "EXPENSE", status: "ACTIVE" },
  });
  await db.transaction.createMany({
    data: [
      {
        transactionDate: new Date("2026-03-01"),
        type: "INCOME",
        categoryId: income.id,
        amount: 1000,
      },
      {
        transactionDate: new Date("2026-03-02"),
        type: "EXPENSE",
        categoryId: expense.id,
        amount: 200,
      },
      {
        transactionDate: new Date("2026-09-01"),
        type: "INCOME",
        categoryId: income.id,
        amount: 2500,
      },
      {
        transactionDate: new Date("2026-09-02"),
        type: "EXPENSE",
        categoryId: expense.id,
        amount: 300,
      },
      {
        transactionDate: new Date("2025-12-31"),
        type: "INCOME",
        categoryId: income.id,
        amount: 9999,
      },
      {
        transactionDate: new Date("2027-01-01"),
        type: "INCOME",
        categoryId: income.id,
        amount: 9999,
      },
    ].map((r) => ({ ...r, farmId: farm.id, plotId: plot.id })),
  });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(process.env.SEED_EMAIL);
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL("**/dashboard");
  const q = `year=2026&farmId=${farm.id}`;
  const full = await (
    await context.request.get(
      "http://localhost:3000/api/dashboard/summary?" + q,
    )
  ).json();
  assert.deepEqual(full.summary, {
    income: 3500,
    expense: 500,
    profit: 3000,
    count: 4,
  });
  assert.deepEqual(full.summary, full.year);
  assert.equal(full.period.month, null);
  assert.equal(full.recent.length, 4);
  assert.equal(full.expenses[0].value, 500);
  assert.equal(full.plots[0].treeCount, 200);
  assert.equal(full.plots[0].incomePerTree, 17.5);
  assert.equal(full.monthly.length, 12);
  const march = await (
    await context.request.get(
      "http://localhost:3000/api/dashboard/summary?" + q + "&month=3",
    )
  ).json();
  assert.equal(march.summary.profit, 800);
  assert.equal(march.plots[0].treeCount, 100);
  const empty = await (
    await context.request.get(
      "http://localhost:3000/api/dashboard/summary?" + q + "&month=2",
    )
  ).json();
  assert.equal(empty.summary.count, 0);
  const expenses = await (
    await context.request.get(
      "http://localhost:3000/api/dashboard/summary?" + q + "&type=EXPENSE",
    )
  ).json();
  assert.equal(expenses.summary.income, 0);
  assert.equal(expenses.summary.expense, 500);
  await page.getByLabel("ปี (ค.ศ.)", { exact: true }).selectOption("2026");
  await page.getByLabel("สวน", { exact: true }).selectOption(farm.id);
  await page.getByLabel("เดือน", { exact: true }).selectOption("");
  await page
    .getByRole("heading", { name: "สรุปทั้งปี 2569", exact: true })
    .waitFor();
  await page
    .locator(".stats-grid .stat-card")
    .first()
    .getByText("3,500.00", { exact: false })
    .waitFor();
  await page.getByText("แยกตามหมวดหมู่ในปีที่เลือก", { exact: true }).waitFor();
  await page.getByLabel("เดือน", { exact: true }).selectOption("3");
  await page
    .getByRole("heading", { name: "สรุปมีนาคม 2569", exact: true })
    .waitFor();
  await page
    .locator(".stats-grid .stat-card")
    .first()
    .getByText("1,000.00", { exact: false })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "ตัวกรองข้อมูล", exact: true })
    .click();
  await page.getByLabel("เดือน", { exact: true }).selectOption("");
  await page
    .getByRole("heading", { name: "สรุปทั้งปี 2569", exact: true })
    .waitFor();
  await page
    .locator(".stats-grid .stat-card")
    .first()
    .getByText("3,500.00", { exact: false })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/plots");
  await page.getByRole("button", { name: "แก้ไข " + plot.name, exact: true }).click();
  const dialog = page.getByRole("dialog");
  const effectiveDate = dialog.getByLabel("วันที่เริ่มใช้จำนวนต้น", { exact: true });
  assert.equal(await effectiveDate.inputValue(), "");
  await effectiveDate.fill("2025-01-01");
  await dialog.getByRole("button", { name: "บันทึกข้อมูล", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const savedHistory = await db.plotTreeHistory.findUnique({
    where: { plotId_startDate: { plotId: plot.id, startDate: new Date("2025-01-01") } },
  });
  assert.equal(savedHistory.treeCount, 200);
  console.log("PASS: plot editor saves historical effective date without changing tree count");
  console.log(
    "PASS: full-year/monthly totals, year boundaries, category/plot data, historical trees, expense filter, desktop/mobile switching",
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
