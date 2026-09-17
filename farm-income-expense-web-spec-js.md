# Farm Income & Expense Management System
## ระบบบันทึกรายรับ-รายจ่ายสวนปาล์ม / สวนยาง / สวนทุเรียน

> เอกสารฉบับนี้ใช้เป็น Project Specification / Starter Model สำหรับพัฒนา Web Responsive
> โดยอ้างอิงแนวทางการบันทึกข้อมูลจาก Excel เดิม และออกแบบให้รองรับหลายสวน หลายแปลง หลายประเภทพืช
>


---

## 1. เป้าหมายของระบบ
ออกแบบ database และสร้างให้เรียบร้อย
database :
host : localhost port 5432
database : postgres
user :postgres
pass :1234
สร้าง Web Application สำหรับบันทึกและวิเคราะห์ **รายรับ-รายจ่ายในการทำสวน** โดยรองรับ

- สวนปาล์มน้ำมัน
- สวนยางพารา
- สวนทุเรียน
- สามารถเพิ่มประเภทสวนอื่นภายหลังได้
- รองรับหลายแปลง
- กำหนดจำนวนต้นของแต่ละแปลง
- กำหนดหมวดรายรับ / รายจ่ายเองได้
- บันทึกราคาต่อหน่วย จำนวน น้ำหนัก จำนวนต้น หรือหมายเหตุประกอบ
- ดูสรุปรายเดือน
- ดูสรุปรายปี
- ดูสรุปแยกตามแปลง
- ดูสรุปรวมทุกแปลง
- ดูต้นทุนต่อแปลง
- ดูต้นทุนต่อต้น
- ดูรายรับต่อต้น
- ดูกำไรต่อต้น
- ดูแนวโน้มรายรับ / รายจ่าย / กำไร
- Export Excel / / PDF ได้ในอนาคต

---

# 2. Technology Stack

ต้องการให้ระบบดูแลง่าย Deploy ง่าย และเป็น Full Stack Project 
ต้องแยก frontend/backend ไหม

Next.js
Tailwind CSS
Prisma
PostgreSQL
 

---

# 3. Responsive Design

ใช้ Tailwind Responsive Breakpoints

```text
sm   >= 640px
md   >= 768px
lg   >= 1024px
xl   >= 1280px
2xl  >= 1536px
```

ตัวอย่าง

```tsx
<div className="
  grid
  grid-cols-1
  gap-4
  md:grid-cols-2
  xl:grid-cols-4
">
```

แนวทางการแสดงผล

## Mobile

- Sidebar เปลี่ยนเป็น Drawer
- รายการ Transaction แสดงแบบ Card
- ปุ่ม Add Transaction เป็น Floating Action Button
- Filter ใช้ Bottom Sheet / Drawer
- ตารางที่มีหลาย Column ให้ซ่อน Column รอง

## Tablet

- Sidebar แบบย่อ
- Dashboard 2 Columns
- ตารางเลื่อนแนวนอนได้

## Desktop

- Sidebar เต็ม
- Dashboard 3-4 Columns
- ตารางเต็ม
- รายงานพร้อม Chart และ Filter

---

# 4. Main Menu

```text
Dashboard

รายการ
├── รายรับ-รายจ่าย
├── เพิ่มรายการ
└── นำเข้าจาก Excel

สวน / แปลง
├── ข้อมูลสวน
├── ข้อมูลแปลง
└── จำนวนต้น

รายงาน
├── สรุปรายเดือน
├── สรุปรายเดือนแยกตามแปลง
├── สรุปรายปี
├── สรุปรายปีแยกตามแปลง
├── ต้นทุนต่อแปลง
├── ต้นทุนต่อต้น
├── รายรับต่อต้น
├── กำไรต่อต้น
└── เปรียบเทียบหลายปี

ตั้งค่า
├── ประเภทสวน
├── หมวดรายรับ
├── หมวดรายจ่าย
├── หน่วย
├── ผู้ใช้งาน
└── ตั้งค่าระบบ
```

---

# 5. Dashboard

Dashboard ควรแสดงข้อมูลสำคัญ เช่น

## Summary Cards

