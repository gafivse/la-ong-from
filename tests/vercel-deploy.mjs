import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
nextEnv.loadEnvConfig(process.cwd());
const schema = `test_vercel_${Date.now()}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("schema", schema);
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  DIRECT_URL: url.toString(),
  NODE_ENV: "production",
  RENDER: "",
  VERCEL: "1",
  RENDER_EXTERNAL_URL: "",
  APP_ORIGIN: "https://farm-deploy-test.vercel.app",
  SEED_EMAIL: "Vercel-Test@farm.local",
  SEED_PASSWORD: "VercelTestOnly!58319",
  PORT: "3012",
};
const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
let server;
function run(file, args, overrides = {}) {
  const result = spawnSync(process.execPath, [file, ...args], {
    env: { ...env, ...overrides },
    encoding: "utf8",
  });
  return result;
}
try {
  const migrate = run("node_modules/prisma/build/index.js", [
    "migrate",
    "deploy",
  ]);
  assert.equal(migrate.status, 0, migrate.stderr);
  const badSeed = run("prisma/seed.js", [], { SEED_PASSWORD: "ChangeMe123!" });
  assert.notEqual(badSeed.status, 0);
  for (let i = 0; i < 2; i++) {
    const seed = run("prisma/seed.js", []);
    assert.equal(seed.status, 0, seed.stderr);
  }
  assert.equal(await db.user.count(), 1);
  assert.equal(await db.transaction.count(), 0);
  const owner = await db.user.findUnique({
    where: { email: env.SEED_EMAIL.toLowerCase() },
  });
  assert(await bcrypt.compare(env.SEED_PASSWORD, owner.password));
  const again = run("prisma/seed.js", [], {
    SEED_PASSWORD: "DifferentPassword123!",
  });
  assert.equal(again.status, 0, again.stderr);
  assert.equal(
    (await db.user.findUnique({ where: { id: owner.id } })).password,
    owner.password,
  );
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"],
    { env, stdio: "ignore" },
  );
  const base = "http://127.0.0.1:3012";
  let healthy = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(base + "/api/health");
      if (r.status === 200) {
        healthy = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(healthy, "public health check must work without login");
  const request = (origin) =>
    fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        email: env.SEED_EMAIL,
        password: env.SEED_PASSWORD,
      }),
    });
  assert.equal((await request("https://wrong.example")).status, 403);
  const login = await request(env.APP_ORIGIN);
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /; Secure/i);
  assert.match(login.headers.get("set-cookie"), /; HttpOnly/i);
  console.log(
    "PASS: fresh migration, seed twice, preserved password, rejected default password, public health, Vercel origin and Secure cookie",
  );
} finally {
  if (server && server.exitCode === null) {
    const closed = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await closed;
  }
  // This schema is generated above solely for this test; never the real farm schema.
  assert.match(schema, /^test_vercel_\d+$/);
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
}
