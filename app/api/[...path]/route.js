import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../../../lib/db.js";
import { schemas } from "../../../lib/validation.js";
import { totals, monthly, byPlot } from "../../../lib/reports.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const models = {
  farms: "farm",
  plots: "plot",
  categories: "category",
  "crop-types": "cropType",
  units: "unit",
  transactions: "transaction",
  users: "user",
};
const safeUser = { id: true, email: true, name: true, role: true };
const include = { farm: true, plot: true, category: true, unit: true };
const hash = (token) => createHash("sha256").update(token).digest("hex");
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const loginAttempts = new Map();

async function userSession() {
  const token = (await cookies()).get("farm_session")?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hash(token) },
    include: { user: { select: safeUser } },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
function filters(q, { ignoreYear = false, ignoreMonth = false } = {}) {
  const where = {};
  for (const k of ["farmId", "plotId", "type", "categoryId"])
    if (q.get(k)) where[k] = q.get(k);
  if (where.type && !["INCOME", "EXPENSE"].includes(where.type))
    fail("ประเภทรายการไม่ถูกต้อง");
  if (q.get("cropTypeId"))
    where.OR = [
      { plot: { cropTypeId: q.get("cropTypeId") } },
      { plot: { cropTypeId: null, farm: { cropTypeId: q.get("cropTypeId") } } },
      { plotId: null, farm: { cropTypeId: q.get("cropTypeId") } },
    ];
  const year = Number(q.get("year") || new Date().getFullYear()),
    month = Number(q.get("month") || 0);
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2200 ||
    !Number.isInteger(month) ||
    month < 0 ||
    month > 12
  )
    fail("ปีหรือเดือนไม่ถูกต้อง");
  if (!ignoreYear)
    where.transactionDate = {
      gte: new Date(Date.UTC(year, !ignoreMonth && month ? month - 1 : 0, 1)),
      lt: new Date(
        Date.UTC(
          year + (!ignoreMonth && month ? 0 : 1),
          !ignoreMonth && month ? month : 0,
          1,
        ),
      ),
    };
  if (q.get("search"))
    where.AND = [
      {
        OR: ["description", "remark", "referenceNo"].map((k) => ({
          [k]: { contains: q.get("search"), mode: "insensitive" },
        })),
      },
    ];
  return where;
}
async function related(data, resource, client = db) {
  for (const [key, model] of [
    ["farmId", "farm"],
    ["plotId", "plot"],
    ["categoryId", "category"],
    ["unitId", "unit"],
    ["cropTypeId", "cropType"],
  ])
    if (data[key]) {
      const row = await client[model].findUnique({ where: { id: data[key] } });
      if (!row || row.status !== "ACTIVE")
        fail("ข้อมูลที่เลือกไม่พบหรือถูกปิดใช้งาน");
      if (key === "plotId" && row.farmId !== data.farmId)
        fail("แปลงไม่อยู่ในสวนที่เลือก");
      if (key === "categoryId" && row.type !== data.type)
        fail("หมวดหมู่ไม่ตรงกับประเภทรายการ");
    }
}
async function save(resource, id, input, user, client = db) {
  const model = models[resource];
  const data = schemas[resource].parse(input);
  const existing = id
    ? await client[model].findUnique({ where: { id } })
    : null;
  if (id && !existing) fail("ไม่พบข้อมูล", 404);
  await related(data, resource, client);
  if (resource === "users") {
    if (existing?.role === "OWNER" && user.role !== "OWNER")
      fail("เฉพาะเจ้าของที่แก้ไขเจ้าของได้", 403);
    if (data.role === "OWNER" && user.role !== "OWNER")
      fail("ไม่มีสิทธิ์ตั้งเจ้าของ", 403);
    if (existing?.id === user.id && data.role !== existing.role)
      fail("ไม่สามารถเปลี่ยนสิทธิ์ของตนเอง");
    if (!id && !data.password) fail("กรุณาระบุรหัสผ่าน");
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
  }
  if (
    resource === "categories" &&
    existing &&
    existing.type !== data.type &&
    (await client.transaction.count({ where: { categoryId: id } }))
  )
    fail("หมวดที่มีรายการแล้วไม่สามารถเปลี่ยนประเภทได้");
  if (
    resource === "plots" &&
    existing &&
    existing.farmId !== data.farmId &&
    (await client.transaction.count({ where: { plotId: id } }))
  )
    fail("แปลงที่มีรายการแล้วไม่สามารถย้ายสวนได้");
  const effectiveDate = data.effectiveDate;
  delete data.effectiveDate;
  if (resource === "farms" && !id) data.ownerId = user.id;
  const row = id
    ? await client[model].update({ where: { id }, data })
    : await client[model].create({ data });
  if (
    resource === "plots" &&
    (!existing || existing.treeCount !== row.treeCount || effectiveDate)
  ) {
    if (existing && !effectiveDate) fail("กรุณาระบุวันที่เริ่มใช้จำนวนต้น");
    await client.plotTreeHistory.upsert({
      where: {
        plotId_startDate: {
          plotId: row.id,
          startDate:
            effectiveDate ||
            row.plantedDate ||
            new Date(new Date().toISOString().slice(0, 10)),
        },
      },
      update: { treeCount: row.treeCount },
      create: {
        plotId: row.id,
        treeCount: row.treeCount,
        startDate:
          effectiveDate ||
          row.plantedDate ||
          new Date(new Date().toISOString().slice(0, 10)),
      },
    });
  }
  if (resource === "users") {
    if (id) await client.session.deleteMany({ where: { userId: id } });
    const { password, ...safe } = row;
    return safe;
  }
  return row;
}
async function report(kind, q) {
  const year = Number(q.get("year") || new Date().getFullYear());
  const allYears = kind === "yearly";
  const rows = await db.transaction.findMany({
    where: filters(q, {
      ignoreYear: allYears,
      ignoreMonth: kind === "monthly" || kind === "monthly-by-plot",
    }),
    include,
  });
  const plots = await db.plot.findMany({
    where: {
      ...(q.get("farmId") ? { farmId: q.get("farmId") } : {}),
      ...(q.get("plotId") ? { id: q.get("plotId") } : {}),
      ...(q.get("cropTypeId")
        ? {
            OR: [
              { cropTypeId: q.get("cropTypeId") },
              { cropTypeId: null, farm: { cropTypeId: q.get("cropTypeId") } },
            ],
          }
        : {}),
    },
    include: { treeHistories: true },
  });
  if (kind === "monthly") return monthly(rows, year);
  if (kind === "yearly")
    return [
      ...new Set([
        ...rows.map((r) => r.transactionDate.getUTCFullYear()),
        year,
      ]),
    ]
      .sort()
      .map((y) => ({
        year: y,
        ...totals(rows.filter((r) => r.transactionDate.getUTCFullYear() === y)),
      }));
  if (kind === "monthly-by-plot")
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      plots: byPlot(
        rows.filter((r) => r.transactionDate.getUTCMonth() === i),
        plots,
        new Date(Date.UTC(year, i + 1, 0)),
      ),
    }));
  if (kind === "yearly-by-plot")
    return byPlot(
      rows,
      plots,
      new Date(Date.UTC(year, Number(q.get("month") || 12), 0)),
    );
  fail("ไม่พบรายงาน", 404);
}
async function handler(req, ctx) {
  try {
    const { path = [] } = await ctx.params;
    const [resource, id] = path;
    const q = new URL(req.url).searchParams;
    if (req.method !== "GET") {
      const origin = req.headers.get("origin");
      const appOrigin =
        process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
      if (
        origin &&
        (appOrigin
          ? origin !== appOrigin
          : new URL(origin).host !== req.headers.get("host"))
      )
        fail("Origin ไม่ถูกต้อง", 403);
    }
    if (resource === "auth" && id === "login" && req.method === "POST") {
      const { email, password } = await req.json();
      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        password.length > 100
      )
        fail("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
      const key = email.toLowerCase();
      const now = Date.now();
      if (loginAttempts.size > 10000)
        for (const [k, v] of loginAttempts)
          if (v.until < now) loginAttempts.delete(k);
      const attempt = loginAttempts.get(key);
      if (attempt?.until > now && attempt.count >= 8)
        fail("ลองหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
      const user = await db.user.findUnique({ where: { email: key } });
      if (!user?.password || !(await bcrypt.compare(password, user.password))) {
        loginAttempts.set(key, {
          count: (attempt?.until > now ? attempt.count : 0) + 1,
          until: now + 900000,
        });
        fail("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
      }
      loginAttempts.delete(key);
      const token = randomBytes(32).toString("hex");
      await db.session.create({
        data: {
          id: hash(token),
          userId: user.id,
          expiresAt: new Date(now + 86400000 * 7),
        },
      });
      (await cookies()).set("farm_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.VERCEL === "1" ||
          process.env.RENDER === "true" ||
          new URL(req.url).protocol === "https:",
        path: "/",
        maxAge: 604800,
      });
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }
    const user = await userSession();
    if (!user) fail("กรุณาเข้าสู่ระบบ", 401);
    if (resource === "auth" && id === "me") return NextResponse.json(user);
    if (resource === "auth" && id === "logout" && req.method === "POST") {
      const jar = await cookies();
      const token = jar.get("farm_session")?.value;
      if (token) await db.session.deleteMany({ where: { id: hash(token) } });
      jar.delete("farm_session");
      return NextResponse.json({ ok: true });
    }
    if (resource === "health") {
      await db.$queryRaw`SELECT 1`;
      return NextResponse.json({ status: "OK" });
    }
    if (req.method !== "GET" && user.role === "VIEWER")
      fail("ผู้ดูมีสิทธิ์อ่านข้อมูลเท่านั้น", 403);
    if (
      (resource === "users" ||
        (req.method !== "GET" &&
          !["transactions", "import"].includes(resource))) &&
      !["OWNER", "ADMIN"].includes(user.role)
    )
      fail("ต้องมีสิทธิ์ผู้ดูแลระบบ", 403);
    if (resource === "bootstrap" && req.method === "GET") {
      const [farms, plots, categories, cropTypes, units] = await Promise.all([
        db.farm.findMany({ orderBy: { name: "asc" } }),
        db.plot.findMany({
          include: {
            farm: true,
            cropType: true,
            treeHistories: { orderBy: { startDate: "desc" } },
          },
          orderBy: { name: "asc" },
        }),
        db.category.findMany({ orderBy: { name: "asc" } }),
        db.cropType.findMany({ orderBy: { name: "asc" } }),
        db.unit.findMany({ orderBy: { name: "asc" } }),
      ]);
      return NextResponse.json({
        user,
        farms,
        plots,
        categories,
        cropTypes,
        units,
      });
    }
    if (resource === "dashboard" && id === "summary" && req.method === "GET") {
      const rows = await db.transaction.findMany({
        where: filters(q, { ignoreMonth: true }),
        include,
        orderBy: { transactionDate: "desc" },
      });
      // No month (or month=0) means the complete selected calendar year.
      const month = Number(q.get("month") || 0);
      const selected = month
        ? rows.filter((r) => r.transactionDate.getUTCMonth() + 1 === month)
        : rows;
      const expenses = Object.values(
        selected
          .filter((r) => r.type === "EXPENSE")
          .reduce((a, r) => {
            const c = (a[r.categoryId] ||= { name: r.category.name, value: 0 });
            c.value += Math.round(Number(r.amount) * 100);
            return a;
          }, {}),
      ).map((r) => ({ ...r, value: r.value / 100 }));
      const plotRows = await db.plot.findMany({
        where: {
          ...(q.get("farmId") ? { farmId: q.get("farmId") } : {}),
          ...(q.get("plotId") ? { id: q.get("plotId") } : {}),
          ...(q.get("cropTypeId")
            ? {
                OR: [
                  { cropTypeId: q.get("cropTypeId") },
                  {
                    cropTypeId: null,
                    farm: { cropTypeId: q.get("cropTypeId") },
                  },
                ],
              }
            : {}),
        },
        include: { treeHistories: true },
      });
      return NextResponse.json({
        period: {
          year: Number(q.get("year") || new Date().getFullYear()),
          month: month || null,
        },
        summary: totals(selected),
        month: totals(selected),
        year: totals(rows),
        monthly: monthly(
          rows,
          Number(q.get("year") || new Date().getFullYear()),
        ),
        expenses,
        plots: byPlot(
          selected,
          plotRows,
          new Date(
            Date.UTC(
              Number(q.get("year") || new Date().getFullYear()),
              month || 12,
              0,
            ),
          ),
        ),
        recent: selected.slice(0, 6),
      });
    }
    if (resource === "reports" && req.method === "GET")
      return NextResponse.json(await report(id, q));
    if (resource === "export" && req.method === "GET") {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("บัญชีสวน");
      let rows;
      if (q.get("report")) {
        const result = await report(q.get("report"), q);
        rows =
          q.get("report") === "monthly-by-plot"
            ? result.flatMap((r) =>
                r.plots.map((p) => ({ month: r.month, ...p })),
              )
            : result;
      } else
        rows = (
          await db.transaction.findMany({
            where: filters(q),
            include,
            orderBy: { transactionDate: "asc" },
          })
        ).map((r) => ({
          วันที่: r.transactionDate.toISOString().slice(0, 10),
          ประเภท: r.type === "INCOME" ? "รายรับ" : "รายจ่าย",
          สวน: r.farm.name,
          แปลง: r.plot?.name || "",
          หมวดหมู่: r.category.name,
          "ราคา/หน่วย": r.unitPrice == null ? "" : Number(r.unitPrice),
          จำนวน: r.quantity == null ? "" : Number(r.quantity),
          หน่วย: r.unit?.name || "",
          จำนวนเงิน: Number(r.amount),
          รายละเอียด: r.description || "",
          หมายเหตุ: r.remark || "",
          เลขที่เอกสาร: r.referenceNo || "",
        }));
      const keys = rows.length
        ? Object.keys(rows[0]).filter((k) => k !== "plotId")
        : ["วันที่", "ประเภท", "สวน", "แปลง", "หมวดหมู่", "จำนวนเงิน"];
      sheet.columns = keys.map((key) => ({ header: key, key, width: 22 }));
      rows.forEach((row) => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176B50" },
      };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      return new Response(await workbook.xlsx.writeBuffer(), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="farm-ledger.xlsx"',
        },
      });
    }
    if (resource === "import" && req.method === "POST") {
      const body = await req.json();
      if (
        !Array.isArray(body.rows) ||
        !body.rows.length ||
        body.rows.length > 1000
      )
        fail("นำเข้าได้ครั้งละ 1–1,000 รายการ");
      const result = await db.$transaction(
        async (tx) => {
          let count = 0;
          for (const row of body.rows) {
            await save("transactions", null, row, user, tx);
            count++;
          }
          return { count };
        },
        { timeout: 60000 },
      );
      return NextResponse.json(result);
    }
    const model = models[resource];
    if (!model) fail("ไม่พบ API", 404);
    if (req.method === "GET") {
      if (id) {
        const row = await db[model].findUnique({
          where: { id },
          ...(resource === "users"
            ? { select: safeUser }
            : resource === "transactions"
              ? { include }
              : {}),
        });
        if (!row) fail("ไม่พบข้อมูล", 404);
        return NextResponse.json(row);
      }
      if (resource === "transactions") {
        const where = filters(q);
        const page = Math.max(1, Number(q.get("page") || 1));
        if (!Number.isInteger(page)) fail("หน้าไม่ถูกต้อง");
        const [rows, count, sum] = await Promise.all([
          db.transaction.findMany({
            where,
            include,
            orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
            skip: (page - 1) * 30,
            take: 30,
          }),
          db.transaction.count({ where }),
          db.transaction.groupBy({
            by: ["type"],
            where,
            _sum: { amount: true },
          }),
        ]);
        return NextResponse.json({
          rows,
          count,
          page,
          summary: totals(
            sum.map((r) => ({ type: r.type, amount: r._sum.amount || 0 })),
          ),
        });
      }
      return NextResponse.json(
        await db[model].findMany(
          resource === "users" ? { select: safeUser } : {},
        ),
      );
    }
    if (req.method === "POST" || req.method === "PUT") {
      if (req.method === "PUT" && !id) fail("กรุณาระบุรหัส");
      const body = await req.json();
      const row = await db.$transaction((tx) =>
        save(resource, req.method === "PUT" ? id : null, body, user, tx),
      );
      return NextResponse.json(row, {
        status: req.method === "POST" ? 201 : 200,
      });
    }
    if (req.method === "DELETE" && id) {
      if (resource === "users") {
        const target = await db.user.findUnique({ where: { id } });
        if (id === user.id || target?.role === "OWNER")
          fail("ไม่สามารถลบบัญชีนี้ได้");
      }
      const references = {
        farms: [
          ["plot", "farmId"],
          ["transaction", "farmId"],
        ],
        plots: [["transaction", "plotId"]],
        categories: [["transaction", "categoryId"]],
        units: [["transaction", "unitId"]],
        "crop-types": [
          ["farm", "cropTypeId"],
          ["plot", "cropTypeId"],
        ],
        users: [["farm", "ownerId"]],
      };
      for (const [relatedModel, key] of references[resource] || [])
        if (await db[relatedModel].count({ where: { [key]: id } }))
          fail("ข้อมูลนี้มีรายการอ้างอิงอยู่ กรุณาปิดใช้งานแทนการลบ", 409);
      await db[model].delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    fail("Method not allowed", 405);
  } catch (error) {
    if (error.name === "ZodError")
      return NextResponse.json(
        {
          error:
            "ข้อมูลไม่ถูกต้อง: " +
            error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(", "),
        },
        { status: 400 },
      );
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "รหัสหรืออีเมลนี้มีอยู่แล้ว" },
        { status: 409 },
      );
    if (
      error.code === "P2003" ||
      (error.name === "PrismaClientUnknownRequestError" &&
        error.message.includes("23001"))
    )
      return NextResponse.json(
        { error: "ข้อมูลนี้มีรายการอ้างอิงอยู่ กรุณาปิดใช้งานแทนการลบ" },
        { status: 409 },
      );
    if (error.code === "P2025")
      return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    if (!error.status) console.error(error);
    return NextResponse.json(
      {
        error: error.status
          ? error.message
          : "ไม่สามารถดำเนินการได้ กรุณาลองใหม่ หรือตรวจสอบการเชื่อมต่อฐานข้อมูล",
      },
      { status: error.status || 500 },
    );
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