```text
รายรับเดือนนี้
รายจ่ายเดือนนี้
กำไร / ขาดทุนเดือนนี้
จำนวนรายการเดือนนี้

รายรับปีนี้
รายจ่ายปีนี้
กำไร / ขาดทุนปีนี้
```

## Charts

1. รายรับ-รายจ่ายรายเดือน
2. กำไรรายเดือน
3. รายจ่ายแยกตามหมวด
4. รายรับแยกตามแปลง
5. ต้นทุนต่อแปลง
6. กำไรต่อแปลง

ตัวอย่าง

```text
ม.ค.  รายรับ 3,740    รายจ่าย 3,340    กำไร 400
ก.พ.  รายรับ 3,416    รายจ่าย 6,650    ขาดทุน 3,234
...
```

---

# 6. Master Data

## 6.1 Farm Type

ตัวอย่าง

```text
ปาล์มน้ำมัน
ยางพารา
ทุเรียน
```

สามารถเพิ่มภายหลังได้ เช่น

```text
มังคุด
ลำไย
กาแฟ
มะพร้าว
```

---

## 6.2 Plot

ตัวอย่าง

```text
แปลงที่ 1
จำนวนต้น 140

แปลงที่ 2
จำนวนต้น 300
```

ข้อมูลที่ควรเก็บ

```text
ชื่อแปลง
ประเภทสวน
จำนวนต้น
ขนาดพื้นที่
หน่วยพื้นที่
วันที่เริ่มปลูก
ปีที่ปลูก
สถานะ
หมายเหตุ
```

---

# 7. Income / Expense Category

หมวดหมู่ต้องเป็น Parameter ที่ผู้ใช้เพิ่ม/แก้ไข/ปิดใช้งานได้เอง

## Expense Category ตัวอย่าง

```text
ปุ๋ย
ยาฆ่าหญ้า
ค่าแรง
ค่าน้ำมัน
ซ่อมเครื่อง
ค่าเช่ารถ
ค่าคนงานใส่ปุ๋ย
ค่ายาเดือน
ค่าริดยาง
ค่าแรงตัดปาล์มขาย
ค่าแรงคนงานรายเดือน
```

## Income Category ตัวอย่าง

```text
ขายผลปาล์ม
ขายน้ำยาง
ขายยางก้อน
ขายทุเรียน
รายได้อื่น
```

---

# 8. Transaction

รายการหลักของระบบคือ Transaction

ตัวอย่างข้อมูล

```text
วันที่          21/03/2026
ประเภท          รายรับ
หมวดหมู่        ขายผลปาล์ม
แปลง            แปลงที่ 1
ราคา/กิโล       6.50
จำนวน           580
จำนวนเงิน       3,770.00
รายละเอียด      ขายผลผลิต
หมายเหตุ         -
```

ตัวอย่าง Expense

```text
วันที่          21/03/2026
ประเภท          รายจ่าย
หมวดหมู่        ค่าแรงตัดปาล์ม
แปลง            แปลงที่ 1
จำนวน           -
จำนวนเงิน       580.00
รายละเอียด      ค่าแรงตัด
```

---

# 9. Transaction Form

Fields แนะนำ

```text
วันที่ *
ประเภท *
  - รายรับ
  - รายจ่าย

สวน *
แปลง *

หมวดหมู่ *

ราคา / หน่วย
จำนวน
หน่วย

จำนวนเงิน *

รายละเอียด
หมายเหตุ

เลขที่เอกสาร
ไฟล์แนบ / รูปใบเสร็จ
```

ตัวเลือกเสริม

```text
Vendor / ผู้ขาย
Customer / ผู้ซื้อ
Payment Method
Reference No.
```

---

# 10. Auto Calculation

สามารถคำนวณ

```text
จำนวนเงิน = ราคา × จำนวน
```

ตัวอย่าง

```text
ราคา / กิโล = 6.50
น้ำหนัก = 580
จำนวนเงิน = 3,770
```

แต่ผู้ใช้สามารถแก้จำนวนเงินเองได้กรณีพิเศษ

---

# 11. Reports

## 11.1 Monthly Summary

