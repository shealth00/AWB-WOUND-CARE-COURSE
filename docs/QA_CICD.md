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
- [awb-api.service](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/systemd/awb-api.service)
- [awb-web.service](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/systemd/awb-web.service)
- [api.env.example](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/env/api.env.example)
- [web.env.example](/Volumes/SERVER%20MEM3/AWB%20WOUND%20CARE%20COURSE/infra/deploy/env/web.env.example)

Recommended host layout:

- repo checkout: `/srv/awb-academy`
- API env file: `/etc/awb-academy/api.env`
- web env file: `/etc/awb-academy/web.env`

Install the systemd units on the host:

```bash
sudo cp infra/deploy/systemd/awb-api.service /etc/systemd/system/
sudo cp infra/deploy/systemd/awb-web.service /etc/systemd/system/
sudo mkdir -p /etc/awb-academy
sudo cp infra/deploy/env/api.env.example /etc/awb-academy/api.env
sudo cp infra/deploy/env/web.env.example /etc/awb-academy/web.env
sudo systemctl daemon-reload
sudo systemctl enable awb-api awb-web
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
- `VERIFY_RATE_LIMIT_WINDOW_MS`
- `VERIFY_RATE_LIMIT_MAX`

Web environment:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_ENV`

The deploy workflow assumes these runtime values are already present on the target host through environment files, systemd `EnvironmentFile=` configuration, or another secret-management path.
