#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${DEPLOY_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
API_SERVICE_NAME="${API_SERVICE_NAME:-awb-api}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-awb-web}"

cd "$ROOT_DIR"

npm ci
npm run lint
npm run test
npm run build

sudo systemctl restart "$API_SERVICE_NAME"
sudo systemctl restart "$WEB_SERVICE_NAME"
sudo systemctl --no-pager --full status "$API_SERVICE_NAME" "$WEB_SERVICE_NAME"