```text
เดือน
รายรับ
รายจ่าย
กำไร / ขาดทุน
```

สูตร

```text
กำไร = รายรับ - รายจ่าย
```

---

## 11.2 Monthly Summary By Plot

```text
          แปลงที่ 1                    แปลงที่ 2                รวม
เดือน   รับ     จ่าย     กำไร        รับ     จ่าย    กำไร      รับ    จ่าย   กำไร
```

---

## 11.3 Yearly Summary

```text
ปี
รายรับรวม
รายจ่ายรวม
กำไร / ขาดทุน
```

---

## 11.4 Yearly Summary By Plot

```text
แปลง
จำนวนต้น
รายรับ
รายจ่าย
กำไร
รายรับ / ต้น
รายจ่าย / ต้น
กำไร / ต้น
```

สูตร

```text
รายรับ / ต้น = รายรับ / จำนวนต้น
รายจ่าย / ต้น = รายจ่าย / จำนวนต้น
กำไร / ต้น = กำไร / จำนวนต้น
```

---

# 12. รายงานที่แนะนำเพิ่มเติม

## 12.1 Cost Analysis

ดูรายจ่ายว่าเงินไปอยู่หมวดใดมากที่สุด

```text
ปุ๋ย
ค่าแรง
ค่าน้ำมัน
ยาฆ่าหญ้า
ซ่อมเครื่อง
อื่น ๆ
```

---

## 12.2 Crop Profitability

เปรียบเทียบ

```text
สวนปาล์ม
สวนยาง
สวนทุเรียน
```

ว่าประเภทไหน

```text
รายรับมากที่สุด
ต้นทุนสูงที่สุด
กำไรสูงที่สุด
ต้นทุนต่อต้นเท่าไร
```

---

## 12.3 Plot Comparison

ตัวอย่าง

```text
แปลง 1
รายรับ 50,000
รายจ่าย 30,000
กำไร 20,000

แปลง 2
รายรับ 80,000
รายจ่าย 60,000
กำไร 20,000
```

แต่เมื่อนำจำนวนต้นมาคิด อาจเห็นประสิทธิภาพต่างกัน

---

## 12.4 Expense Trend

แสดงกราฟรายจ่ายรายเดือน

สามารถดูได้ว่า

```text
เดือนไหนใช้เงินมาก
หมวดไหนเพิ่มขึ้น
ค่าแรงเพิ่มขึ้นกี่ %
ค่าปุ๋ยเพิ่มขึ้นกี่ %
```

---

# 13. Recommended Database Model

Relationship

```text
User
  |
  +---- Farm
           |
           +---- Plot
           |       |
           |       +---- Transaction
           |
           +---- Transaction

Category
   |
   +---- Transaction

CropType
   |
   +---- Farm / Plot
```

---

# 14. Prisma Schema

ไฟล์

```text
prisma/schema.prisma
```

ตัวอย่าง

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TransactionType {
  INCOME
  EXPENSE
}

