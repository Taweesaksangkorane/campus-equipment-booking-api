# Quality Gate review

Reviewed against the exam brief, rubric, and the eight-area Quality Gate supplied by the student in chat. Initial source was saved in snapshots/v1 at 13:37:52 Bangkok time, before the implementation improvements. The exam start time and minute-30 checkpoint are unverified; this review does not certify the required checkpoint timing.

| Area | What was found | How it was fixed | Evidence |
|---|---|---|---|
| Reliability/Accuracy | Initial PATCH read the old record and wrote all fields back. Concurrent partial edits could overwrite omitted fields. | Update only supplied fields with bound COALESCE parameters; retain SQL time checks and triggers. | Compare snapshots/v1/index.ts to src/index.ts; HTTP case Concurrent partial edits preserved checks both edited values. |
| Implementation/security | Initial implementation had no request-body limit. Large JSON could consume unnecessary resources. | Added 16 KiB bodyLimit with contract-compatible JSON 400. | HTTP case Oversized body returns 400; final API contract documents limit. |
| Reliability/Accuracy | Initial writes parsed JSON without enforcing Content-Type, leaving the HTTP contract ambiguous. | Require application/json for POST/PATCH and return JSON 400 for other types. | HTTP case Wrong content type returns 400; initial snapshot has no such check. |
| Reliability/Accuracy | A constraint failure during a concurrent write could fall through to 500. | Known CHECK and foreign-key errors are mapped to JSON 400; overlap trigger remains 409; unexpected errors remain generic 500. | Source comparison verifies mapping; Reversed time, Merged update invalid time, Unknown equipment, and Concurrent identical writes verify related HTTP rules. A forced database-constraint race was not separately reproduced. |
| Reasoning/You Own It | An application-only check followed by insert would allow two concurrent conflicting bookings. Decisions and AI involvement need to be explainable. | Used database triggers in the initial design, explained half-open intervals and parameter binding in README, and explicitly separated AI verification from student verification. | Concurrent identical writes returns 201+409; AI_LOG.md does not claim student verification. This is a documented design review, not a post-snapshot trigger change. |

Actual remote HTTP statuses and response bodies are in evidence/HTTP_TEST_RESULTS.md; local results are preserved in evidence/LOCAL_HTTP_TEST_RESULTS.md. Cloudflare deployment succeeded and all 31 cases passed remotely. The student must review the implementation and add their own verification to AI_LOG.md before submission.

## Review after receiving the instructor's Quality Gate

| Area | Finding | Action taken | Evidence |
|---|---|---|---|
| Reasoning / You Own It | The earlier review documented the overlap decision but did not provide a direct explanation exercise. An assistant cannot certify the student's ability to explain the solution. | Added OWNERSHIP_CHECK.md with the actual rules, status-code reasons, required versus optional choices, limitations, and questions the student must answer in their own words. | OWNERSHIP_CHECK.md; student completion is pending. This is a documentation improvement, not a claim of demonstrated student understanding. |
| Course Context / You Own It | The AI log's student-verification section had not yet reflected the student's Postman evidence. | Recorded only the cases visibly demonstrated in the submitted screenshots, separated from assistant-run tests. | AI_LOG.md records overlap 409, reversed time 400, and PATCH 200; no claim is made that the student completed all 31 automated tests. |

## Eight-area status

1. Purpose: required equipment and booking endpoints, payloads, statuses and submission files are present.
2. Reliability: local and remote HTTP tests pass, including create/update conflicts and simultaneous writes. D1 stores the data; failed updates preserve existing data.
3. Course Context: TypeScript/Hono/Workers/D1 are used and AI contribution is recorded. Student explanation of the implementation remains to be confirmed by the student.
4. Reasoning: interval/status explanations and assumptions are documented. Student explanation exercise is pending.
5. Execution Value: README contains run/deploy/test commands; 31 remote HTTP cases passed.
6. Accuracy: input/time validation, parameter binding and JSON errors are implemented and tested.
7. Delivery Quality: source, API contract/schema, README, AI log, review, snapshots and HTTP evidence are present. No browser client was built, so CORS is not required. Minute-30 timing remains unverified.
8. You Own It: significant AI assistance and student-visible Postman results are recorded truthfully. The supplied six-page PDF now demonstrates all eleven manual Postman cases, including create/read/update/delete and errors (see evidence/POSTMAN_EVIDENCE_REVIEW.md). The student must still confirm that they can explain each key rule/query and improvement.

## Submission decision

Technical implementation and remote test evidence are complete. Final READY is not certified by the assistant: the student must finish the ownership check and their verification record. If key explanations cannot be given, use DO NOT SUBMIT YET and resolve them. If checkpoint evidence is required and its timing cannot be established, REVIEW WITH INSTRUCTOR; do not backdate or fabricate evidence. Repeat relevant checks if code changes before submission.
