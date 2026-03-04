# Certificate Specification

Data fields:

- `id`
- `learner_full_name`
- `course_track`
- `course_title`
- `completion_date`
- `credit_hours`
- `certificate_id`
- `verification_url`
- `issuer_name`
- `issuer_logo_url`
- `instructor_name`
- `signature_image_url`
- `pdf_url`
- `revoked_at`
- `revoked_reason`
- `created_by`

Platform response shape:

- API returns certificate verification payload with:
  - `certificate_id`
  - `learner_full_name`
  - `track`
  - `course_track`
  - `track_id`
  - `course_title`
  - `completion_date`
  - `issuer_name`
  - `pdf_url`
  - `report_problem_url`
  - `verification_url`
  - `html_url`
  - `qr_data_url`
  - `issued_at`
  - `score`
  - `status`

HTML template:

- Print-ready HTML endpoint: `GET /api/certificates/:certificateId/html`
- Supported query overrides for PDF generation:
  - `learnerName`
  - `instructorName`
  - `creditHours`
- Public verification masks learner name by default; add `?unmasked=true` only for trusted internal use.

Generation rules:

- Certificate IDs follow `AWB-AWC-SG-{TRACKCODE}-{YYYYMMDD}-{RANDOM6}`.
- Track codes:
  - `PROV`
  - `SALES`
  - `DIST`
- Verification QR points to the public certificate verification URL.
- Public verification URL:
  - `https://www.advancewoundbiologic.com/verify/{certificate_id}`
- Issuer branding:
  - `Advance Wound Biologic`
  - `AWB Academy`

Verification controls:

- Verification lookups are logged with IP address, user agent, and timestamp.
- `GET /api/verify/:certificate_id` is rate limited.
- `GET /api/certificates/:certificate_id/pdf` requires admin auth or a token.

PDF generation guidance:

- Current endpoint:
  - `GET /api/certificates/:certificate_id/pdf`
- Renderer approach:
  - `wkhtmltopdf` binary via server-side process execution
- Recommended production alternative:
  - Headless Chromium via Puppeteer or Playwright
- Storage guidance:
  - Persist generated PDFs in S3-compatible object storage and mirror the stored URL into `pdf_url`
