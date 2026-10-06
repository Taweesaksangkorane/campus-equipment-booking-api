# API contract (designed before implementation)

Base URL: `http://localhost:8787/api`

Deployed Base URL: `https://campus-equipment-booking-api.inventory-management-api.workers.dev/api` (31 HTTP test cases passed against Cloudflare Workers + remote D1).

| Method | Path | Success |
|---|---|---|
| GET | /equipment | 200 array |
| GET | /bookings | 200 array |
| GET | /bookings/:id | 200 booking |
| POST | /bookings | 201 booking |
| PATCH | /bookings/:id | 200 booking |
| DELETE | /bookings/:id | 204 empty body |

POST requires equipmentId, borrowerName, startAt, endAt, purpose. PATCH accepts any nonempty subset. Unknown fields are rejected. Text fields must be nonblank (equipmentId <=100, borrowerName <=200, purpose <=1000 characters). Times use canonical UTC ISO format `YYYY-MM-DDTHH:mm:ss.sssZ`, with real calendar dates and startAt < endAt. Responses contain those five fields and a server-generated UUID id.

Writes require Content-Type: application/json. Request bodies are limited to 16 KiB (400 if exceeded). PATCH updates only supplied columns; concurrent edits of different fields do not overwrite omitted fields.

Errors always use `{ "error": "message" }`: 400 invalid JSON/data or nonexistent equipment; 404 unknown booking/route; 409 overlapping booking; 500 unexpected server error.

Intervals are half-open [startAt,endAt): back-to-back bookings are allowed. Conflict rule: existing.startAt < new.endAt AND existing.endAt > new.startAt, for the same equipment. Update excludes its own id. Past bookings are allowed. No authentication or browser client is required by this lab.

Schema: equipment(id TEXT PK, name TEXT NOT NULL, location TEXT NOT NULL) 1 -> N bookings(id TEXT PK, equipmentId TEXT FK, borrowerName TEXT, startAt TEXT, endAt TEXT, purpose TEXT). All booking fields are NOT NULL; time ordering is checked. Index: (equipmentId,startAt,endAt). Canonical UTC strings sort chronologically. SQL triggers enforce overlap rules atomically.

```text
equipment                       bookings
---------                       --------
id TEXT PK          1 ---- N    id TEXT PK
name TEXT                       equipmentId TEXT FK -> equipment.id
location TEXT                   borrowerName TEXT
                                startAt TEXT
                                endAt TEXT
                                purpose TEXT
```

Example POST request (PATCH may send only the fields being changed):

```json
{
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```

Example booking response (id below is illustrative; the server generates a UUID):

```json
{
  "id": "f490a122-0a49-40d5-bcad-719df59ee9b1",
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```

GET /equipment returns an array of `{id,name,location}`. GET /bookings returns an array of booking responses (empty array if none). Missing referenced equipment in POST/PATCH uses 400 because equipmentId is invalid request data; a missing booking identified by the URL uses 404.
