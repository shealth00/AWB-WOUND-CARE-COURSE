# AWB Academy Runbook

Setup:

1. Copy `apps/api/.env.example` to `apps/api/.env` and fill in Postgres + Smartsheet values.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` (or set `NEXT_PUBLIC_API_BASE_URL` to empty for same-origin `/api`).
3. Install dependencies with `npm install`.
4. Start the API with `npm run dev:api`.
5. Start the web app with `npm run dev:web`.

Required runtime services:

- Postgres reachable from `DATABASE_URL`
- Smartsheet access token with access to the catalog, question bank, results, forms, and IVR sheets

Common commands:

- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run webhook:create --workspace @awb/api`

Admin authentication:

- Login endpoint: `POST /api/admin/login` using `ADMIN_LOGIN_EMAIL` + `ADMIN_LOGIN_PASSWORD`
- Logout endpoint: `POST /api/admin/logout`
- Bearer tokens are accepted by all admin endpoints
- Legacy key auth still works with `x-admin-key` matching `ADMIN_API_KEY`
- Optional audit headers:
  - `x-awb-actor`
  - `x-awb-role` (`admin` or `ops`)

Nightly sync:

- Controlled by `NIGHTLY_SYNC_CRON`
- Manual refresh: `POST /api/admin/sync`
- Demo data reset + reseed: `POST /api/admin/reset`

LMS-ready endpoints:

- `GET /api/program/catalog`
- `GET /api/lcd-updates`
- `POST /api/progress/lessons`
- `POST /api/assignments/practical`
- `GET /api/verify/:certificateId`
- `GET /api/certificates/:certificateId/html`
- `GET /api/certificates/:certificateId/pdf`

Portal downloads:

- `/downloads/awb-wound-documentation-pack.pdf`
- `/downloads/awb-wound-care-dictation-guide.pdf`
- `/downloads/awb-requirements-clinical-note-review.pdf`
- `/downloads/awb-assessment-sample-note.pdf`
- `/downloads/awb-graft-application-sample-note.pdf`
- `/downloads/awb-ctp-graft-medicare-guidelines.pdf`
- `/downloads/awb-ctp-assessment-medicare-guidelines.pdf`
- `/downloads/lcd-wound-care-l37166.pdf`
- `/videos/awb-video-catalog.json`

Webhook verification:

- Smartsheet challenge requests must hit `POST /smartsheet/webhook`
- API-prefixed webhook endpoint is also available at `POST /api/smartsheet/webhook`
- The handler echoes the `Smartsheet-Hook-Challenge` value via `Smartsheet-Hook-Response`

Certificate verification controls:

- Public verification lookups are rate limited.
- Lookup requests are logged with IP address and user agent.
- PDF endpoint requires either admin auth or `CERTIFICATE_PDF_TOKEN`.
