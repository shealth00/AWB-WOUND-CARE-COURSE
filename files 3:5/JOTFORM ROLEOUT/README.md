# SallyHealth Forms

`SallyHealth Forms` is a no-dependency frontend prototype for a Jotform-style healthcare workflow suite.

## Included modules

- Drag-and-drop form builder with templates, multi-page forms, field editor, live preview, publish state, and local persistence
- Submission tables with search, status updates, and queue summaries
- Workflow/approval board with automation rules
- E-sign document center with audit trail
- Report dashboard with live metrics
- Mobile app builder concepts for staff and patient experiences
- Integration hub for storage, CRM, messaging, analytics, and payments
- Healthcare security and compliance controls

## Run locally

Open [index.html](/Volumes/SERVER MEM3/AWB WOUND CARE COURSE/files 3:5/JOTFORM ROLEOUT/index.html) directly in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Scope note

This is a frontend product prototype, not a full Jotform replacement. Real parity would require:

- Authentication, accounts, organizations, and billing
- Persistent backend data model and APIs
- Real drag-and-drop workflow builder persistence
- Secure file upload storage, PDF generation, and signature workflows
- Payment processor integrations
- HIPAA/BAA operational controls, audit exports, encryption architecture, and compliance review
