# AWB Academy Course Pack (Implementation-Ready)

## Launch Assumptions
- Deployment model: standalone LMS on one domain using same-origin API (`/api/*`).
- Launch tracks: 5 tracks live at launch (`providers`, `sales-marketers`, `post-acute-senior-care`, `distributors`, `asc-ortho`).
- Completion policy: lesson completion >=90% watched (or explicit manual complete), module quiz >=80%, final exam >=80%.

## Learner Play-by-Play Flow
1. User logs in and selects a track from Catalog.
2. User enters module sequence; each lesson is linear and has `Mark Complete`.
3. Module quiz unlocks only after all module lessons are complete.
4. Next module unlocks only after passing the current module quiz.
5. Final exam unlocks only after all module quizzes are passed.
6. Completion page shows requirements checklist and eligibility state.
7. Certificate is generated with PDF download and public verification URL.

## Program Topology
- Shared Core (all tracks): `C1` to `C4`
- Provider specialization: `P1` to `P5`
- Sales specialization: `S1` to `S4`
- Facility specialization: `F1` to `F4`
- Distributor specialization: `D1` to `D3`
- ASC/Ortho specialization: `O1` to `O2`

## Shared Core Modules
### C1 Medicare LCD Reality + Coverage Language
- `C1-L1`: LCD vs NCD vs Articles + MAC variation (8m)
- `C1-L2`: How denials happen from documentation gaps (8m)
- `C1-L3`: AWB 4-step workflow: find policy -> document -> trend -> escalate (8m)
- Quiz: 10 questions

### C2 Audit-Ready Wound Documentation
- `C2-L1`: Wound identity, etiology, staging (8m)
- `C2-L2`: Measuring LxWxD + undermining/tunneling (8m)
- `C2-L3`: Tissue, exudate, periwound, infection status (8m)
- `C2-L4`: Plan of care + objective trend updates (8m)
- Quiz: 10 questions

### C3 Debridement Documentation Mastery
- `C3-L1`: What is debridement vs non-debridement care (8m)
- `C3-L2`: Depth removed vs visible depth (8m)
- `C3-L3`: Required note elements and sq cm reporting (8m)
- Quiz: 10 questions

### C4 Escalation to Advanced Modalities + Grafting/CTP
- `C4-L1`: Standard of care by wound type (8m)
- `C4-L2`: Stalled healing and objective trend triggers (8m)
- `C4-L3`: Escalation packet assembly (records/labs/photos) (8m)
- Quiz: 10 questions

## Provider Track
### P1 Advanced Assessment + Etiology Differentiation
- `P1-L1`: DFU/VLU/pressure/arterial/surgical differentiation (8m)
- `P1-L2`: Perfusion screening + vascular documentation (8m)
- `P1-L3`: Neuropathy + offloading documentation (8m)
- Quiz: 10 questions

### P2 Infection, Biofilm, Inflammation
- `P2-L1`: Local vs systemic infection recognition (8m)
- `P2-L2`: Culture strategy + follow-up documentation (8m)
- `P2-L3`: Antibiotic stewardship for wound teams (8m)
- Quiz: 10 questions

### P3 Standard of Care Execution
- `P3-L1`: DFU offloading workflow + adherence barriers (8m)
- `P3-L2`: VLU compression workflow + contraindications (8m)
- `P3-L3`: Pressure injury staging + prevention documentation (8m)
- Quiz: 10 questions

### P4 Skin Grafting Fundamentals
- `P4-L1`: Recipient bed readiness checklist (8m)
- `P4-L2`: Fixation + dressing stack + immobilization (8m)
- `P4-L3`: Complication documentation + stop rules (8m)
- Quiz: 10 questions

### P5 CTP/Skin Substitutes
- `P5-L1`: Application note fields (lot/exp/size/units/waste) (8m)
- `P5-L2`: Repeat application response tracking + stop rules (8m)
- `P5-L3`: Appeals packet documentation fundamentals (8m)
- Quiz: 10 questions

### Provider Final Exam
- 50 randomized questions
- Pass threshold: 80%
- Certificate: `AWB Advanced Wound Care & Skin Grafting - Provider Track`

## Sales/Marketing Track
### S1 Wound Care Essentials for Commercial Teams
- `S1-L1`: Wound types and baseline SOC overview (8m)
- `S1-L2`: What stalled healing means in practice (8m)
- `S1-L3`: Commercial role boundaries (8m)
- Quiz: 10 questions

### S2 Coverage Language + Compliance Boundaries
- `S2-L1`: What you can say and never say (8m)
- `S2-L2`: No coding steering / no clinical direction (8m)
- `S2-L3`: Routing payer questions correctly (8m)
- Quiz: 10 questions

### S3 Evidence + Claims
- `S3-L1`: Evidence hierarchy + endpoints (8m)
- `S3-L2`: Discussing outcomes without overclaiming (8m)
- `S3-L3`: Objection handling scripts (compliant) (8m)
- Quiz: 10 questions

