# AWB Academy Program Architecture

Delivery model:

- Five distinct catalogs with shared core lessons:
  - Providers
  - Sales Reps / Marketers
  - Distributors
  - Post-Acute & Senior Care
  - ASC / Ortho
- Microlearning format:
  - 6-12 minute videos
  - Downloadables per module
  - Knowledge checks after each module
  - Final exam per track
- LMS portability target:
  - SCORM 1.2
  - SCORM 2004
  - xAPI compatible packaging

LCD handling strategy:

- Teach learners to identify MAC jurisdiction.
- Teach Medicare Coverage Database lookup workflow.
- Teach durable documentation elements instead of assuming one universal LCD rollout.
- Keep an LCD update log visible in the product because MAC policy language evolves over time.

Shared core:

- Core 1: Medicare medical necessity logic
- Core 2: Wound documentation that survives audit
- Core 3: Debridement LCD essentials

Provider track:

- 10 modules
- 6-8 hours
- Final exam: 50 questions
- Pass threshold: 80%
- Requires practical documentation assignment with rubric score >= 80%

Sales / Marketing track:

- 7 modules
- 3-4 hours
- Final exam: 30 questions
- Pass threshold: 80%

Distributor track:

- 6 modules
- 2.5-3.5 hours
- Final exam: 25 questions
- Pass threshold: 80%

Post-Acute & Senior Care track:

- 7 modules
- 4-6 hours
- Final exam: 30 questions
- Pass threshold: 80%
- Operational assignment: facility wound packet upload

ASC / Ortho track:

- 7 modules
- 4-6 hours
- Final exam: 30 questions
- Pass threshold: 80%

Completion rules:

- Watch >= 90% of each lesson
- Complete all module quizzes
- Pass final exam >= 80%
- Provider track: pass practical assignment >= 80%

Certificate requirements:

- Unique certificate ID
- Public verification page
- QR code linking to verification page
- Completion certificate disclaimer when CME/CE is not accredited

Branding and naming:

- Issuer / Company: Advance Wound Biologic
- Domain: advancewoundbiologic.com
- Abbreviation: AWB
- Program umbrella name: AWB Academy
- Master program title: Advanced Wound Care & Skin Grafting
- Track catalogs:
  - Provider Track (Clinical + Documentation + Audit-Ready)
  - Sales & Marketing Track (Access + Evidence + Compliance)
  - Distributor Track (Operations + Traceability + Compliant Support)
  - Post-Acute & Senior Care Track (SNF/NH/ALF/Adult Senior Care)
  - ASC / Ortho Track (Operations + Grafting + Audit-Ready)

Tool library:

- AWB Wound Documentation Pack
- AWB Weekly Wound Rounds Checklist
- AWB Pressure Injury Prevention Bundle
- AWB Escalation Packet Checklist
- AWB Post-Op Graft Care Protocol
- LCD - Wound Care (L37166) reference copy

Current implementation mapping:

- Static program metadata: `packages/lms-core/src/program.ts`
- Program catalog API: `GET /program/catalog`
- LCD update log API: `GET /lcd-updates`
- Lesson progress API: `POST /progress/lessons`
- Practical assignment API: `POST /assignments/practical`
- Certificate verification + QR payload: `GET /verify/:certificateId`
- Static download assets:
  - `apps/web/public/downloads/awb-wound-documentation-pack.pdf`
  - `apps/web/public/downloads/awb-wound-care-dictation-guide.pdf`
  - `apps/web/public/downloads/awb-requirements-clinical-note-review.pdf`
  - `apps/web/public/downloads/awb-assessment-sample-note.pdf`
  - `apps/web/public/downloads/awb-graft-application-sample-note.pdf`
  - `apps/web/public/downloads/awb-ctp-graft-medicare-guidelines.pdf`
  - `apps/web/public/downloads/awb-ctp-assessment-medicare-guidelines.pdf`
  - `apps/web/public/downloads/lcd-wound-care-l37166.pdf`
