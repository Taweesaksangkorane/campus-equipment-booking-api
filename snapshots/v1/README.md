# First implementation snapshot

Saved at 2026-10-06 13:37:52 +07:00, before the review improvements in the final source. Contains the initial API and migration. The student subsequently supplied a screenshot of the instructor's Start Exam announcement at 13:25. If that announcement is the official start, minute 30 is 13:55 and this file snapshot precedes it. This is a saved source snapshot, not a Git commit or screenshot taken at minute 30; acceptance as checkpoint evidence requires instructor judgment. Git was initialized later.

Compare `index.ts` with `../../src/index.ts`: the final version adds request size and content-type checks, handles database constraint errors, and updates only supplied PATCH fields.
