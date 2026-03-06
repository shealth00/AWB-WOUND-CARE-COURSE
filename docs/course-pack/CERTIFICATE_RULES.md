# AWB Academy Certificate Rules

## Eligibility Rules
- All lessons in assigned track completed (>=90% watched or manual complete).
- All module quizzes passed with score >=80%.
- Final exam passed with score >=80%.
- Track-specific requirements (if enabled) completed (for example provider practical assignment).

## Certificate ID Format
`AWB-AWC-SG-{TRACKCODE}-{YYYYMMDD}-{RANDOM6}`

Examples:
- `AWB-AWC-SG-PROV-20260305-9J4K2P`
- `AWB-AWC-SG-SALES-20260305-L8T1QZ`

## Certificate Payload Fields
- `certificateId`
- `learnerFullName`
- `learnerEmail` (optional)
- `trackId`
- `trackTitle`
- `courseTitle`
- `completionDate`
- `scoreFinalExam`
- `issuedAt`
- `status` (`valid` or `revoked`)
- `verificationUrl`
- `pdfUrl`

## Verification Rules
- Public endpoint: `GET /verify/{certificateId}`
- API endpoint: `GET /api/verify/{certificateId}`
- Response includes:
  - `valid`
  - `certificate` object when valid
  - `reason` when invalid/not found
- Rate limit required on verify endpoints.

## Revocation Rules
- Admin-only revoke action.
- Required logging: actor, timestamp, reason.
- Verification page must show revoked status and reason.

## PDF Template Requirements
- AWB branding + issuer line
- Learner full name
- Track-specific course title
- Completion date
- Certificate ID
- Verification URL + QR code
- Instructor/issuer signature lines

