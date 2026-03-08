# QA and CI/CD

This repository uses a Next.js frontend, an Express API, and npm workspaces. The QA stack in this repo is:

- `Vitest + Supertest` for API validation
- `Playwright` for browser automation
- `GitHub Actions` for QA gates and gated deployment

## Local commands

Install dependencies:

```bash
npm ci
```

Run the unit and API suites:

```bash
npm run test
```

Install the Playwright browser once per machine:

```bash
npx playwright install --with-deps chromium
```

Run the end-to-end browser check:

```bash
npm run test:e2e
```

Run the admin A/B experiment smoke manually:

```bash
curl -sS http://127.0.0.1:4000/api/experiments/catalog-hero/config | jq

curl -sS -X POST http://127.0.0.1:4000/api/experiments/events \
  -H 'Content-Type: application/json' \
  -d '{
    "experimentId":"catalog-hero-v1",
    "variantId":"a",
    "eventType":"impression",
    "sessionKey":"qa-session-a",
    "path":"/?abVariant=a&debug=1",
    "metadata":{"source":"qa-smoke"}
  }'

curl -sS -X POST http://127.0.0.1:4000/api/experiments/events \
  -H 'Content-Type: application/json' \
  -d '{
    "experimentId":"catalog-hero-v1",
    "variantId":"a",
    "eventType":"cta-click",
    "sessionKey":"qa-session-a",
    "path":"/?abVariant=a&debug=1",
    "metadata":{"ctaId":"catalog-primary","href":"#catalog"}
  }'

curl -sS \
  -H 'x-admin-key: development-admin-key' \
  'http://127.0.0.1:4000/api/admin/experiments/report?experimentId=catalog-hero-v1' | jq
```

Run the full verification pass:

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

## CI pipeline

[`deploy.yml`](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/.github/workflows/deploy.yml) runs:

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

The deploy job only runs on pushes to `main`.

## Deploy host configuration

GitHub Actions secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

GitHub Actions variables:

- `DEPLOY_PATH`
- `API_SERVICE_NAME`
- `WEB_SERVICE_NAME`
  Defaults are `awb-api` and `awb-web` if these variables are unset.

## Deploy assets

Checked-in deployment assets:

- [deploy.sh](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/deploy.sh)
- [bootstrap-ubuntu.sh](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/aws/bootstrap-ubuntu.sh)
- [awb-academy.conf](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/nginx/awb-academy.conf)
- [awb-api.service](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/systemd/awb-api.service)
- [awb-web.service](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/systemd/awb-web.service)
- [api.env.example](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/env/api.env.example)
- [web.env.example](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/env/web.env.example)

Recommended host layout:

- repo checkout: `/srv/awb-academy`
- API env file: `/etc/awb-academy/api.env`
- web env file: `/etc/awb-academy/web.env`

## AWS EC2 path

The repo is now prepared for a single-host AWS EC2 deployment:

- Ubuntu 24.04 EC2
- Nginx on `:80`
- Next.js on `127.0.0.1:3000`
- Express API on `127.0.0.1:4000`
- PostgreSQL on the same instance

Optional hardening now supported:

- Managed PostgreSQL on RDS (`DATABASE_URL` with `sslmode=require`)
- Certificate PDF persistence to S3 (`CERTIFICATE_PDF_S3_BUCKET`)
- HTTPS endpoint through CloudFront (`*.cloudfront.net` domain)

Bootstrap a fresh Ubuntu instance with:

```bash
sudo APP_DB_PASSWORD='replace-me' bash infra/deploy/aws/bootstrap-ubuntu.sh
```

Install the systemd units on the host:

```bash
sudo mkdir -p /etc/awb-academy
sudo cp infra/deploy/env/api.env.example /etc/awb-academy/api.env
sudo cp infra/deploy/env/web.env.example /etc/awb-academy/web.env
```

After the repo is synced to `/srv/awb-academy`, run:

```bash
bash infra/deploy/deploy.sh
```

## Runtime environment variables

API environment:

- `PORT`
- `APP_ENV`
- `BASE_URL`
- `ADMIN_API_KEY`
- `NIGHTLY_SYNC_CRON`
- `SMARTSHEET_ACCESS_TOKEN`
- `SMARTSHEET_INTEGRATION_SOURCE`
- `DATABASE_URL`
- `SMARTSHEET_SHEETID_CATALOG`
- `SMARTSHEET_SHEETID_QUESTIONBANK`
- `SMARTSHEET_SHEETID_RESULTS`
- `SMARTSHEET_SHEETID_FORMS`
- `SMARTSHEET_SHEETID_IVR`
- `SMARTSHEET_WEBHOOK_CALLBACK_URL`
- `SMARTSHEET_WEBHOOK_SCOPE`
- `SMARTSHEET_WEBHOOK_SCOPE_OBJECT_ID`
- `SMARTSHEET_WEBHOOK_NAME`
- `SMARTSHEET_WEBHOOK_EVENTS`
- `CERTIFICATE_ISSUER_NAME`
- `CERTIFICATE_ISSUER_LOGO_URL`
- `CERTIFICATE_INSTRUCTOR_NAME`
- `CERTIFICATE_CREDIT_HOURS_DEFAULT`
- `CERTIFICATE_SUPPORT_EMAIL`
- `CERTIFICATE_PDF_TOKEN`
- `CERTIFICATE_WKHTMLTOPDF_BIN`
- `AWS_REGION`
- `CERTIFICATE_PDF_S3_BUCKET`
- `VERIFY_RATE_LIMIT_WINDOW_MS`
- `VERIFY_RATE_LIMIT_MAX`

Web environment:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_ENV`

## Admin QA checklist

Admin-authenticated troubleshooting for the homepage experiment:

1. Open `/?abVariant=a&debug=1` and confirm the variant A headline and debug panel render.
2. Open `/?abVariant=b&debug=1` and confirm the variant B headline and debug panel render.
3. Click the primary CTA in each variant and confirm the URL updates to `#catalog` or the intended route.
4. In Admin, run diagnostics and confirm health, catalog, quiz config, experiment config, and progression all return `OK`.
5. In Admin, load the experiment report and confirm impressions, clicks, and CTR update after the forced-variant clicks.
6. If the report stays empty, inspect `/api/experiments/events` network requests before debugging the report query.

The deploy workflow assumes these runtime values are already present on the target host through environment files, systemd `EnvironmentFile=` configuration, or another secret-management path.
