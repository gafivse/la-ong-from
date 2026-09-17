# บัญชีสวน — Farm Ledger

เว็บภาษาไทยสำหรับบันทึกรายรับ–รายจ่ายสวนปาล์ม ยางพารา ทุเรียน และพืชที่เพิ่มเองได้ สร้างตาม `farm-income-expense-web-spec-js.md` โดยใช้ Next.js App Router + JavaScript, Tailwind CSS, Prisma และ PostgreSQL

Frontend และ API อยู่ในโปรเจกต์เดียว รันเพียงเว็บเซิร์ฟเวอร์เดียว ไม่ต้องเปิด Express แยก

## เริ่มใช้งานบนเครื่องนี้

ต้องมี Node.js 24 และ PostgreSQL โดยตั้งค่าการเชื่อมต่อใน `.env`

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run dev
```

ถ้ามี `.env` แล้วให้ข้ามคำสั่งคัดลอก เปิด http://localhost:3000

ระบบใช้ฐานข้อมูล `farm_2569` ที่ `localhost:5432` ภายใต้ schema `farm_ledger` ซึ่งแยกจาก `public` และเพิ่มข้อมูลเริ่มต้นเรียบร้อยแล้ว ไม่มีรายการบัญชีสมมติ สำหรับติดตั้งใหม่ให้สร้างฐานข้อมูล `farm_2569` ก่อนรัน migration

เมื่อวันที่ 16 กันยายน 2569 ได้คัดลอก schema และข้อมูลจากฐานข้อมูล `postgres` ไป `farm_2569` พร้อมตรวจทุกฟิลด์ตรงกัน เก็บฐานข้อมูลเดิมไว้และสำรองเป็น `backups/farm_ledger-before-farm_2569-20260916.dump` (ไม่รวมใน Git)

บัญชีเริ่มต้นอ้างอิง `SEED_EMAIL` / `SEED_PASSWORD` ใน `.env.example`:

- อีเมล: `owner@farm.local`
- รหัสผ่าน: `ChangeMe123!`

เปลี่ยนรหัสผ่านได้ที่ **ตั้งค่า → ผู้ใช้งาน → แก้ไข** การเปลี่ยนรหัสผ่านหรือสิทธิ์จะยกเลิก session ของบัญชีนั้นและให้เข้าสู่ระบบใหม่ คำสั่ง seed ไม่เขียนทับรหัสผ่านของบัญชีที่มีอยู่แล้ว

เริ่มบันทึกโดยเพิ่ม **สวน → แปลง → รายรับ–รายจ่าย** สามารถลงรายการระดับสวนโดยไม่ระบุแปลงได้ และจะอยู่ในกลุ่ม “ไม่ระบุแปลง” ในรายงาน

แต่ละหน้ามี URL แยก: `/dashboard`, `/transactions`, `/farms`, `/plots`, `/reports`, `/import`, `/settings` และ `/login` รายงานย่อย เช่น `/reports/yearly-by-plot` และตั้งค่า เช่น `/settings/units` เปิดตรงหรือบันทึก bookmark ได้

ใช้ฟอนต์ **Prompt, sans-serif** จาก Google Fonts น้ำหนัก 400 / 600 / 700 พร้อม `display=swap` คลิก **โปรไฟล์** ด้านบนขวาแล้วเลือก **ออกจากระบบ** เพื่อยกเลิก session ใช้ได้ทั้งคอมและมือถือ

ปรับขนาดตัวหนังสือทั้งเว็บใน `app/globals.css` ที่ `:root` โดยไม่แสดงปุ่มปรับขนาดบนหน้าเว็บ:

```css
:root {
  --app-font-scale: 0.9; /* 90% ของขนาดพื้นฐาน: 0.85 เล็กลง, 1 ขนาดเดิม */
}
```

ขนาดเฉพาะส่วนปรับที่ `font-size` ของ selector นั้น เช่น `body`, `h1`, `.button` โดยคง `calc(... * var(--app-font-scale, 1))` ไว้ ขนาดที่เคยบันทึกในเบราว์เซอร์จะไม่ถูกนำมาใช้แล้ว

## ฟังก์ชันที่ทำแล้ว

- เข้าสู่ระบบด้วย email/password, hashed password, session ในฐานข้อมูลและ HttpOnly cookie
- สิทธิ์ OWNER / ADMIN จัดการข้อมูลและผู้ใช้, STAFF บันทึกบัญชีและนำเข้า, VIEWER อ่านและส่งออก
- ทุกบัญชีเป็นทีมของพื้นที่บัญชีสวนเดียวกัน เห็นข้อมูลสวนร่วมกัน ไม่ใช่ระบบแยก tenant
- เพิ่ม แก้ไข ลบสวน แปลง หมวดหมู่ ประเภทพืช หน่วย และผู้ใช้
- ปิดใช้งาน master data; ป้องกันการลบข้อมูลที่มีรายการอ้างอิง
- ประวัติจำนวนต้นตามวันที่เริ่มใช้, ขนาดพื้นที่, วันที่/ปีปลูก และหมายเหตุ
- รายรับ–รายจ่าย พร้อมราคาต่อหน่วย จำนวน หน่วย รายละเอียด หมายเหตุ และเลขที่เอกสาร
- คำนวณราคา × จำนวนอัตโนมัติ และแก้ยอดเงินเองได้; เริ่มรายการใหม่ด้วยวันที่ปัจจุบัน จำสวน แปลง และหมวดล่าสุดเฉพาะค่าที่ยังใช้งานได้ในฐานข้อมูล
- ค้นหา แบ่งหน้า และกรองปี เดือน สวน แปลง ประเภทพืช ประเภทรายการ หมวดหมู่
- Dashboard สรุปเดือน/ปี กราฟรายรับ รายจ่าย กำไร สัดส่วนรายจ่าย และเปรียบเทียบแปลง
- รายงานรายเดือน รายเดือนแยกแปลง รายปี/เปรียบเทียบหลายปี รายปีแยกแปลง พร้อมต้นทุน รายรับ และกำไรต่อต้น
- ส่งออก `.xlsx` ทั้งรายการตามตัวกรองและรายงาน
- นำเข้า `.xlsx` / `.csv` จับคู่คอลัมน์ ดูตัวอย่าง ตรวจสอบแต่ละแถว และบันทึกแบบทั้งหมดสำเร็จหรือไม่บันทึกเลย
- Responsive: sidebar drawer บนมือถือ, เมนูย่อบน tablet, รายการบัญชีแบบ card บนมือถือ และปุ่มเพิ่มรายการลอย

## หลักการรายงาน

- เก็บเงินเป็น PostgreSQL Decimal; รวมรายงานด้วยจำนวนสตางค์ก่อนแปลงเป็นบาท
- กำไร = รายรับ − รายจ่าย
- รายงานรายเดือนแสดงครบ 12 เดือนของปีที่เลือก; รายงานเปรียบเทียบปีแสดงทุกปีที่มีข้อมูล
- รายงานแยกแปลงใช้จำนวนต้นจากประวัติล่าสุด ณ สิ้นเดือน/สิ้นปีที่เลือก ไม่ใช่ค่าเฉลี่ยถ่วงน้ำหนักตามวัน
- ไม่มีต้นหรือยังไม่ถึงวันที่ประวัติแรกจะแสดง `—` สำหรับยอดต่อต้น ไม่หารด้วยศูนย์
- รายการระดับสวนที่ไม่ระบุแปลงไม่ถูกกระจายต้นทุนลงแปลงโดยอัตโนมัติ
- วันที่บัญชีเป็นวันปฏิทินเก็บที่ UTC midnight; หน้าจอแสดงปี พ.ศ. และฟิลด์ปีปลูกใช้ ค.ศ.
- ข้อมูลเก่าที่ยังอ้างอิง master ที่ปิดใช้งานคงอยู่ในรายงาน แต่การบันทึกต้องเลือก master ที่ใช้งาน

## นำเข้า

ดาวน์โหลดไฟล์ต้นแบบจากหน้านำเข้า รองรับไฟล์ไม่เกิน 5 MB และ 1,000 แถวต่อครั้ง ใช้ชีตแรกของ Excel ชื่อสวน/แปลง/หมวด/หน่วยต้องตรงกับข้อมูลในระบบ และจับคู่คอลัมน์ได้

วันที่รองรับ `YYYY-MM-DD` หรือ `วัน/เดือน/ปี` (ค.ศ./พ.ศ.) ประเภทใช้ `รายรับ` / `รายจ่าย` หรือ `INCOME` / `EXPENSE` มีตัวอย่างและข้อผิดพลาดให้ตรวจสอบก่อนยืนยัน **รายการซ้ำจะเพิ่มเป็นรายการใหม่** ไม่มีการเดารายการซ้ำหรือลบทับข้อมูลเดิม

## Build และทดสอบ

```powershell
npm.cmd run build
npm.cmd run start
```

หยุดเซิร์ฟเวอร์ก่อน build บน Windows เพื่อไม่ให้ Prisma DLL ถูกล็อก

```powershell
npm.cmd test
node tests/integration.mjs
node tests/browser.mjs
node tests/workflow.mjs
```

สามคำสั่งท้ายต้องมีเซิร์ฟเวอร์ที่ port 3000 และบัญชีตาม `.env` การทดสอบ integration และ workflow สร้างข้อมูลที่ขึ้นต้น TEST แล้วลบเฉพาะข้อมูลที่สร้างไว้ใน finally; browser test ใช้ Chrome ที่ติดตั้งในเครื่อง เก็บภาพหน้าจอใน `test-results/` ไม่ควรรันหลายชุดพร้อมกันหากต้องการภาพหน้าจอข้อมูลว่าง

## โครงสร้าง

```text
app/page.js                 redirect ไป /dashboard
app/{dashboard,transactions,farms,plots,reports,settings,import,login}/
                            หน้าที่มี URL แยก รองรับ refresh และ bookmark
