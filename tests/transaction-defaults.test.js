import test from "node:test";
import assert from "node:assert/strict";
import { transactionDefaults } from "../lib/transaction-defaults.js";
const boot = {
  farms: [{ id: "f", status: "ACTIVE" }],
  plots: [{ id: "p", farmId: "f", status: "ACTIVE" }],
  categories: [{ id: "c", type: "INCOME", status: "ACTIVE" }],
};
test("stale browser selections and old dates cannot block a new transaction", () => {
  assert.deepEqual(
    transactionDefaults(
      boot,
      {
        farmId: "deleted",
        plotId: "deleted",
        categoryId: "deleted",
        transactionDate: "2020-01-01",
      },
      "2026-09-17",
    ),
    {
      transactionDate: "2026-09-17",
      type: "EXPENSE",
      farmId: "f",
      plotId: "",
      categoryId: "",
    },
  );
});
test("remember only active, compatible selections", () => {
  const result = transactionDefaults(
    boot,
    { farmId: "f", plotId: "p", categoryId: "c", type: "INCOME" },
    "2026-09-17",
  );
  assert.equal(result.plotId, "p");
  assert.equal(result.categoryId, "c");
  assert.equal(
    transactionDefaults(
      boot,
      { categoryId: "c", type: "EXPENSE" },
      "2026-09-17",
    ).categoryId,
    "",
  );
  assert.equal(
    transactionDefaults(
      { ...boot, farms: [{ id: "f", status: "INACTIVE" }] },
      { farmId: "f", plotId: "p" },
      "2026-09-17",
    ).plotId,
    "",
  );
});