### S4 Field Execution Playbook
- `S4-L1`: Clinic onboarding checklist (8m)
- `S4-L2`: Denial support through documentation workflow (8m)
- `S4-L3`: Stakeholder mapping (provider/biller/admin) (8m)
- Quiz: 10 questions

### Sales Final Exam
- 40 randomized questions
- Pass threshold: 80%
- Certificate: `AWB Market Access & Compliance - Sales/Marketing Track`

## Facility Track (SNF/NH/ALF/Senior Care)
### F1 Interdisciplinary Workflow (IDT)
- `F1-L1`: Role map for nursing/provider/therapy/dietary (8m)
- `F1-L2`: Weekly wound rounds workflow (8m)
- `F1-L3`: Missing-elements prevention checklist (8m)
- Quiz: 10 questions

### F2 Pressure Injury Prevention System
- `F2-L1`: Braden/Norton scoring to action plan (8m)
- `F2-L2`: Turning schedules + moisture management (8m)
- `F2-L3`: Support surfaces + offloading logs (8m)
- Quiz: 10 questions

### F3 Measurement + Documentation Competency
- `F3-L1`: Measurement method standardization (8m)
- `F3-L2`: Tissue/exudate/periwound language standards (8m)
- `F3-L3`: Infection red flags + escalation protocol (8m)
- Quiz: 10 questions

### F4 Escalation Packet + Coordination
- `F4-L1`: Assemble escalation packet (notes/labs/photos) (8m)
- `F4-L2`: Specialist coordination handoff (vascular/endo) (8m)
- `F4-L3`: CTP readiness documentation checklist (8m)
- Quiz: 10 questions

### Facility Final Exam
- 40 randomized questions
- Pass threshold: 80%
- Certificate: `AWB Post-Acute Wound Care Operations - Facility Track`

## Distributor Track
### D1 Receiving + Storage Controls
- `D1-L1`: Lot/expiration capture at receiving (8m)
- `D1-L2`: Storage controls + temperature logs (8m)
- `D1-L3`: Quarantine/discrepancy workflow (8m)
- Quiz: 10 questions

### D2 Issuance + Traceability
- `D2-L1`: Issuance logs by site/case ID (no PHI) (8m)
- `D2-L2`: POD + reconciliation workflow (8m)
- `D2-L3`: Returns/waste documentation (8m)
- Quiz: 10 questions

### D3 Audit Support + Compliance Boundaries
- `D3-L1`: Audit response pack (8m)
- `D3-L2`: PHI avoidance and data boundaries (8m)
- `D3-L3`: Site onboarding and PAR levels (8m)
- Quiz: 10 questions

### Distributor Final Exam
- 30 randomized questions
- Pass threshold: 80%
- Certificate: `AWB Distribution Operations & Compliance - Distributor Track`

## ASC / Ortho Track
### O1 Surgical Wound Taxonomy
- `O1-L1`: Dehiscence vs infection vs necrosis vs seroma (8m)
- `O1-L2`: Hardware-adjacent wounds and risk documentation (8m)
- `O1-L3`: Incision management documentation (8m)
- Quiz: 10 questions

### O2 Grafting Workflows + Post-op Protocols
- `O2-L1`: Bed prep in surgical setting (8m)
- `O2-L2`: Post-op graft protocol and red flags (8m)
- `O2-L3`: Follow-up measurement and complication log (8m)
- Quiz: 10 questions

### ASC/Ortho Final Exam
- 30 randomized questions
- Pass threshold: 80%
- Certificate: `AWB Surgical Wounds & Grafting - ASC/Ortho Track`

## Video Production Plan
- Total lessons in this pack: 66
- Runtime target: 7-9 minutes per lesson
- Voice profiles:
  - Clinical tracks: clinician voice
  - Commercial track: market-access voice
- See script pack: `docs/course-pack/VIDEO_SCRIPTS.md`

## Question Bank Plan
- Module quizzes: 10 questions each, random pull from module-tagged pool.
- Final exams:
  - Provider: 50
  - Sales: 40
  - Facility: 40
  - Distributor: 30
  - ASC/Ortho: 30
- Recommended authored pool size:
  - Module pools: 30 questions per module
  - Final pools: 120 per track
- Import schema and seed examples: `docs/course-pack/QUESTION_BANK_IMPORT_SCHEMA.csv`

## Forms Pack
- Facility Escalation Packet Submission
- Post-Op Graft Protocol Submission
- Training Request / Onboarding
- General Intake / IVR Intake
- Field-level specs and statuses: `docs/course-pack/FORMS_SPEC.md`

## Certificates
- PDF template rules and verification rules: `docs/course-pack/CERTIFICATE_RULES.md`
- Verification URL pattern: `/verify/{certificateId}`

## Suggested API Contracts (build order)
1. `GET /api/catalog`
2. `GET /api/lessons/:lessonId`
3. `POST /api/progress/lessons`
4. `GET /api/quiz` + `GET /api/quiz/config`
5. `POST /api/quiz/submit`
6. `GET /api/completion/:userId`
7. `POST /api/forms/submit`
8. `POST /api/certificates` + `GET /api/verify/:certificateId`

