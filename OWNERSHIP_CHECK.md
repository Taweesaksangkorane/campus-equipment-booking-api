# Ownership check before submission

These notes explain the implemented design. Read the source and answer the questions in your own words; the presence of this file does not prove understanding.

## Rules and reasons

- POST requires all five booking fields. PATCH accepts a nonempty subset; it validates the resulting booking and changes only supplied columns.
- A missing equipmentId reference is invalid booking input (400). A missing booking identified by the URL is 404. A valid booking that clashes with an existing booking is 409.
- Intervals use [startAt,endAt). Existing start < new end AND existing end > new start means overlap. Equality at a boundary permits adjacent bookings.
- INSERT and UPDATE triggers check overlap in the database at write time. The UPDATE trigger excludes the row's own id. This protects concurrent requests; a separate application SELECT alone would not protect the subsequent write.
- Every request-derived SQL value uses a placeholder and bind(). SQL syntax is fixed, so request strings cannot change the query structure.
- Equipment is the parent table; bookings.equipmentId references equipment.id. The time index helps locate candidates for the same equipment.
- Required: CRUD, equipment records, validation, conflict prevention, statuses, JSON errors, bound SQL and test evidence. Optional choices: UUID ids, canonical UTC input, body-size limits, Content-Type checking and Cloudflare deployment.
- Limitations: no authentication, no browser frontend, no pagination, and timestamps require the documented UTC format. Only simulated lab data should be used on the public API. Minute-30 snapshot timing has not been established.

## Explain without copying these notes

1. Why does 09:00-11:00 conflict with 10:00-12:00 but allow 11:00-12:00?
2. Why must the PATCH trigger exclude its own booking id?
3. What can happen if two POST requests both perform a conflict SELECT before INSERT?
4. How do placeholders and bind() differ from interpolating an id into SQL?
5. What does PATCH with only purpose change? How are concurrent edits of omitted fields protected?
6. Why are 400, 404, 409 and 204 used in this implementation?
7. Where are the D1 binding, schema, routes and test evidence? How do local and remote D1 differ?
8. Which changes were made after the initial snapshot, and which tests verify them?

Record your actual answers/checks and any remaining questions in AI_LOG.md before submission. Do not mark understanding or verification as complete until personally demonstrated.

## คำตอบประกอบการทบทวน (AI ช่วยร่าง)

คำตอบด้านล่างเป็นคำอธิบายจาก AI ตาม implementation จริง ผู้เรียนยังต้องอ่าน source และลองอธิบายเอง จึงจะยืนยันความเข้าใจได้

1. **ทำไม 09:00–11:00 ชนกับ 10:00–12:00 แต่ไม่ชนกับ 11:00–12:00?**
   ช่วงแรกมีเวลาร่วมกันคือ 10:00–11:00 จึงชนกัน ใช้เงื่อนไข `existing.startAt < new.endAt AND existing.endAt > new.startAt` ส่วนรายการใหม่ที่เริ่ม 11:00 พอดีกับรายการเดิมจบไม่มีเวลาร่วมกัน เพราะใช้ช่วงแบบ [startAt,endAt) และเครื่องหมายเปรียบเทียบไม่รวมความเท่ากัน

2. **ทำไม PATCH trigger ต้องตัด id ตัวเองออก?**
   PATCH แก้แถวที่มีอยู่แล้ว หากตรวจแถวนั้นด้วย อาจพบว่าช่วงเวลาใหม่ทับกับช่วงเดิมของตัวเอง จึงต้องใช้ `id != NEW.id` เพื่อให้ตรวจเฉพาะ booking อื่น

3. **สอง POST ที่ SELECT ก่อน INSERT พร้อมกันอาจเกิดอะไร?**
   ทั้งสองคำขออาจอ่านว่าช่วงเวลายังว่างก่อนมีใครบันทึก แล้ว INSERT เวลาที่ชนกันได้ การตรวจด้วย SELECT แยกจากการเขียนจึงไม่เพียงพอ ระบบนี้ใช้ BEFORE INSERT/UPDATE trigger ตรวจตอนเขียนในฐานข้อมูล และ RAISE(ABORT, 'BOOKING_CONFLICT') เมื่อชนกัน ทดสอบพร้อมกันแล้วได้หนึ่ง 201 และอีกหนึ่ง 409

