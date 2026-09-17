import test from "node:test";
import assert from "node:assert/strict";
import { totals, monthly, byPlot } from "../lib/reports.js";
import { schemas } from "../lib/validation.js";
test("money sums in cents and allows a loss", () =>
  assert.deepEqual(
    totals([
      { type: "INCOME", amount: "0.10" },
      { type: "INCOME", amount: "0.20" },
      { type: "EXPENSE", amount: "0.40" },
    ]),
    { income: 0.3, expense: 0.4, profit: -0.1, count: 3 },
  ));
test("monthly keeps twelve months and excludes other years", () => {
  const r = monthly(
    [
      { type: "INCOME", amount: 3770, transactionDate: "2026-03-21" },
      { type: "EXPENSE", amount: 580, transactionDate: "2026-03-21" },
      { type: "INCOME", amount: 999, transactionDate: "2025-03-21" },
    ],
    2026,
  );
  assert.equal(r.length, 12);
  assert.equal(r[2].profit, 3190);
  assert.equal(r[1].profit, 0);
});
test("historical trees and unallocated farm expenses remain visible", () => {
  const plots = [
    {
      id: "p",
      name: "A",
      treeCount: 300,
      treeHistories: [
        { startDate: "2025-01-01", treeCount: 140 },
        { startDate: "2026-06-01", treeCount: 300 },
      ],
    },
  ];
  const rows = [
    { plotId: "p", type: "INCOME", amount: 1400 },
    { plotId: null, type: "EXPENSE", amount: 100 },
  ];
  const result = byPlot(rows, plots, new Date("2026-03-31"));
  assert.equal(result[0].treeCount, 140);
  assert.equal(result[0].incomePerTree, 10);
  assert.equal(result[1].expense, 100);
  assert.equal(result[1].profitPerTree, null);
});
test("zero trees are undefined per-tree amounts", () =>
  assert.equal(
    byPlot([], [{ id: "a", name: "A", treeCount: 0 }], new Date())[0]
      .expensePerTree,
    null,
  ));
test("reject impossible dates and negative or sub-cent amounts", () => {
  const base = {
    transactionDate: "2026-02-28",
    type: "INCOME",
    farmId: "a",
    categoryId: "c",
    amount: 3770,
  };
  assert.equal(schemas.transactions.parse(base).amount, 3770);
  for (const change of [
    { transactionDate: "2026-02-30" },
    { amount: -1 },
    { amount: 0 },
    { amount: 1.001 },
    { amount: "Infinity" },
  ])
    assert.equal(
      schemas.transactions.safeParse({ ...base, ...change }).success,
      false,
    );
});
