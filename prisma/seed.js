import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
try {
  const email = process.env.SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_PASSWORD;
  if (!email || !password || password.length < 10)
    throw new Error("Set SEED_EMAIL and SEED_PASSWORD (10+ characters)");
  if (
    (process.env.RENDER === "true" || process.env.VERCEL === "1") &&
    password === "ChangeMe123!"
  )
    throw new Error(
      "Set a unique SEED_PASSWORD for cloud deployment; do not use the local example password",
    );
  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "เจ้าของสวน",
      role: "OWNER",
      password: await bcrypt.hash(password, 12),
    },
  });
  for (const [code, name] of [
    ["PALM", "ปาล์มน้ำมัน"],
    ["RUBBER", "ยางพารา"],
    ["DURIAN", "ทุเรียน"],
  ])
    await db.cropType.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  for (const [type, names] of [
    [
      "INCOME",
      ["ขายผลปาล์ม", "ขายน้ำยาง", "ขายยางก้อน", "ขายทุเรียน", "รายได้อื่น"],
    ],
    [
      "EXPENSE",
      [
        "ปุ๋ย",
        "ยาฆ่าหญ้า",
        "ค่าแรง",
        "ค่าน้ำมัน",
        "ซ่อมเครื่อง",
        "ค่าเช่ารถ",
        "ค่าคนงานใส่ปุ๋ย",
        "ค่ายาเดือน",
        "ค่าริดยาง",
        "ค่าแรงตัดปาล์มขาย",
        "ค่าแรงคนงานรายเดือน",
      ],
    ],
  ])
    for (const [i, name] of names.entries()) {
      const code = `${type}_${i + 1}`;
      await db.category.upsert({
        where: { code },
        update: {},
        create: { code, name, type },
      });
    }
  for (const [code, name] of [
    ["KG", "กิโลกรัม"],
    ["BAG", "กระสอบ"],
    ["DAY", "วัน"],
    ["TREE", "ต้น"],
    ["ITEM", "รายการ"],
    ["LITRE", "ลิตร"],
  ])
    await db.unit.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  console.log(
    "Seed complete: owner and master data. No sample financial records.",
  );
} finally {
  await db.$disconnect();
}
