# Escalation to Advanced Modalities + Grafting / CTP

Escalation logic tied to standard care and objective trends.

- Track: Shared Core
- Module length: 3 lessons / 24 minutes
- Placement: After Standard Care Execution and before Billing/Audit Defense

## Learning Path
1. Lesson 1 (8 min): When Standard Care Fails
2. Lesson 2 (8 min): Advanced Modalities
3. Lesson 3 (8 min): Grafting and CTP Decision Logic

## Lesson 1 Script (8 min): When Standard Care Fails
### Objective
Recognize objective healing failure before escalation.

### Standard care baseline
- Debridement
- Offloading
- Compression when indicated
- Infection control
- Moisture balance
- Nutrition support

### Objective trend signals
- Wound area reduction
- Granulation increase
- Necrotic tissue reduction
- Drainage reduction
- Pain reduction

### Escalation trigger
- Benchmark used: at least 30% wound area reduction in 4 weeks.
- If less than 30% reduction at week 4, reassess and consider escalation.

## Lesson 2 Script (8 min): Advanced Modalities
### Objective
Apply modality selection logic based on trend data.

### Modality options
- NPWT
- Ultrasound therapy
- Electrical stimulation
- Hyperbaric oxygen
- Biofilm management

### Decision flow
- If reduction >= 30%: continue standard care.
- If infection present: treat infection first.
- If necrotic tissue present: debride and reassess.
- Else: escalate to advanced therapy.

## Lesson 3 Script (8 min): Grafting and CTP Decision Logic
### Objective
Determine when CTP/grafting is justified.

### CTP principles
- Not first-line therapy.
- Must follow documented standard care plus objective failure trend.
- Typical threshold: 4 to 6 weeks standard care and less than 50% wound reduction.

### Required documentation
- Standard care interventions
- Weekly objective wound measurements
- Photo trend documentation
- Debridement records
- Ongoing rationale and stop rules

## Quiz
1. Escalation should occur when:
- A) Improvement continues
- B) Infection resolved and trend improving
- C) Healing plateau occurs
- D) Patient requests graft
- Correct: `C`

2. CTP should only be used after:
- A) One week care
- B) Failure of standard care
- C) Patient preference
- D) Nurse recommendation
- Correct: `B`

## Platform Logic Delivered
- Shared-core functions:
  - `calculateWoundAreaReduction`
  - `evaluateEscalation`
- API:
  - `GET /api/modules/escalation-advanced-modalities`
  - `POST /api/tools/escalation/evaluate`
- UI:
  - `/escalation-advanced-modalities`
