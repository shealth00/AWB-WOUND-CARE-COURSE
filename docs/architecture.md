# AWB Academy Architecture

Monorepo layout:

- `apps/web`: Next.js App Router frontend for catalog, lessons, quiz, forms, completion, admin, and certificate verification
- `apps/api`: Express API backed by Postgres and Smartsheet
- `packages/smartsheet-client`: typed Smartsheet API wrapper
- `packages/lms-core`: shared domain logic for quiz assembly, quiz grading, certificate IDs, IVR routing, and program metadata

Backend responsibilities:

- Sync `AWB_COURSE_CATALOG` and `AWB_QUESTION_BANK` from Smartsheet into Postgres
- Serve published course catalog and lesson content from Postgres cache
- Expose a program catalog for shared-core plus five track-specific learning paths
- Assemble quizzes by module and difficulty, score submissions, persist attempts, and write summary rows to Smartsheet results
- Track lesson completion against a 90% watch threshold and support provider practical assignments
- Issue and verify certificates with revocation support and QR-backed public verification
- Render print-ready certificate HTML and token-protected PDF output
- Accept form submissions and IVR intake, persist locally, and write operational rows plus attachments to Smartsheet
- Receive Smartsheet webhook verification challenges and event payloads
- Log admin actions and sync runs
- Log certificate verification lookups and rate-limit the public verification API

Primary API routes:

- `GET /program/catalog`
- `GET /lcd-updates`
- `GET /catalog`
- `GET /lessons/:lessonId`
- `POST /progress/lessons`
- `GET /quiz`
- `POST /quiz/submit`
- `POST /assignments/practical`
- `GET /completion/:userId`
- `GET /verify/:certificateId`
- `GET /api/verify/:certificateId`
- `GET /api/certificates/:certificateId/html`
- `GET /api/certificates/:certificateId/pdf`
- `POST /forms/submit`
- `POST /ivr/events`
- `POST /smartsheet/webhook`
- `POST /admin/sync`
- `GET /admin/forms`
- `GET /admin/dashboard`
- `POST /admin/share-sheet`
- `POST /admin/certificates/:certificateId/revoke`
- `POST /api/certificates`
- `POST /api/certificates/:certificateId/revoke`

Static portal assets:

- AWB dictation guide and LCD reference PDFs are served from `apps/web/public/downloads`
- Tool library and documentation-pack metadata are defined in `packages/lms-core/src/program.ts`
