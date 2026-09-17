import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
let cookie = "";
const created = { transactions: [], plots: [], farms: [], users: [] };
async function call(path, method = "GET", body, expected = 200, auth = cookie) {
  const res = await fetch(base + "/api/" + path, {
    method,
    headers: { "Content-Type": "application/json", Cookie: auth },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  assert.equal(
    res.status,
    expected,
    `${method} ${path}: ${JSON.stringify(json)}`,
  );
  return { data: json, response: res };
}
try {
  await call("bootstrap", "GET", null, 401, "");
  const login = await call("auth/login", "POST", {
    email: process.env.SEED_EMAIL,
    password: process.env.SEED_PASSWORD,
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  const { data: b } = await call("bootstrap");
  assert.equal(b.user.role, "OWNER");
  const create = async (r, data) => {
    const result = await call(r, "POST", data, 201);
    created[r].push(result.data.id);
    return result.data;
  };
  const f = await create("farms", {
    name: "TEST integration " + Date.now(),
    cropTypeId: b.cropTypes[0].id,
  });
  const f2 = await create("farms", { name: "TEST second " + Date.now() });
  const p = await create("plots", {
    name: "TEST plot",
    farmId: f.id,
    treeCount: 140,
    effectiveDate: "2026-01-01",
  });
  const income = b.categories.find((c) => c.type === "INCOME"),
    expense = b.categories.find((c) => c.type === "EXPENSE");
  await call("plots/" + p.id, "PUT", {
    name: p.name,
    farmId: f.id,
    treeCount: 140,
    effectiveDate: "2025-01-01",
  });
  assert.equal(
    (await call("reports/yearly-by-plot?year=2025&farmId=" + f.id)).data[0]
      .treeCount,
    140,
    "same-count effective date must be saved for historical reports",
  );
  const historyCount = await db.plotTreeHistory.count({
    where: { plotId: p.id },
  });
  await call("plots/" + p.id, "PUT", {
    name: p.name,
    farmId: f.id,
    treeCount: 140,
  });
  assert.equal(
    await db.plotTreeHistory.count({ where: { plotId: p.id } }),
    historyCount,
  );
  const common = { transactionDate: "2026-03-21", farmId: f.id, plotId: p.id };
  const t = await create("transactions", {
    ...common,
    type: "INCOME",
    categoryId: income.id,
    unitPrice: 6.5,
    quantity: 580,
    amount: 3770,
    description: "TEST income",
  });
  await create("transactions", {
    ...common,
    type: "EXPENSE",
    categoryId: expense.id,
    amount: 580,
  });
  await call(
    "transactions",
    "POST",
    {
      ...common,
      farmId: f2.id,
      type: "INCOME",
      categoryId: income.id,
      amount: 100,
    },
    400,
  );
  await call(
    "transactions",
    "POST",
    { ...common, type: "INCOME", categoryId: expense.id, amount: 100 },
    400,
  );
  await call(
    "transactions",
    "POST",
    { ...common, type: "INCOME", categoryId: income.id, amount: -1 },
    400,
  );
  const q = `year=2026&month=3&farmId=${f.id}`;
  assert.equal((await call("dashboard/summary?" + q)).data.month.profit, 3190);
  assert.equal((await call("reports/monthly?" + q)).data[2].profit, 3190);
  assert.equal(
    (await call("reports/yearly-by-plot?" + q)).data[0].incomePerTree,
    3770 / 140,
  );
  await call("plots/" + p.id, "PUT", {
    name: p.name,
    farmId: f.id,
    treeCount: 300,
    effectiveDate: "2026-06-01",
  });
  assert.equal(
    (await call("reports/yearly-by-plot?" + q)).data[0].treeCount,
    140,
  );
  assert.equal(
    (await call("reports/yearly-by-plot?year=2026&farmId=" + f.id)).data[0]
      .treeCount,
    300,
  );
  await call("farms/" + f.id, "DELETE", null, 409);
  const before = (await call("transactions?" + q)).data.count;
  await call(
    "import",
    "POST",
    {
      rows: [
        { ...common, type: "INCOME", categoryId: income.id, amount: 200 },
        { ...common, type: "INCOME", categoryId: income.id, amount: -200 },
      ],
    },
    400,
  );
  assert.equal(
    (await call("transactions?" + q)).data.count,
    before,
    "failed import must roll back all rows",
  );
  const exported = await fetch(base + "/api/export?" + q, {
    headers: { Cookie: cookie },
  });
  assert.equal(exported.status, 200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await exported.arrayBuffer()));
  assert.equal(wb.worksheets[0].rowCount, 3);
  const viewer = await create("users", {
    name: "TEST viewer",
    email: `test-${Date.now()}@farm.local`,
    password: "TestViewer123!",
    role: "VIEWER",
  });
  const viewerLogin = await call("auth/login", "POST", {
    email: viewer.email,
    password: "TestViewer123!",
  });
  const vc = viewerLogin.response.headers.get("set-cookie").split(";")[0];
  await call(
    "transactions",
    "POST",
    { ...common, type: "INCOME", categoryId: income.id, amount: 100 },
    403,
    vc,
  );
  await call("users", "GET", null, 403, vc);
  const staff = await create("users", {
    name: "TEST staff",
    email: `staff-${Date.now()}@farm.local`,
    password: "TestStaff123!",
    role: "STAFF",
  });
  const staffLogin = await call("auth/login", "POST", {
    email: staff.email,
    password: "TestStaff123!",
  });
  const sc = staffLogin.response.headers.get("set-cookie").split(";")[0];
  await call("farms", "POST", { name: "Denied" }, 403, sc);
  await call("transactions/" + t.id, "PUT", {
    ...common,
    type: "INCOME",
    categoryId: income.id,
    amount: 4000,
  });
  assert.equal((await call("dashboard/summary?" + q)).data.month.profit, 3420);
  await call("auth/logout", "POST");
  await call("bootstrap", "GET", null, 401);
  console.log(
    "PASS: login/logout, CRUD, relational validation, reports, tree history, atomic import, Excel export, viewer/staff permissions",
  );
} finally {
  await db.transaction.deleteMany({ where: { farmId: { in: created.farms } } });
  await db.plot.deleteMany({ where: { id: { in: created.plots } } });
  await db.farm.deleteMany({ where: { id: { in: created.farms } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
}
