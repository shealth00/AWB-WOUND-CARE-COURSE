# AWB Academy Forms Spec

## Shared Workflow
- Submission lifecycle: `New -> In Review -> Needs Info -> Approved -> Closed`
- Every submission returns:
  - `submissionId`
  - `caseId`
  - `status`
  - `createdAt`
- Attachments: max 5 files, max 20MB each
- No PHI in free-text fields

## 1) Facility Escalation Packet Submission
Fields:
- `submissionType` (fixed: `Facility Escalation Packet`)
- `siteType` (`SNF`, `NH`, `ALF`, `Adult Senior Care`, `ASC`, `Clinic`, `Ortho`)
- `facilityName` (required)
- `caseId` (required)
- `primaryWoundType` (required)
- `daysOnStandardCare` (required, number)
- `objectiveTrendSummary` (required)
- `specialistInvolved` (optional)
- `notes` (optional)
- `attachments[]` (optional)

## 2) Post-Op Graft Protocol Submission
Fields:
- `submissionType` (fixed: `Post-Op Graft Protocol`)
- `facilityName` (required)
- `caseId` (required)
- `procedureDate` (required)
- `protocolChecklistConfirmed` (required boolean)
- `redFlagsPresent` (required boolean)
- `redFlagSummary` (conditional)
- `followUpDate` (required)
- `notes` (optional)
- `attachments[]` (optional)

## 3) Training Request / Onboarding
Fields:
- `submissionType` (fixed: `Training Request`)
- `requestorName` (required)
- `requestorEmail` (required)
- `organizationName` (required)
- `audienceType` (`Provider`, `Sales`, `Facility`, `Distributor`, `ASC/Ortho`)
- `requestedTrack` (required)
- `targetGoLiveDate` (optional)
- `estimatedLearnerCount` (optional)
- `notes` (optional)

## 4) General Intake / IVR Intake
Fields:
- `submissionType` (fixed: `General Intake`)
- `callId` (required)
- `callerType` (`SNF nurse`, `Provider`, `Patient`, `Other`)
- `site` (required)
- `callbackNumber` (required)
- `requestType` (required)
- `priority` (`Routine`, `Urgent`)
- `summary` (required)
- `audioUrl` (optional)
- `attachments[]` (optional)

## Smartsheet Column Mapping (minimum)
- `SubmissionType`
- `SiteType`
- `FacilityName`
- `CaseId`
- `Status`
- `AssignedTo`
- `Priority`
- `Notes`
- `CreatedAt`
- `LastUpdatedAt`