components/FarmApp.js       เมนูร่วม หน้าจอและฟอร์มบัญชีสวน
app/layout.js               โหลด Prompt จาก Google Fonts ให้ทุกหน้า
app/globals.css             รูปแบบ responsive
app/api/[...path]/route.js  REST API, auth, permissions, import/export
components/                กราฟและหน้าจอนำเข้า (โหลดเมื่อใช้)
lib/db.js                   Prisma client
lib/validation.js           กฎตรวจสอบข้อมูลฝั่ง server
lib/reports.js              การคำนวณยอดและรายงาน
prisma/schema.prisma       User, Session, CropType, Farm, Plot,
                           PlotTreeHistory, Category, Unit, Transaction
prisma/migrations/         migration สำหรับติดตั้งซ้ำได้
prisma/seed.js              ข้อมูลเริ่มต้นแบบไม่ซ้ำ
tests/                     unit, API integration, browser tests
```

API หลักตรงตามสเปก: `/api/transactions`, `/api/farms`, `/api/plots`, `/api/categories` รองรับ GET/POST และ GET/PUT/DELETE ตาม id; เพิ่ม `/api/crop-types`, `/api/units`, `/api/users`, `/api/reports/{monthly,monthly-by-plot,yearly,yearly-by-plot}`, `/api/dashboard/summary`, `/api/import`, `/api/export`

## Supabase + Vercel

ดูขั้นตอนใน [DEPLOY_SUPABASE_VERCEL.md](DEPLOY_SUPABASE_VERCEL.md) และไฟล์ `vercel.json`
ใช้ Supabase PostgreSQL ผ่าน Prisma โดยคงระบบล็อกอินของแอปเดิมไว้
`DATABASE_URL` สำหรับ transaction pooler และ `DIRECT_URL` สำหรับ migration/seed ผ่าน session pooler
บนเครื่องใช้ฐานข้อมูล `farm_2569` ตามเดิม; บน Supabase ใช้ฐานข้อมูล `postgres` และ schema `farm_ledger`
ข้อมูลจริงต้องย้ายแยกต่างหาก การ deploy โค้ดไม่ย้ายรายการบัญชีไปด้วย

## Docker

กำหนด `POSTGRES_PASSWORD` (ใช้ค่าที่ URL-encode ได้อย่างถูกต้อง), `SEED_EMAIL`, `SEED_PASSWORD` ใน `.env` แล้วรัน:

```sh
docker compose up -d --build
docker compose exec web npm run db:seed
```

Docker ใช้ฐานข้อมูล `farm_2569` ของตนเอง ไม่เชื่อมต่อ PostgreSQL บนเครื่อง host; volume `farm_db` เก็บข้อมูลถาวร เว็บเปิด port 3000 และ apply migrations ตอนเริ่มต้น หากมี volume เก่าที่ใช้ชื่อฐานข้อมูลเดิม ต้องสร้างและย้ายฐานข้อมูลใน container ก่อน เพราะการเปลี่ยน POSTGRES_DB ไม่เปลี่ยนชื่อฐานข้อมูลใน volume ที่มีอยู่แล้ว

สำหรับเว็บผ่าน reverse proxy ให้กำหนด `APP_ORIGIN=https://your-domain` และส่ง Host/protocol ของผู้ใช้ต่ออย่างถูกต้อง ใช้ HTTPS เพื่อให้ session cookie เป็น Secure ระบบจำกัดการลองรหัสผ่านผิดในหน่วยความจำต่อ process; หากขยายเป็นหลาย instance ควรย้ายตัวนับไป shared store

## ขอบเขตเวอร์ชันถัดไปตามสเปก

ยังไม่รวมไฟล์ใบเสร็จ, PDF, สต็อก/ปุ๋ย, คนงาน, Harvest/Sale, Budget, Notification, Google/LINE Login, PWA และ Offline Sync ซึ่งเอกสารระบุเป็นงานอนาคตหรือ Version 2 การ deploy ขึ้นบริการภายนอกยังไม่ได้ดำเนินการ

อ้างอิง implementation: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Next.js Cookies](https://nextjs.org/docs/app/api-reference/functions/cookies), [Prisma Migrate Deploy](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
"# la-ong-from" 
