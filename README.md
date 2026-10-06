# Campus Equipment Booking API

TypeScript + Hono บน Cloudflare Workers ใช้ D1 binding ชื่อ `DB` ไม่มี frontend

เปิด Base API URL ที่ลงท้าย `/api` ได้โดยตรง: GET `/api` ส่งชื่อ API และรายการ endpoints เป็น JSON (200)

Deploy สำเร็จบน Cloudflare Workers และทดสอบ remote ผ่าน 31 เคสแล้ว Base API URL: `https://campus-equipment-booking-api.inventory-management-api.workers.dev/api` หลักฐาน remote อยู่ใน `evidence/HTTP_TEST_RESULTS.md` และ local ใน `evidence/LOCAL_HTTP_TEST_RESULTS.md` Import `postman/Campus-Equipment-Booking-Cloudflare.postman_collection.json` เพื่อทดสอบ URL จริง

## 1. ติดตั้งและรัน local

ต้องมี Node.js 22 ขึ้นไป (ทดสอบด้วย Node 24) บน PowerShell ใช้ `.cmd` เพื่อหลีกเลี่ยงปัญหา execution policy

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run db:migrate
npm.cmd run dev
```

เปิดอีก terminal:

```powershell
curl.exe -i http://localhost:8787/api/equipment
npm.cmd test
```

`npm test` ส่ง HTTP จริงไปที่ local server บันทึก request/status/response ใน `evidence/HTTP_TEST_RESULTS.md` และลบเฉพาะ booking ที่ทดสอบสร้างขึ้น ต้องเปิด server ไว้ก่อน ฐานข้อมูล local เก็บใน `.wrangler/state` และแยกจาก remote D1

## 2. ทดสอบด้วย curl บน PowerShell

```powershell
$bookingJson = '{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}'
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'booking.json'), $bookingJson)
curl.exe -i -X POST http://localhost:8787/api/bookings -H "Content-Type: application/json" --data-binary "@booking.json"
curl.exe -i http://localhost:8787/api/bookings
```

ส่ง POST เดิมซ้ำจะได้ 409 จากนั้นใช้ `id` ใน response สำหรับ GET/PATCH/DELETE:

```powershell
$bookingId = 'ใส่-id-จาก-response'
curl.exe -i "http://localhost:8787/api/bookings/$bookingId"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'patch.json'), '{"purpose":"Updated presentation"}')
curl.exe -i -X PATCH "http://localhost:8787/api/bookings/$bookingId" -H "Content-Type: application/json" --data-binary "@patch.json"
curl.exe -i -X DELETE "http://localhost:8787/api/bookings/$bookingId"
```

## 3. Deploy ไป Cloudflare Workers + D1

สถานะปัจจุบัน: สร้าง D1 remote แล้ว ตั้งค่า binding `DB` และ database_id จริงแล้ว apply migration และ deploy สำเร็จ พร้อมทดสอบ URL จริงผ่าน 31 เคส คำสั่ง login/create ด้านล่างเป็นขั้นตอนสำหรับตั้งค่าครั้งแรก ไม่ต้องสร้างฐานข้อมูลซ้ำ:

```powershell
npx.cmd wrangler login
npx.cmd wrangler d1 create campus-equipment-booking
```

สำหรับการตั้งค่าใหม่ ให้ใส่ `database_id` จากผลลัพธ์ใน `wrangler.jsonc` คง binding `DB` และ database_name ให้ตรงกับที่สร้าง โปรเจกต์ปัจจุบันตั้งค่าแล้ว

```powershell
npx.cmd wrangler d1 migrations apply DB --remote
npm.cmd run deploy
```

ใช้ URL ที่ Wrangler แสดงหลัง deploy:

```powershell
curl.exe -i https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api/equipment
$env:BASE_URL = 'https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api'
npm.cmd test
Remove-Item Env:BASE_URL
```

Remote test จะสร้างและลบข้อมูลทดสอบใน D1 จริง URL ตัวอย่างด้านบนเป็น placeholder API ของ lab ไม่มี authentication; เมื่อ deploy URL สามารถเรียกอ่านและแก้ไข booking ได้ จึงควรใช้ข้อมูลสมมติสำหรับการสอบ

## 4. เอกสารและจุดที่ต้องอธิบายได้

- `API_CONTRACT.md`: endpoints, payloads, statuses, assumptions และ schema
- `migrations/0001_initial.sql`: equipment สองรายการ, FK, index และ overlap triggers
- `src/index.ts`: validation, CRUD และ parameter binding
- `evidence/HTTP_TEST_RESULTS.md`: ผล HTTP ที่รันจริง
- `evidence/testapipostman.pdf`: หลักฐาน Postman ที่ผู้ใช้ส่งมา ครบ 11 เคสใน 6 หน้า พร้อมสรุปใน `evidence/POSTMAN_EVIDENCE_REVIEW.md`
- `snapshots/v1/`: โค้ดก่อนปรับปรุงจาก review
- `QUALITY_GATE_REVIEW.md`, `AI_LOG.md`: review และบันทึก AI ตามจริง

สูตรเวลาทับซ้อนคือ `existing.startAt < new.endAt AND existing.endAt > new.startAt` ใช้ `<`/`>` เพราะเวลาสิ้นสุดตรงกับเวลาเริ่มของอีก booking ถือว่าไม่ทับกัน Trigger ตรวจในฐานข้อมูลขณะเขียน จึงป้องกันคำขอพร้อมกันได้ PATCH trigger ตัด id ตัวเองออก ส่วน SQL ทุกค่าจาก request ใช้ `?` และ `.bind()`

400 คือข้อมูลไม่ถูกต้อง; 404 คือหา resource ไม่เจอ; 409 คือข้อมูลถูกต้องแต่ขัดกับ booking ที่มีอยู่ DELETE สำเร็จเป็น 204 และไม่มี body เวลาใช้ UTC แบบเดียวกันทุก record เพื่อเปรียบเทียบ TEXT ได้ถูกต้อง

ได้รับ Quality Gate ทั้ง 8 ด้านจากผู้ใช้ในแชตแล้ว และอัปเดต `QUALITY_GATE_REVIEW.md` ตาม checklist นี้ ผู้เรียนต้องตรวจ `OWNERSHIP_CHECK.md` และบันทึกผลตรวจของตนเองใน `AI_LOG.md` ก่อนส่ง หลักฐานเวลา checkpoint นาทีที่ 30 ยังไม่ได้ยืนยัน

อ้างอิง Cloudflare: [local development](https://developers.cloudflare.com/d1/best-practices/local-development/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
