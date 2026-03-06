# Debridement Documentation Mastery

Clear debridement documentation + coding-ready note structure.

- Track: Shared Core
- Module length: 3 lessons / 24 minutes
- Policy anchor: LCD Wound Care (L37166)

## Course Path
1. Lesson 1 (8 min): Debridement Types + Medicare Rules
2. Lesson 2 (8 min): The Coding-Ready Debridement Note
3. Lesson 3 (8 min): Audit-Proof Debridement Documentation

## Lesson 1 Script (8 min)
### Debridement categories
- Selective debridement
- Non-selective debridement
- Surgical debridement

### Coding rule
CPT is driven by:
1. Deepest tissue removed
2. Total treated surface area

### CPT references
- `97597` selective <=20 sq cm
- `97598` each additional 20 sq cm
- `11042` subcutaneous
- `11043` muscle
- `11044` bone

## Lesson 2 Script (8 min)
### Coding-ready note structure (10 elements)
1. Diagnosis
2. Wound location
3. Wound size
4. Tissue present
5. Indication
6. Method
7. Tissue removed
8. Surface area
9. Depth removed
10. Post-procedure status

### Example note block
- Diagnosis: Diabetic foot ulcer
- Pre-size: 3.2 x 2.1 x 0.4 cm
- Tissue present: 30% necrotic tissue
- Procedure: selective sharp debridement with curette
- Tissue removed: devitalized subcutaneous tissue
- Surface area: 6.5 sq cm
- Hemostasis: pressure
- Post-procedure: healthy granulation tissue exposed

## Lesson 3 Script (8 min)
### Audit-proof checklist
- Measurements documented
- Tissue present documented
- Tissue removed documented
- Surface area documented
- Depth documented
- Post-procedure status documented
- Follow-up plan documented

### Common denial causes
- Missing measurements
- Missing tissue removed
- Missing depth
- Missing progression evidence

## Quiz
1. CPT code level is primarily determined by:
- Correct: tissue depth removed
2. Which is mandatory in debridement documentation?
- Correct: tissue removed
3. Add-on CPT selection is tied to:
- Correct: surface area treated

## Platform Code Delivered
- Shared-core functions:
  - `suggestDebridementCptCode`
  - `scoreDebridementDocumentation`
  - `generateDebridementNote`
- API:
  - `GET /api/modules/debridement-documentation-mastery`
  - `POST /api/tools/debridement/score`
  - `POST /api/tools/debridement/generate`
- UI:
  - `/debridement-documentation`
