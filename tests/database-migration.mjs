import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import assert from "node:assert/strict";
nextEnv.loadEnvConfig(process.cwd());
const sourceUrl = new URL(process.env.DATABASE_URL);
const targetUrl = new URL(process.env.DATABASE_URL);
sourceUrl.pathname = "/postgres";
targetUrl.pathname = "/farm_2569";
const source = new PrismaClient({
  datasources: { db: { url: sourceUrl.toString() } },
});
const target = new PrismaClient({
  datasources: { db: { url: targetUrl.toString() } },
});
try {
  for (const table of [
    "User",
    "CropType",
    "Farm",
    "Plot",
    "Category",
    "Unit",
    "Transaction",
    "PlotTreeHistory",
    "_prisma_migrations",
    ...(process.argv.includes("--skip-sessions") ? [] : ["Session"]),
  ]) {
    const sql = `SELECT row_to_json(t)::text AS data FROM farm_ledger."${table}" t ORDER BY id`;
    const [a, b] = await Promise.all([
      source.$queryRawUnsafe(sql),
      target.$queryRawUnsafe(sql),
    ]);
    assert.deepEqual(b, a, `Data mismatch in ${table}`);
    console.log(`PASS ${table}: ${a.length} rows, all field values identical`);
  }
  console.log("PASS source postgres -> target farm_2569");
} finally {
  await Promise.all([source.$disconnect(), target.$disconnect()]);
}
