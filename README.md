# Campus Equipment Booking API

A TypeScript/Hono API deployed on Cloudflare Workers with a D1 database bound as `DB`. This project has no frontend.

GET `/api` returns the API name and available endpoints as JSON with status 200.

Base API URL: `https://campus-equipment-booking-api.inventory-management-api.workers.dev/api`

Deployment succeeded and all 31 automated HTTP cases passed against remote D1. Remote evidence is in `evidence/HTTP_TEST_RESULTS.md`; local evidence is in `evidence/LOCAL_HTTP_TEST_RESULTS.md`. Import `postman/Campus-Equipment-Booking-Cloudflare.postman_collection.json` to test the deployed API.

## 1. Install and run locally

Use Node.js 22 or later (tested with Node.js 24). On Windows PowerShell, use `.cmd` commands to avoid script execution policy issues.

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run db:migrate
npm.cmd run dev
```

Keep the server running and open another terminal:

```powershell
curl.exe -i http://localhost:8787/api/equipment
npm.cmd test
```

`npm test` sends real HTTP requests to the local server, writes request/status/response evidence to `evidence/HTTP_TEST_RESULTS.md`, and deletes only bookings created by the test script. Running it again overwrites that evidence file; preserve existing results first if needed. Local D1 data is stored in `.wrangler/state` and is separate from remote D1.

## 2. Test with curl in PowerShell

```powershell
$bookingJson = '{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}'
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'booking.json'), $bookingJson)
curl.exe -i -X POST http://localhost:8787/api/bookings -H "Content-Type: application/json" --data-binary "@booking.json"
curl.exe -i http://localhost:8787/api/bookings
```

Creating the same booking again returns 409. Use the `id` from a successful 201 response for GET/PATCH/DELETE:

```powershell
$bookingId = 'replace-with-id-from-response'
curl.exe -i "http://localhost:8787/api/bookings/$bookingId"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'patch.json'), '{"purpose":"Updated presentation"}')
curl.exe -i -X PATCH "http://localhost:8787/api/bookings/$bookingId" -H "Content-Type: application/json" --data-binary "@patch.json"
curl.exe -i -X DELETE "http://localhost:8787/api/bookings/$bookingId"
```

Choose an unbooked interval for the initial POST. If the interval is already booked, the API correctly returns 409.

## 3. Deploy to Cloudflare Workers and D1

The current remote database, binding, migrations, and deployment are already configured. The login/create commands below describe first-time setup; do not recreate the existing database.

```powershell
npx.cmd wrangler login
npx.cmd wrangler d1 create campus-equipment-booking
```

For a new deployment, copy the returned `database_id` into `wrangler.jsonc`, keep the binding name `DB`, and match `database_name` to the created database. This repository already contains the configured database ID.

```powershell
npx.cmd wrangler d1 migrations apply DB --remote
npm.cmd run deploy
```

Test the deployed API:

```powershell
curl.exe -i https://campus-equipment-booking-api.inventory-management-api.workers.dev/api/equipment
$env:BASE_URL = 'https://campus-equipment-booking-api.inventory-management-api.workers.dev/api'
npm.cmd test
Remove-Item Env:BASE_URL
```

Remote tests create and delete test bookings in the real D1 database. The deployed lab API is public and has no authentication, so use simulated data.

## 4. Submission files and implementation explanations

- `API_CONTRACT.md`: endpoints, payloads, status codes, assumptions, and schema.
- `migrations/0001_initial.sql`: two equipment records, foreign key, index, and overlap triggers.
- `src/index.ts`: validation, CRUD, and parameter binding.
- `evidence/HTTP_TEST_RESULTS.md`: automated remote HTTP results.
- `evidence/LOCAL_HTTP_TEST_RESULTS.md`: preserved automated local HTTP results.
- `evidence/testapipostman.pdf`: student-supplied Postman evidence, 11 cases across six pages, summarized in `evidence/POSTMAN_EVIDENCE_REVIEW.md`.
- `snapshots/v1/`: the initial source before review improvements.
- `QUALITY_GATE_REVIEW.md` and `AI_LOG.md`: review findings and the record of AI assistance and verification.

The overlap rule is `existing.startAt < new.endAt AND existing.endAt > new.startAt`. Strict comparisons permit adjacent bookings where one ends exactly when another starts. Database triggers check overlaps at write time, including concurrent requests. The update trigger excludes the booking's own ID. Every request-derived SQL value uses a `?` placeholder and `.bind()`.

Status 400 means invalid request data, including a nonexistent equipment reference. Status 404 means the requested booking or route was not found. Status 409 means a valid booking conflicts with an existing booking. Successful DELETE returns 204 with no response body. All timestamps use the same canonical UTC format so TEXT comparisons preserve chronological order.

The work was reviewed against all four instructor documents and all eight Quality Gate areas. The student should review `OWNERSHIP_CHECK.md` before submission. The supplied Start Exam announcement shows 13:25, making the 30-minute checkpoint 13:55 if that announcement is the official start. The source snapshot saved at 13:37:52 precedes that checkpoint, but it is a saved file snapshot rather than a contemporaneous commit or screenshot. Instructor acceptance of that evidence format remains to be confirmed.

Cloudflare references: [local development](https://developers.cloudflare.com/d1/best-practices/local-development/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
