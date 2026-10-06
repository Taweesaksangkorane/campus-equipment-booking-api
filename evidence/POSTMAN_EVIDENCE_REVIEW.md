# Student Postman evidence review

Source: testapipostman.pdf, supplied by the student, six pages. Copied unchanged into this directory and visually inspected by the assistant.

Base API URL: https://campus-equipment-booking-api.inventory-management-api.workers.dev/api

| PDF page | Test | Observed result |
|---|---|---|
| 1 | GET equipment | 200; eq-1 Projector A and eq-2 Camera B |
| 1 | POST booking | 201; response includes generated id and eq-2 booking fields |
| 2 | GET booking list | 200; JSON array |
| 2 | GET one booking | 200; booking response |
| 3 | POST overlapping booking | 409; JSON error |
| 3 | POST unknown equipment | 400; equipmentId does not exist |
| 4 | POST reversed time | 400; startAt must be before endAt |
| 4 | POST missing field | 400; borrowerName is required |
| 5 | PATCH purpose | 200; purpose is Updated from Postman |
| 5 | DELETE booking | 204; empty response body |
| 6 | GET deleted booking | 404; Booking not found |

This covers required CRUD and invalid input/not found/conflict cases, exceeding the five-case minimum. Screenshots show the deployed host, method and status. Zoom the PDF to read smaller text. Create/read/update evidence uses eq-2; the overlap test uses eq-1, so the overlap screenshot demonstrates a conflict against a stored eq-1 booking rather than necessarily the booking created on page 1. Automated remote evidence independently covers overlaps against a known created booking, adjacency and concurrent requests in HTTP_TEST_RESULTS.md.

These are student-supplied HTTP-client results. They do not prove checkpoint timing or the student's ability to explain the source. Those remain separate checks.
