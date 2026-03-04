#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${DEPLOY_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
API_SERVICE_NAME="${API_SERVICE_NAME:-awb-api}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-awb-web}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-awb-academy}"

cd "$ROOT_DIR"

npm ci
npm run lint
npm run test
npm run build

sudo mkdir -p /etc/awb-academy
sudo cp infra/deploy/systemd/awb-api.service /etc/systemd/system/"$API_SERVICE_NAME".service
sudo cp infra/deploy/systemd/awb-web.service /etc/systemd/system/"$WEB_SERVICE_NAME".service
sudo cp infra/deploy/nginx/awb-academy.conf /etc/nginx/sites-available/"$NGINX_SITE_NAME"
sudo ln -sfn /etc/nginx/sites-available/"$NGINX_SITE_NAME" /etc/nginx/sites-enabled/"$NGINX_SITE_NAME"
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl enable nginx "$API_SERVICE_NAME" "$WEB_SERVICE_NAME"
sudo systemctl restart nginx
sudo systemctl restart "$API_SERVICE_NAME"
sudo systemctl restart "$WEB_SERVICE_NAME"
sudo systemctl --no-pager --full status nginx "$API_SERVICE_NAME" "$WEB_SERVICE_NAME"
