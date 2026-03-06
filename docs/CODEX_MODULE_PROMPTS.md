# Codex Module Prompts

## Module 1: Auth + RBAC
Implement Cognito-backed auth middleware, role parsing, and route guards for member/admin/instructor areas. Add audit logging for admin mutations.

## Module 2: Private Asset Access
Implement GraphQL `getAssetAccess` using Lambda to validate entitlement and return CloudFront signed URL/cookie metadata. No public S3 URLs.

## Module 3: Upload Pipeline
Implement GraphQL `uploadAssetInit` and `uploadAssetFinalize` with multipart S3 upload support. Persist asset records in Aurora.

## Module 4: Video Processing
Implement MediaConvert submission and completion handlers. Update processing status and output HLS keys in DB.

## Module 5: Quiz Engine
Implement question bank entities, quiz assembly, submission scoring, and attempt persistence. Add pass/fail and explanation payloads.

## Module 6: Certification Engine
Implement rule evaluation, certificate issuance, PDF generation, verification token lookup, revoke flow, and certificate events.
