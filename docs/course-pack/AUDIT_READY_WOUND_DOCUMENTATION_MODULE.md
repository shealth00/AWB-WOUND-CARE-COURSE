# Audit-Ready Wound Documentation

Clinical note structure that is defensible for audit and escalation.

- Track: Shared Core
- Module length: 4 lessons / 32 minutes
- Policy anchor: LCD Wound Care (L37166)

## Course Path
1. Lesson 1 (8 min): Why Wound Care Claims Fail
2. Lesson 2 (8 min): Audit-Ready Clinical Note Structure
3. Lesson 3 (8 min): Procedure Documentation
4. Lesson 4 (8 min): Escalation Documentation

## Lesson 2 Script: Audit-Ready Clinical Note Structure (8 min)
### Correct Clinical Note Framework
1. Patient context
2. Wound assessment
3. Medical necessity
4. Treatment performed
5. Post-procedure wound status
6. Treatment plan

### SOAP Structure
- `S` Subjective:
  - Example: "Patient reports increased drainage and mild pain around the left heel ulcer."
- `O` Objective:
  - Required: location, length, width, depth, undermining, drainage, necrosis, granulation, periwound condition.
  - Example objective block:
    - Left heel ulcer
    - Length 2.4 cm, Width 2.1 cm, Depth 0.4 cm
    - Moderate serous drainage
    - 30% necrotic tissue
    - Granulation present, no odor
- `A` Assessment:
  - Example: "Chronic diabetic foot ulcer with necrotic tissue; delayed healing due to diabetes."
  - Common ICD-10 family references:
    - `E11.621` diabetic foot ulcer
    - `L97` non-pressure ulcer
    - `L89` pressure ulcer
- `P` Plan:
  - Example:
    - Selective debridement performed
    - Offloading boot prescribed
    - Weekly wound evaluation

## Lesson 3 Script: Procedure Documentation (8 min)
### Required Debridement Documentation
- Indication
- Tissue removed
- Depth of debridement
- Method and instruments
- Wound size before
- Wound size after

### Example Procedure Note
- Procedure: Selective sharp debridement
- Indication: Necrotic tissue preventing wound healing
- Method: Scalpel + curette
- Tissue removed: Subcutaneous necrotic tissue
- Wound before: 3.0 x 2.5 x 0.6 cm
- Wound after: 2.8 x 2.3 x 0.5 cm
- Hemostasis achieved, patient tolerated procedure well

### Coding references
- `97597` selective debridement
- `11042` subcutaneous surgical debridement
- `11043` muscle debridement

## Lesson 4 Script: Escalation Documentation (8 min)
### 30-Day Rule
If no measurable wound improvement after 30 days, provider should:
- Reassess wound and barriers
- Modify treatment plan

Common reassessment targets:
- Vascular evaluation
- Nutrition optimization
- Infection treatment
- Pressure offloading

### Audit Defense Language
- "Wound demonstrates delayed healing secondary to diabetes and vascular insufficiency."
- "Debridement performed to maintain the wound in an active state of healing and remove devitalized tissue."

### Palliative intent language
When closure is unlikely:
- "Goal is wound stabilization and infection prevention rather than closure."

## Quiz
1. What must every wound note include?
- A) Location
- B) Measurements
- C) Tissue description
- D) All of the above
- Correct: `D`

2. If a wound does not improve after 30 days:
- A) Continue same treatment
- B) Change treatment plan
- C) Stop documentation
- Correct: `B`

## Platform Code Delivered
- Shared-core scoring and note generator.
- API:
  - `GET /api/modules/audit-ready-wound-documentation`
  - `POST /api/tools/wound-audit/score`
  - `POST /api/tools/wound-audit/generate`
- UI:
  - `/audit-ready-documentation`
