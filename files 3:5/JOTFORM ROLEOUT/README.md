# Platform Rollout Blueprint

`Platform Rollout Blueprint` is a no-dependency frontend prototype that turns the 69-row `platform_screen_inventory.csv` into a route-by-route design workspace.

## What it includes

- Full coverage of all 69 screens in the inventory
- Module and feature filtering across Platform, Identity, Forms, Payments, Workflows, Sign, Tables, Inbox, Reports, Store, Automation, Interfaces, and AI
- Shared API, DB object, and permission dependency tracing between routes
- Screen-spec copy/export actions plus full inventory JSON export
- Per-screen implementation checklist with persisted progress
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
