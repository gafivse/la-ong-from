# Supabase + Vercel

Supabase project: `yaukzbgqpdeohniylfmx`
เว็บ Next.js และ API อยู่บน Vercel ฐานข้อมูลอยู่บน Supabase PostgreSQL
ยังใช้ email/password และ session ของแอปเดิม ไม่ต้องเปิด Supabase Auth หรือใช้ anon/service-role key

## 1. การเชื่อมต่อฐานข้อมูล

เปิด [Supabase project](https://supabase.com/dashboard/project/yaukzbgqpdeohniylfmx) → Connect แล้วคัดลอก URI จริงของทั้งสองโหมด
แทนรหัสผ่านด้วย Database Password ที่ URL-encode แล้ว ไม่ใช่รหัสผ่านบัญชี Supabase

| Environment | การเชื่อมต่อ |
| --- | --- |
| `DATABASE_URL` | Transaction pooler พอร์ต 6543 สำหรับเว็บบน Vercel |
| `DIRECT_URL` | Session pooler พอร์ต 5432 สำหรับ Prisma migration และ seed |

รูปแบบตัวอย่าง (ต้องแทน POOLER_HOST ด้วย host จริงจาก Connect ห้ามเดา region):

```dotenv
DATABASE_URL="postgresql://postgres.yaukzbgqpdeohniylfmx:URL_ENCODED_PASSWORD@POOLER_HOST:6543/postgres?schema=farm_ledger&pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.yaukzbgqpdeohniylfmx:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?schema=farm_ledger&sslmode=require"
```

ใช้ `/postgres` ตามชื่อฐานข้อมูลของ Supabase ไม่เปลี่ยนเป็น `/farm_2569`
`farm_2569` เป็นชื่อฐานข้อมูลบนเครื่อง ส่วนข้อมูลแอปยังแยกไว้ใน schema `farm_ledger` เหมือนเดิม
Prisma 6 ใช้ `pgbouncer=true` เพื่อรองรับ transaction pooler และใช้ directUrl แยกสำหรับ migration
อย่าเพิ่ม schema `farm_ledger` ใน Exposed schemas ของ Data API; แอปเข้าผ่าน server เท่านั้น
หาก project นี้ใช้เฉพาะแอป Prisma สามารถปิด Data API ได้ ตามคู่มือ Supabase

## 2. ติดตั้งตารางและบัญชีครั้งแรก

หากต้องย้ายข้อมูลเดิม ให้ทำข้อ 4 ก่อนและข้าม seed ครั้งแรกจน restore เสร็จ
สำหรับเริ่มฐานข้อมูลใหม่ ให้ตั้ง DATABASE_URL, DIRECT_URL, SEED_EMAIL และ SEED_PASSWORD ใน environment ของเครื่อง/งาน CI ที่จะรัน migration
ตั้งรหัสผ่านใหม่อย่างน้อย 10 ตัว ไม่ใช้ ChangeMe123! และไม่ commit ค่าเหล่านี้ลง Git

```powershell
npm.cmd ci --include=dev
npm.cmd run db:generate
npm.cmd run db:setup
```

ตรวจว่า URLs ชี้ไป Supabase ก่อนรัน มิฉะนั้นคำสั่งจะใช้ `.env` ของเครื่อง
เพื่อคงฐานข้อมูล local ไว้ สามารถคัดลอก `.env.supabase.example` เป็น `.env.supabase.local` เติมค่าจริง แล้วใช้คำสั่งเฉพาะปลายทางแทน `db:setup`:

```powershell
node --env-file=.env.supabase.local node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.supabase.local prisma/seed.js
```

ไฟล์ `.env.supabase.local` ไม่เข้า Git และไม่จำเป็นต้องส่งรหัสผ่านผ่านแชต
Seed ใช้ DIRECT_URL เพิ่มเฉพาะข้อมูลหลักและเจ้าของที่ยังไม่มี ไม่แก้รหัสผ่านบัญชีเดิม
ไม่ใช้ `prisma migrate dev`, `db push` หรือ `migrate reset` กับฐานข้อมูลใช้งานจริง
อัปเดต schema ในอนาคตด้วย `npm run db:deploy` ก่อน deploy เว็บรุ่นที่ต้องใช้ schema ใหม่

## 3. Vercel

นำ repository ขึ้น GitHub/GitLab แล้ว Vercel → Add New → Project → Import repository

| ช่อง | ค่า |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | รากที่มี package.json |
| Node.js | 24.x |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build` |
| Output Directory | ค่าเริ่มต้นของ Next.js |

`vercel.json` เตรียมคำสั่งให้แล้ว ไม่ต้องใช้ Start Command ของ Render
เพิ่ม `DATABASE_URL` และ `DIRECT_URL` ใน Vercel Environment Variables เฉพาะ Production
เพิ่ม `APP_ORIGIN=https://ชื่อเว็บ.vercel.app` เมื่อทราบโดเมนหลักแล้ว (ไม่มี / ปิดท้าย) และ redeploy
หากไม่กำหนด APP_ORIGIN ระบบตรวจ Origin เทียบ Host ของ request
เลือก Function Region ใกล้ฐานข้อมูล Supabase หลังตรวจ region จริงใน Dashboard

Build ไม่รัน migration/seed อัตโนมัติ เพื่อไม่ให้ Preview เปลี่ยนข้อมูล Production
หากเปิด Preview ให้ใช้ฐานข้อมูล/branch ทดสอบแยก และตั้ง URLs กับ APP_ORIGIN ของ Preview แยก
ไม่ต้องเก็บ SEED_EMAIL/SEED_PASSWORD บน Vercel runtime หากรัน seed จากเครื่อง/CI แล้ว
ห้ามตั้งชื่อค่าฐานข้อมูลเป็น NEXT_PUBLIC_* เพราะเป็นความลับสำหรับ server

## 4. ย้ายข้อมูลจาก farm_2569 บนเครื่อง

1. หยุดบันทึกข้อมูลชั่วคราวและสำรอง schema `farm_ledger` ล่าสุดด้วย pg_dump แบบ custom รวม `_prisma_migrations`
2. ตรวจ Supabase ว่ายังไม่มี schema `farm_ledger` หรือข้อมูลบัญชีใหม่; อย่า restore ทับข้อมูลที่มีอยู่
3. Restore เฉพาะ schema นี้ผ่าน Session pooler พอร์ต 5432 โดยใช้ `pg_restore --no-owner --no-acl --exit-on-error` และ TLS; ไม่ใช้ `--clean` และไม่ย้าย schema `auth`, `storage` หรือ `public` ของ Supabase
4. เครื่องมือ pg_dump ต้องรองรับ PostgreSQL ต้นทาง (เครื่องนี้ 18) และตรวจเวอร์ชันปลายทางก่อน restore เพราะการ restore ข้ามลง major version อาจไม่รองรับ
5. ตรวจจำนวนรายการ ยอดรวมรายปี จำนวนต้น ผู้ใช้ และประวัติเทียบต้นทาง แล้วรัน `db:deploy` เพื่อตรวจ migration ที่ยังค้าง
6. หากรัน seed หลัง restore ให้ใช้ SEED_EMAIL ของเจ้าของเดิม รหัสผ่านบัญชีที่ย้ายมายังคงเดิม

เก็บ dump ใน `backups/` ซึ่งไม่เข้า Git และห้ามวางรหัสผ่านไว้ใน command history
การเตรียมไฟล์ deploy ไม่ได้คัดลอกข้อมูลจริงขึ้น Supabase อัตโนมัติ

## 5. ตรวจหลัง deploy

- `/api/health` ต้องคืน `{"status":"OK"}` โดยไม่ต้องล็อกอิน
- ทดสอบล็อกอิน เพิ่ม/แก้ไขรายการทดสอบ รายงานทั้งปี ส่งออก Excel และออกจากระบบ
- ลบเฉพาะรายการทดสอบ และตรวจข้อมูลยังอยู่หลัง redeploy
- หาก connect ไม่ได้ ตรวจ host จาก Connect, รหัสผ่าน, พอร์ต และ URL encoding
- หาก prepared statement error ตรวจ `pgbouncer=true` ใน DATABASE_URL
- หากตารางไม่พบ ตรวจ `schema=farm_ledger` ทั้งสอง URL และการ migrate/restore
- ตัวจำกัดลองรหัสผ่านผิดปัจจุบันเก็บต่อ process; บน serverless ควรเสริม rate limit ที่ Vercel Firewall หรือ shared store เมื่อต้องการจำกัดข้าม instance

## Supabase MCP

```powershell
codex mcp add supabase --url 'https://mcp.supabase.com/mcp?project_ref=yaukzbgqpdeohniylfmx&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching'
codex mcp login supabase
codex mcp list
```

ต้องครอบ URL ด้วย single quotes ใน PowerShell เนื่องจากมี `&`
หาก OAuth registration แจ้ง invalid scopes ใช้ scopes ที่ Supabase รองรับอย่างชัดเจน:

```powershell
codex mcp login supabase --scopes 'organizations:read,projects:read,database:read,database:write,analytics:read,environment:read,environment:write,edge_functions:read,edge_functions:write'
```

ยืนยันสิทธิ์ในเบราว์เซอร์ แล้วเปิด session Codex ใหม่หาก tools ยังไม่ปรากฏ
`/mcp` เป็นคำสั่งใน Codex interactive CLI ไม่ใช่คำสั่ง PowerShell
MCP OAuth ไม่ใช่ Database Password และไม่แทน DATABASE_URL ของแอป

อ้างอิง: [Supabase Prisma](https://supabase.com/docs/guides/database/prisma), [Prisma 6 Supabase](https://www.prisma.io/docs/orm/v6/overview/databases/supabase), [Vercel Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs)
