# AI Use Log

## Important prompt

The campus equipment booking brief and rubric were provided to AI, and AI was asked to help implement and review the API step by step using TypeScript/Hono, D1, and Cloudflare Workers.

## What AI contributed

AI assisted with:
- API contract and schema design
- TypeScript/Hono routes
- D1 migration, overlap triggers, validation, and parameter binding
- Test cases and HTTP test scripts
- Cloudflare deployment guidance and execution
- Quality Gate review
- Ownership-review explanations and documentation

The implementation was checked against the assignment requirements and verified through typechecking and HTTP tests.

## Verification performed with AI assistance

- TypeScript typecheck passed.
- D1 migration was applied successfully to local and remote D1.
- Equipment seed data was created.
- CRUD, validation, overlap, not-found, and conflict cases were tested.
- Concurrent conflicting inserts produced one success and one conflict.
- Concurrent partial updates to different fields preserved both edits.
- The API was deployed to Cloudflare Workers and tested against the deployed Base URL.
- All 31 automated HTTP cases passed remotely. Detailed results are recorded in evidence/HTTP_TEST_RESULTS.md; local results are in evidence/LOCAL_HTTP_TEST_RESULTS.md.

## Verification performed by the student

The student manually tested the deployed API using Postman.

The submitted Postman evidence shows:
- GET equipment -> 200
- POST booking -> 201
- GET bookings -> 200
- GET one booking -> 200
- Overlapping booking -> 409
- Unknown equipment -> 400
- Invalid time range -> 400
- Missing field -> 400
- PATCH booking -> 200
- DELETE booking -> 204
- GET deleted booking -> 404

These screenshots verify the individual HTTP cases shown. The evidence is in evidence/testapipostman.pdf, with page references and limitations in evidence/POSTMAN_EVIDENCE_REVIEW.md.

Before submission, the student should review the main routes, overlap rule, status-code decisions, D1 binding, schema, and parameter binding.

## Ownership review

AI helped draft explanations for the ownership questions in OWNERSHIP_CHECK.md.

The student is responsible for reviewing the source code and being able to explain, in their own words:
- overlap detection
- PATCH self-exclusion
- concurrent booking conflicts
- placeholders and bind()
- partial PATCH behaviour
- 400 / 404 / 409 / 204 status codes
- local versus remote D1
- changes made after the Quality Gate

The AI-assisted answers are study notes and do not replace the student's own understanding.
