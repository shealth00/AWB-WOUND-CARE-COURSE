# AWB Academy Runbook

Setup:

1. Copy `apps/api/.env.example` to `apps/api/.env` and fill in Postgres + Smartsheet values.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`.
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

- Admin endpoints require `x-admin-key` matching `ADMIN_API_KEY`
- Optional audit headers:
  - `x-awb-actor`
  - `x-awb-role` (`admin` or `ops`)

Nightly sync:

- Controlled by `NIGHTLY_SYNC_CRON`
- Manual refresh: `POST /admin/sync`

LMS-ready endpoints:

- `GET /program/catalog`
- `GET /lcd-updates`
- `POST /progress/lessons`
- `POST /assignments/practical`
- `GET /verify/:certificateId`
- `GET /api/certificates/:certificateId/html`
- `GET /api/certificates/:certificateId/pdf`

Portal downloads:

- `/downloads/awb-wound-documentation-pack.pdf`
- `/downloads/lcd-wound-care-l37166.pdf`

Webhook verification:

- Smartsheet challenge requests must hit `POST /smartsheet/webhook`
- The handler echoes the `Smartsheet-Hook-Challenge` value via `Smartsheet-Hook-Response`

Certificate verification controls:

- Public verification lookups are rate limited.
- Lookup requests are logged with IP address and user agent.
- PDF endpoint requires either admin auth or `CERTIFICATE_PDF_TOKEN`.
