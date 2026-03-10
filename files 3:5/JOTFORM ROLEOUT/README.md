# Platform Rollout Blueprint

`Platform Rollout Blueprint` is a no-dependency frontend prototype that turns the 69-row `platform_screen_inventory.csv` into an admin-first route-by-route execution workspace.

## What it includes

- Full coverage of all 69 screens in the inventory
- Module and feature filtering across Platform, Identity, Forms, Payments, Workflows, Sign, Tables, Inbox, Reports, Store, Automation, Interfaces, and AI
- Shared API, DB object, and permission dependency tracing between routes
- Screen-spec copy/export actions plus full inventory JSON export
- Per-screen implementation checklist with persisted progress
- Admin persona mode with privileged-route scoping and admin-first planning defaults
- Portfolio rollout phase planning across operations, foundation, and AI delivery waves
- Portfolio progress dashboard with module and phase completion rollups
- Progress snapshot export for handoff or status reporting
- Route-level detail for module, feature, screen, route, purpose, components, primary actions, empty state, error state, permissions, APIs, DB objects, and acceptance criteria
- Hash-based route selection so each inventory row is directly addressable in the browser
- Responsive inventory, blueprint, state, contract, and acceptance views

## Run locally

Open [index.html](/Users/izzy/.codex/worktrees/4914/AWB%20WOUND%20CARE%20COURSE/files%203:5/JOTFORM%20ROLEOUT/index.html) directly in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Data source

The runtime dataset in `screen-data.js` is derived from:

- `/Volumes/SERVER MEM3/JOTFORM ROLEOUT/platform_screen_inventory.csv`

The prototype is static and self-contained once `screen-data.js` is present.

## Deploy

The GitHub Actions workflow at `.github/workflows/deploy.yml` deploys the site to `forms.sallyhealth.org` through AWS Systems Manager.

Required repository secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

The workflow targets EC2 instance `i-0ea90189e56dfae1b` in `us-east-1`, downloads the `main` branch archive from GitHub, syncs the site into `/var/www/forms.sallyhealth.org`, and reloads nginx.

## Production Architecture

- Repository: `https://github.com/shealth00/sally-health-forms`
- Region: `us-east-1`
- EC2 instance: `i-0ea90189e56dfae1b`
- Elastic IP: `184.73.109.3`
- Live root: `/var/www/forms.sallyhealth.org`
- Web server: `nginx`
- Deploy trigger: push to `main` or manual run of `Deploy Forms Site`
- Post-deploy check: GitHub Actions verifies `http://184.73.109.3` with `Host: forms.sallyhealth.org`

## Admin Workspace Behavior

- Default persona is `Admin Workspace`
- Admin scope includes screens with any of:
  - `Admin`
  - `Owner`
  - `Security Admin`
  - `Billing Admin`
- Portfolio summaries and progress exports are calculated from the active persona scope
- The selected route stays pinned in the detail canvas even if it falls outside the visible admin scope

## Release Checklist

- Run `node --check app.js`
- Run `node --check screen-data.js`
- Open the app locally and confirm:
  - admin persona is the default
  - switching between `Admin Workspace` and `All Screens` updates counts and progress
  - checklist state persists after reload
  - progress export downloads and includes persona metadata
- Push to `main`
- Confirm the latest `Deploy Forms Site` workflow succeeds
- Verify the instance directly:
  - `curl -I -H 'Host: forms.sallyhealth.org' http://184.73.109.3`
- After DNS cutover, verify:
  - `dig +short forms.sallyhealth.org`
  - `curl -I http://forms.sallyhealth.org`
  - `curl -I https://forms.sallyhealth.org`

## Rollback

- Identify the prior known-good commit on `main`
- Re-run the GitHub Actions deploy workflow from that commit or force-push the prior commit back to `main`
- Re-verify the host-header check against `184.73.109.3`
- If DNS cutover introduces issues, restore the previous A records at the DNS provider

## DNS And HTTPS

DNS is managed outside this repository. `forms.sallyhealth.org` must point to `184.73.109.3` before TLS issuance can succeed.

After DNS resolves to the EC2 instance, run the following on the server:

```bash
sudo apt-get update -y
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d forms.sallyhealth.org
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
```

Expected result:

- `http://forms.sallyhealth.org` redirects to HTTPS
- `https://forms.sallyhealth.org` serves the current build
- automated renewal is configured and dry-run passes

## Handoff

Another operator should be able to own this project with only this repository if they know:

- the public hostname is `forms.sallyhealth.org`
- deploys are performed from GitHub Actions
- the EC2 instance is the runtime target
- the app is intentionally static and client-side only
- admin persona mode is the default operational view

Current external blocker:

- public DNS still needs to point `forms.sallyhealth.org` at `184.73.109.3` if it has not already been cut over
