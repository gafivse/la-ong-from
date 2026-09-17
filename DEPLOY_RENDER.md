# นำบัญชีสวนขึ้น Render

> คู่มือเดิม: โปรเจกต์เปลี่ยนไปใช้ [Supabase + Vercel](DEPLOY_SUPABASE_VERCEL.md) แล้ว และนำ render.yaml ออกแล้ว

## 1. เตรียม Git repository

นำโค้ดขึ้น GitHub/GitLab แล้วเชื่อม repository กับ Render รวม `package-lock.json` และ `prisma/migrations` ด้วย
ไม่อัปโหลด `.env`, `node_modules`, `.next` หรือ `backups` ซึ่งอยู่ใน `.gitignore` แล้ว

## 2. สร้างฐานข้อมูล

จากหน้าในภาพ เลือก **Postgres → New Postgres**:

- Name: `farm-2569-db`
- Database: `farm_2569`
- Region: `Singapore` (เว็บต้องอยู่ region เดียวกัน)
- PostgreSQL: 18 เพื่อให้ตรงกับฐานข้อมูลบนเครื่อง
- ใช้งานจริงเลือกแผนแบบเสียเงินและตรวจราคาก่อนสร้าง

คัดลอก **Internal Database URL** สำหรับเว็บบน Render แล้วเติม `?schema=farm_ledger`
หาก URL มี `?` อยู่แล้ว ให้เติม `&schema=farm_ledger` แทน
ตัวอย่างรูปแบบ: `postgresql://USER:PASSWORD@HOST/farm_2569?schema=farm_ledger`
ห้ามใช้ URL localhost ของเครื่องเราใน Render

## 3. สร้างเว็บจากหน้าจอในภาพ

เลือก **Web Services → New Web Service** แล้วเชื่อม repository:

| ช่อง | ค่า |
| --- | --- |
| Name | `la-ong-farm` หรือชื่อที่ว่าง |
| Language / Runtime | Node |
| Region | Singapore |
| Root Directory | เว้นว่าง หาก package.json อยู่ราก repository |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start:render` |
| Health Check Path | `/api/health` |

แม้ repository มี Dockerfile ให้เลือก Node ตามคู่มือนี้
เลือกแผนเว็บตามงบประมาณ; แนะนำแบบเสียเงินสำหรับใช้งานประจำ
ไม่ต้องกำหนด PORT: Next.js อ่าน PORT ที่ Render จัดให้และฟังที่ 0.0.0.0 อยู่แล้ว

เพิ่ม Environment Variables:

| Key | Value |
| --- | --- |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal Database URL พร้อม schema จากข้อ 2 |
| `SEED_EMAIL` | อีเมลเจ้าของสวนสำหรับเข้าสู่ระบบ |
| `SEED_PASSWORD` | รหัสผ่านใหม่อย่างน้อย 10 ตัว ห้ามใช้รหัสตัวอย่างบนเครื่อง |

ระบบใช้ `RENDER_EXTERNAL_URL` ที่ Render กำหนดให้สำหรับตรวจ origin อัตโนมัติ
เมื่อใช้ custom domain ให้เพิ่ม `APP_ORIGIN=https://ชื่อโดเมน` (ไม่มี / ปิดท้าย) และเข้าเว็บผ่านโดเมนนี้
ไม่ต้องใส่ค่า DATABASE_URL หรือรหัสผ่านลงในไฟล์ render.yaml

Start Command จะรัน migration → seed → เปิดเว็บ หากขั้นตอนไหนผิดพลาดจะหยุดก่อนเปิดเว็บ
Seed เพิ่มข้อมูลหลักและบัญชีที่ยังไม่มี ไม่เปลี่ยนรหัสผ่านบัญชีเดิม ไม่เพิ่มรายการบัญชีตัวอย่าง
เก็บ SEED_EMAIL เดิมไว้ระหว่าง redeploy; หากเปลี่ยนอีเมลนี้ seed จะสร้างบัญชีเจ้าของเพิ่ม
เปลี่ยนรหัสผ่านของบัญชีที่มีอยู่ผ่าน **ตั้งค่า → ผู้ใช้งาน**

