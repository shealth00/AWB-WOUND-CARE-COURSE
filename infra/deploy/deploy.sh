#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${DEPLOY_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
API_SERVICE_NAME="${API_SERVICE_NAME:-awb-api}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-awb-web}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-awb-academy}"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"

cd "$ROOT_DIR"

npm ci
npm run lint
npm run test
npm run build

sudo mkdir -p /etc/awb-academy
sudo cp infra/deploy/systemd/awb-api.service /etc/systemd/system/"$API_SERVICE_NAME".service
sudo cp infra/deploy/systemd/awb-web.service /etc/systemd/system/"$WEB_SERVICE_NAME".service
if [[ -d "$NGINX_SITES_AVAILABLE" ]]; then
  sudo cp infra/deploy/nginx/awb-academy.conf "$NGINX_SITES_AVAILABLE"/"$NGINX_SITE_NAME"
  sudo ln -sfn "$NGINX_SITES_AVAILABLE"/"$NGINX_SITE_NAME" "$NGINX_SITES_ENABLED"/"$NGINX_SITE_NAME"
  sudo rm -f "$NGINX_SITES_ENABLED"/default
else
  sudo cp infra/deploy/nginx/awb-academy.conf "$NGINX_CONF_DIR"/"$NGINX_SITE_NAME".conf
  sudo rm -f "$NGINX_CONF_DIR"/default.conf
fi
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl enable nginx "$API_SERVICE_NAME" "$WEB_SERVICE_NAME"
sudo systemctl restart nginx
sudo systemctl restart "$API_SERVICE_NAME"
sudo systemctl restart "$WEB_SERVICE_NAME"
sudo systemctl --no-pager --full status nginx "$API_SERVICE_NAME" "$WEB_SERVICE_NAME"