enum RecordStatus {
  ACTIVE
  INACTIVE
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String?
  farms     Farm[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CropType {
  id        String       @id @default(cuid())
  code      String       @unique
  name      String
  status    RecordStatus @default(ACTIVE)

  farms     Farm[]
  plots     Plot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Farm {
  id          String       @id @default(cuid())
  name        String
  description String?
  ownerId     String
  cropTypeId  String?
  status      RecordStatus @default(ACTIVE)

  owner       User         @relation(fields: [ownerId], references: [id])
  cropType    CropType?    @relation(fields: [cropTypeId], references: [id])

  plots       Plot[]
  transactions Transaction[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ownerId])
  @@index([cropTypeId])
}

model Plot {
  id          String       @id @default(cuid())
  farmId      String
  cropTypeId  String?
  code        String?
  name        String
  treeCount   Int          @default(0)
  area        Decimal?     @db.Decimal(12, 2)
  areaUnit    String?
  plantedDate DateTime?
  plantedYear Int?
  status      RecordStatus @default(ACTIVE)
  note        String?

  farm        Farm         @relation(fields: [farmId], references: [id], onDelete: Cascade)
  cropType    CropType?    @relation(fields: [cropTypeId], references: [id])

  transactions Transaction[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([farmId])
  @@index([cropTypeId])
}

model Category {
  id          String          @id @default(cuid())
  code        String          @unique
  name        String
  type        TransactionType
  description String?
  status      RecordStatus    @default(ACTIVE)

  transactions Transaction[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([type])
}

model Unit {
  id        String       @id @default(cuid())
  code      String       @unique
  name      String
  status    RecordStatus @default(ACTIVE)

  transactions Transaction[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Transaction {
  id            String          @id @default(cuid())

  transactionDate DateTime
  type          TransactionType

  farmId        String
  plotId        String?
  categoryId    String
  unitId        String?

  unitPrice     Decimal?        @db.Decimal(14, 4)
  quantity      Decimal?        @db.Decimal(14, 4)
  amount        Decimal         @db.Decimal(14, 2)

  description   String?
  remark        String?
  referenceNo   String?
  attachmentUrl String?

  farm          Farm            @relation(fields: [farmId], references: [id])
  plot          Plot?           @relation(fields: [plotId], references: [id])
  category      Category        @relation(fields: [categoryId], references: [id])
  unit          Unit?           @relation(fields: [unitId], references: [id])

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([transactionDate])
  @@index([farmId])
  @@index([plotId])
  @@index([categoryId])
  @@index([type])
  @@index([farmId, transactionDate])
  @@index([plotId, transactionDate])
}
```

---

# 15. เพิ่ม Model สำหรับเก็บประวัติจำนวนต้น

กรณีจำนวนต้นเปลี่ยนตามปี เช่น ต้นตาย / ปลูกเพิ่ม แนะนำเพิ่ม

```prisma
model PlotTreeHistory {
  id        String   @id @default(cuid())
  plotId    String
  treeCount Int
  startDate DateTime
  remark    String?

  plot      Plot     @relation(fields: [plotId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([plotId, startDate])
}
```

และเพิ่มใน `Plot`

```prisma
treeHistories PlotTreeHistory[]
```

แบบนี้จะคำนวณต้นทุนต่อต้นย้อนหลังได้ถูกต้องกว่าเก็บ `treeCount` ค่าเดียว

---

# 16. Seed Data

ตัวอย่าง `prisma/seed.js`

```ts
import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  await prisma.cropType.createMany({
    data: [
      { code: "PALM", name: "ปาล์มน้ำมัน" },
      { code: "RUBBER", name: "ยางพารา" },
      { code: "DURIAN", name: "ทุเรียน" },
    ],
    skipDuplicates: true,
  });

  const expenseCategories = [
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
  ];

  for (const name of expenseCategories) {
    await prisma.category.upsert({
      where: {
        code: `EXP_${name}`,
      },
      update: {},
      create: {
        code: `EXP_${name}`,
        name,
        type: TransactionType.EXPENSE,
      },
    });
  }

  const incomeCategories = [
    "ขายผลปาล์ม",
    "ขายน้ำยาง",
    "ขายยางก้อน",
    "ขายทุเรียน",
    "รายได้อื่น",
  ];

  for (const name of incomeCategories) {
    await prisma.category.upsert({
      where: {
        code: `INC_${name}`,
      },
      update: {},
      create: {
        code: `INC_${name}`,
        name,
        type: TransactionType.INCOME,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

---

# 17. Environment

`.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/farm_account?schema=public"
```

---

# 18. PostgreSQL Docker

ตัวอย่าง `docker-compose.yml`

```yaml
services:

  postgres:
    image: postgres:16

    container_name: farm-postgres

    restart: unless-stopped

    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: farm_account

    ports:
      - "5432:5432"

    volumes:
      - farm_postgres_data:/var/lib/postgresql/data

volumes:
  farm_postgres_data:
```

Run

```bash
docker compose up -d
```

---

# 19. Create React Project

```bash
npm create vite@latest farm-web -- --template react

cd farm-web

npm install
```

ติดตั้ง Tailwind

```bash
npm install tailwindcss @tailwindcss/vite
```

ติดตั้ง Package หลัก

```bash
npm install \
react-router-dom \
@tanstack/react-query \
react-hook-form \
@hookform/resolvers \
zod \
axios \
recharts \
lucide-react \
dayjs
```

---

# 20. Node.js Backend

สร้าง Project

```bash
mkdir farm-api

cd farm-api

npm init -y
```

ติดตั้ง Package หลัก

```bash
npm install express cors dotenv zod
npm install prisma @prisma/client
```

สำหรับโปรเจกต์ JavaScript แนะนำให้ใช้ ES Modules โดยเพิ่มใน `package.json`

```json
{
  "type": "module"
}
```

ไม่ต้องติดตั้ง `typescript`, `tsx` หรือ `@types/*`

---

# 21. Prisma Install

```bash
npm install prisma @prisma/client
```

Initialize Prisma

```bash
npx prisma init
```

จะได้

```text
prisma/
  schema.prisma

.env
```

---

# 22. Prisma Generate

คำสั่ง Generate Prisma Client

```bash
npx prisma generate
```

---

# 23. Prisma Migration

สร้าง Migration ครั้งแรก

```bash
npx prisma migrate dev --name init
```

หลังแก้ `schema.prisma`

```bash
npx prisma migrate dev --name add_farm_transaction
```

---

# 24. Prisma Push

กรณี Development และยังไม่ต้องการ Migration

```bash
npx prisma db push
```

จากนั้น

```bash
npx prisma generate
```

---

# 25. Prisma Studio

เปิด GUI สำหรับดู Database

```bash
npx prisma studio
```

โดยปกติเปิดที่

```text
http://localhost:5555
```

---

# 26. Prisma Seed

ใน `package.json`

```json
{
  "type": "module",
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}
```

Run

```bash
npx prisma db seed
```

---

# 27. Prisma Commands ที่ใช้บ่อย

```bash
npx prisma init

npx prisma generate

npx prisma db push

npx prisma migrate dev --name init

npx prisma migrate deploy

npx prisma db seed

npx prisma studio

npx prisma format

npx prisma validate
```

---

# 28. Backend Folder Structure

```text
farm-api/

src/
├── app.js
├── server.js
│
├── config/
│   └── env.js
│
├── lib/
│   └── prisma.js
│
├── modules/
│   ├── auth/
│   ├── farms/
│   ├── plots/
│   ├── categories/
│   ├── transactions/
│   ├── reports/
│   └── dashboard/
│
├── middleware/
│
├── utils/
│
└── types/

prisma/
├── schema.prisma
└── seed.js
```

---


# 28.1 ตัวอย่าง Prisma Client สำหรับ JavaScript

ไฟล์ `src/lib/prisma.js`

```js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
```

---

# 28.2 ตัวอย่าง Express Server สำหรับ JavaScript

ไฟล์ `src/server.js`

```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Farm API is running",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Farm API running on port ${PORT}`);
});
```

---

# 29. React Folder Structure

```text
farm-web/

src/
├── app/
│   ├── router.jsx
│   └── providers.jsx
│
├── components/
│   ├── common/
│   ├── forms/
│   ├── tables/
│   └── charts/
│
├── layouts/
│   ├── MainLayout.jsx
│   ├── Sidebar.jsx
│   └── Header.jsx
│
├── pages/
│   ├── dashboard/
│   ├── transactions/
│   ├── farms/
│   ├── plots/
│   ├── reports/
│   └── settings/
│
├── services/
│
├── hooks/
│
├── types/
│
└── utils/
```

---

# 30. API Design

## Transaction

```http
GET    /api/transactions
GET    /api/transactions/:id
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

Filter

```http
GET /api/transactions?
    year=2026
    &month=9
    &farmId=xxx
    &plotId=xxx
    &type=EXPENSE
    &categoryId=xxx
```

---

## Farms

```http
GET    /api/farms
POST   /api/farms
PUT    /api/farms/:id
DELETE /api/farms/:id
```

---

## Plot

```http
GET    /api/plots
POST   /api/plots
PUT    /api/plots/:id
DELETE /api/plots/:id
```

---

## Category

```http
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

---

# 31. Report API

## Monthly

```http
GET /api/reports/monthly?year=2026
```

Result

```json
[
  {
    "month": 1,
    "income": 3740,
    "expense": 3340,
    "profit": 400
  }
]
```

---

## Monthly By Plot

```http
GET /api/reports/monthly-by-plot?year=2026
```

---

## Yearly

```http
GET /api/reports/yearly
```

---

## Annual By Plot

```http
GET /api/reports/yearly-by-plot?year=2026
```

---

# 32. Dashboard API

```http
GET /api/dashboard/summary?year=2026&month=9
```

Result

```json
{
  "month": {
    "income": 19380,
    "expense": 4140,
    "profit": 15240
  },

  "year": {
    "income": 105658,
    "expense": 68594,
    "profit": 37064
  }
}
```

---

# 33. Import จาก Excel เดิม

แนะนำให้มีฟังก์ชัน

```text
Upload Excel
Preview Data
ตรวจสอบข้อมูลผิด
Map Column
Import
```

Mapping ตัวอย่าง

```text
วันที่       -> transactionDate
ประเภท      -> type
หมวดหมู่    -> category
ราคา/กิโล   -> unitPrice
จำนวน       -> quantity
รายละเอียด  -> description
จำนวนเงิน   -> amount
หมายเหตุ    -> remark
แปลง        -> plot
```

รองรับไฟล์

```text
.xlsx
.csv
```

Library

```bash
npm install xlsx
```

หรือฝั่ง Backend

```bash
npm install exceljs
```

---

# 34. UX เพิ่มข้อมูลเร็ว

เพื่อให้ใช้งานแทน Excel ได้จริง ควรทำให้เพิ่มรายการเร็ว

ตัวอย่าง Flow

```text
กด +
↓
เลือก รายรับ / รายจ่าย
↓
เลือกหมวด
↓
เลือกแปลง
↓
ใส่จำนวนเงิน
↓
Save
```

ข้อมูลที่ใช้บ่อยควรจำค่าล่าสุด เช่น

```text
แปลงล่าสุด
หมวดล่าสุด
วันที่ล่าสุด
```

---

# 35. Quick Add Mobile

บนมือถือสามารถทำเป็น Bottom Sheet

```text
+ เพิ่มรายการ

[ รายรับ ] [ รายจ่าย ]

วันที่
หมวดหมู่
แปลง
ราคา
จำนวน
จำนวนเงิน
หมายเหตุ

[ บันทึก ]
```

---

# 36. Filter

ทุกหน้ารายงานควร Filter ได้

```text
ปี
เดือน
ประเภทสวน
สวน
แปลง
ประเภทรายการ
หมวดหมู่
```

---

# 37. Color Concept

แนะนำ

```text
รายรับ   = Green
รายจ่าย = Orange / Red
กำไร     = Blue
ขาดทุน   = Red
```

แต่ควรใช้ Tailwind Semantic Classes ผ่าน Component แทนการ Hardcode หลายจุด

---

# 38. Authentication

Version แรกอาจใช้

```text
Email
Password
```

Version ต่อไปรองรับ

```text
Google Login
Line Login
```

Role

```text
OWNER
ADMIN
STAFF
VIEWER
```

---

# 39. Optional Tables สำหรับ Version ต่อไป

สามารถเพิ่ม

```text
Supplier
Customer
Worker
Equipment
Inventory
FertilizerStock
ChemicalStock
Harvest
Sale
Payment
Attachment
AuditLog
```

---

# 40. Production Data ที่ควรเพิ่มภายหลัง

สำหรับสวนปาล์ม

```text
น้ำหนักผลผลิต
ราคาต่อกิโล
จำนวนทะลาย
รอบตัด
```

สำหรับสวนยาง

```text
น้ำหนักยาง
ราคาต่อกิโล
ชนิดยาง
จำนวนวันกรีด
```

สำหรับสวนทุเรียน

```text
จำนวนลูก
น้ำหนัก
สายพันธุ์
เกรด
ราคาต่อกิโล
ลูกค้า
```

เพื่อให้ระบบสามารถวิเคราะห์ผลผลิตได้ละเอียดขึ้น

---

# 41. Recommended MVP

Version 1 ควรเริ่มจาก

```text
1. Login

2. Dashboard

3. Farm

4. Plot

5. Category

6. Transaction

7. Monthly Report

8. Monthly By Plot

9. Yearly Report

10. Yearly By Plot

11. Export Excel

12. Responsive Mobile / Tablet / Desktop
```

---

# 42. Version 2

เพิ่ม

```text
Import Excel

Receipt Image

Inventory

Fertilizer Stock

Worker

Harvest

Sale

Budget

Notification

PWA

Offline Mode
```

---

# 43. PWA

เนื่องจากระบบใช้ในสวน ซึ่งบางจุด Internet อาจไม่ดี แนะนำให้ Version ถัดไปทำเป็น

```text
Progressive Web App
```

เพื่อ

```text
Add to Home Screen
ใช้เหมือน Mobile App
Cache หน้าโปรแกรม
Offline Draft
Sync เมื่อมี Internet
```

---

# 44. Recommended Project Name

ตัวอย่าง

```text
Farm Ledger

Farm Account

Smart Farm Ledger

Farm Income & Expense

My Farm Accounting

สวนบัญชี

บัญชีสวน
```

ชื่อภาษาไทยที่เข้าใจง่าย

```text
ระบบบัญชีรายรับ-รายจ่ายสวน
```

---

# 45. Development Order

แนะนำลำดับการพัฒนา

```text
Phase 1
Database
Prisma
Master Data

Phase 2
Transaction CRUD

Phase 3
Dashboard

Phase 4
Reports

Phase 5
Responsive

Phase 6
Excel Import / Export

Phase 7
Authentication

Phase 8
Deploy
```

---

# 46. Starter Commands

ตัวอย่างเริ่ม Backend

```bash
mkdir farm-account

cd farm-account

mkdir api web
```

Backend

```bash
cd api

npm init -y

npm install express cors dotenv zod prisma @prisma/client

npm install -D typescript tsx @types/node @types/express @types/cors



npx prisma init
```

แก้

```text
prisma/schema.prisma
```

จากนั้น

```bash
npx prisma format

npx prisma validate

npx prisma generate

npx prisma migrate dev --name init

npx prisma db seed

npx prisma studio
```

Frontend

```bash
cd ../web

npm create vite@latest . -- --template react

npm install

npm install tailwindcss @tailwindcss/vite

npm install \
react-router-dom \
@tanstack/react-query \
react-hook-form \
@hookform/resolvers \
zod \
axios \
recharts \
lucide-react \
dayjs
```

Run Frontend

```bash
npm run dev
```

Run Backend

```bash
npm run dev
```

---

# 47. สรุป

ระบบใหม่นี้จะเปลี่ยนจาก Excel เดิมให้เป็นระบบ Web Responsive ที่

```text
ใช้งานได้จากมือถือ
ใช้งานได้จาก Tablet
ใช้งานได้จาก Notebook / Desktop

รองรับหลายสวน
รองรับหลายแปลง
รองรับหลายประเภทพืช

กำหนดหมวดรายรับเอง
กำหนดหมวดรายจ่ายเอง

ดูรายรับ
ดูรายจ่าย
ดูกำไร / ขาดทุน

สรุปรายเดือน
สรุปรายปี
แยกตามแปลง
รวมทุกแปลง

คำนวณรายรับต่อต้น
คำนวณรายจ่ายต่อต้น
คำนวณกำไรต่อต้น

นำข้อมูล Excel เดิมเข้าระบบได้
```

แนวทางที่แนะนำที่สุดสำหรับ Project นี้คือ

```text
React + JavaScript
Tailwind CSS
Node.js + Express
Prisma ORM
PostgreSQL
Docker
```

ต้องควรออกแบบ Database ให้รองรับ `CropType`, `Farm`, `Plot`, `Category`, `Transaction`
ตั้งแต่ต้น เพื่อให้ภายหลังสามารถขยายจากสวนปาล์มไปสวนยาง สวนทุเรียน หรือสวนประเภทอื่นได้โดยไม่ต้องแก้โครงสร้างหลักของระบบ