อีกทางเลือก: **New → Blueprint** แล้วเลือก repository เพื่ออ่าน `render.yaml`
ไฟล์นี้สร้างเฉพาะเว็บแบบเสียเงิน ต้องสร้าง Postgres ก่อน และกรอกค่า secret เมื่อ Render ถาม
ใช้วิธีใดวิธีหนึ่ง ไม่ต้องสร้างเว็บซ้ำทั้งสองวิธี

## 4. ตรวจหลัง Deploy

1. เปิด `https://ชื่อเว็บ.onrender.com/api/health` ต้องได้ `{"status":"OK"}`
2. เปิด `/login` และเข้าสู่ระบบด้วย SEED_EMAIL / SEED_PASSWORD
3. ตรวจหน้า Dashboard, ข้อมูลสวน, ข้อมูลแปลง และรายงาน
4. ตรวจเพิ่ม/แก้ไขรายการทดสอบ แล้วลบเฉพาะรายการทดสอบนั้น
5. ตรวจออกจากระบบ และข้อมูลยังอยู่หลัง redeploy

ฐานข้อมูลบน Render เป็นฐานข้อมูลใหม่ ข้อมูลจริงในเครื่อง **ยังไม่ย้ายตามโค้ดขึ้นไป**

## 5. หากต้องการย้ายข้อมูลเดิมจากเครื่อง

ย้ายก่อนเปิดเว็บใช้งานจริงและก่อนรัน seed บนฐานข้อมูลปลายทาง:

1. หยุดบันทึกข้อมูลชั่วคราวและสำรอง schema `farm_ledger` ล่าสุดด้วย PostgreSQL 18 `pg_dump --format=custom --schema=farm_ledger --no-owner --no-acl` รวมตาราง `_prisma_migrations` ด้วย
2. ใช้ External Database URL ของ Render สำหรับ `pg_restore --no-owner --no-acl --exit-on-error` จากเครื่องเรา ไปยังฐานข้อมูลปลายทางที่ยังไม่มี schema `farm_ledger` ตั้งค่า TLS ตาม URL ที่ Render ให้ และอนุญาต IP เครื่องเราสำหรับช่วงย้ายข้อมูล
3. อย่าใช้ `--clean` หรือ restore ทับฐานข้อมูลที่มีข้อมูลใหม่แล้ว หากเริ่ม seed ไปแล้วให้เตรียมปลายทางว่างก่อน
4. ตรวจจำนวนแถวและยอดรายรับ/รายจ่ายเทียบเครื่องเดิม ก่อนเปิดให้ใช้งาน
5. ใช้ SEED_EMAIL ตรงกับบัญชีเจ้าของเดิมเพื่อไม่สร้างเจ้าของซ้ำ; รหัสผ่านเดิมยังคงอยู่เพราะ seed ไม่เขียนทับ

เก็บรหัสผ่านการเชื่อมต่อใน environment หรือ password prompt ไม่ใส่ใน repository
การเตรียมไฟล์นี้ยังไม่ได้ย้ายหรือแก้ไขฐานข้อมูลจริง

## ข้อจำกัดและแหล่งอ้างอิง

Free Web Service พักเมื่อไม่มีการใช้งาน 15 นาที ส่วน Free Postgres หมดอายุหลัง 30 วัน จึงควรเลือกฐานข้อมูลแบบเสียเงินสำหรับเก็บบัญชีจริง และจัดการสำรองข้อมูล
คำสั่ง start ที่เตรียมไว้ใช้ได้กับ Free เช่นกัน โดยไม่ต้องอาศัย pre-deploy command หรือ Shell ของแผนเสียเงิน

- [Render: Next.js](https://render.com/docs/deploy-nextjs-app)
- [Render: Blueprint](https://render.com/docs/blueprint-spec)
- [Render: Free limitations](https://render.com/docs/free)
- [Render: Node version](https://render.com/docs/node-version)

หากขึ้น Origin ไม่ถูกต้อง ให้ตรวจ APP_ORIGIN ให้ตรงกับ URL ที่เข้าใช้งาน
หาก migration เชื่อมต่อไม่ได้ ให้ตรวจ DATABASE_URL, region และ schema
หากล็อกอินไม่ได้หลังเปลี่ยน SEED_PASSWORD ให้จำไว้ว่า seed ไม่เปลี่ยนรหัสผ่านบัญชีที่มีอยู่