4. **placeholder และ bind() ต่างจากต่อ id เข้า SQL อย่างไร?**
   SQL ของเราเขียนโครงสร้างคงที่ เช่น `SELECT * FROM bookings WHERE id = ?` แล้ว `.bind(id)` ส่ง id เป็นข้อมูล แม้มีอักขระ SQL ใน id ก็ยังเป็นค่าที่ใช้ค้นหา การต่อ input เข้า string SQL โดยตรงอาจทำให้ input เปลี่ยนโครงสร้างคำสั่งและเกิด SQL injection

5. **PATCH เฉพาะ purpose ทำอะไร และป้องกันการทับฟิลด์ที่ไม่ได้ส่งอย่างไร?**
   เปลี่ยนเฉพาะ purpose โดยคงค่าอื่นเดิม SQL ใช้ `COALESCE(?, column)` ทุกฟิลด์ และ bind null สำหรับฟิลด์ที่ไม่ได้ส่ง จึงใช้ค่าปัจจุบันในฐานข้อมูลของฟิลด์นั้น ไม่ใช่นำค่าจากการอ่านก่อนหน้ามาเขียนทับ หากสองคำขอแก้คนละฟิลด์ การแก้ไขทั้งสองจึงอยู่ครบ หากแก้ฟิลด์เดียวกัน ค่าจากคำขอที่เขียนทีหลังจะเป็นค่าปัจจุบัน CHECK และ trigger ยังคงตรวจช่วงเวลาและ overlap ตอนเขียน

6. **ทำไมใช้ 400, 404, 409 และ 204?**
   400 คือ request มีข้อมูลผิดหรือขาด เช่น equipmentId อ้างถึงอุปกรณ์ที่ไม่มี หรือ startAt ไม่ก่อน endAt; 404 คือ booking ใน URL ไม่มีอยู่; 409 คือข้อมูลจองผ่าน validation แต่ชนกับ booking ที่มีอยู่; 204 คือ DELETE สำเร็จและไม่มี response body โดย error ของ API ส่ง JSON รูปแบบ `{ "error": "..." }`

7. **ไฟล์สำคัญอยู่ไหน และ local/remote D1 ต่างกันอย่างไร?**
   `wrangler.jsonc` กำหนด binding DB และ database_id; `migrations/0001_initial.sql` มี schema, อุปกรณ์สองรายการ, index และ triggers; `src/index.ts` มี routes/validation/bound SQL; `evidence/HTTP_TEST_RESULTS.md` มีผล remote 31 เคส; `evidence/LOCAL_HTTP_TEST_RESULTS.md` มีผล local; `evidence/testapipostman.pdf` มีภาพ Postman ของผู้เรียน Local D1 เก็บข้อมูลใน `.wrangler/state` ของเครื่อง ส่วน remote D1 อยู่บน Cloudflare ทั้งสองแยกข้อมูลกัน ใช้ migrations apply --local หรือ --remote เลือกเป้าหมาย

8. **เปลี่ยนอะไรหลัง initial snapshot และตรวจด้วยอะไร?**
   เปลี่ยน PATCH จากเขียนทุกฟิลด์ที่อ่านมาเป็นเขียนเฉพาะฟิลด์ที่ส่ง ตรวจด้วย Concurrent partial edits preserved; เพิ่ม body limit 16 KiB ตรวจด้วย Oversized body ได้ 400; เพิ่มการตรวจ Content-Type ตรวจด้วย Wrong content type ได้ 400; เพิ่มการแปลง CHECK/FK constraint errors เป็น JSON 400 ตรวจ source comparison และเคส validation ที่เกี่ยวข้อง แต่ยังไม่ได้จำลอง constraint race เจาะจง หลังได้รับ Quality Gate เพิ่มคำอธิบาย ownership และบันทึกหลักฐาน Postman ตามจริง เปรียบเทียบโค้ดก่อนปรับปรุงได้ใน snapshots/v1 ซึ่งบันทึกเวลาไว้ แต่ยังยืนยัน checkpoint นาทีที่ 30 ไม่ได้
