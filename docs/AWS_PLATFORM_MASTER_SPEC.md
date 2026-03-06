# AWB Platform Master Spec

## A) Architecture Decision Record
- Decision: Build AWB as a private AWS-first membership platform.
- Frontend: Next.js on Amplify Hosting.
- Identity: Cognito user pool + group-based role claims.
- API: AppSync GraphQL with Lambda for workflow logic.
- Data: Aurora PostgreSQL Serverless v2 (Data API).
- Assets: Private S3 + CloudFront signed delivery.
- Video pipeline: S3 source -> MediaConvert HLS -> CloudFront.
- Reason: Domain is relational and policy-heavy; this model supports secure delivery and auditability.

## B) Repo Structure
- `apps/web`: Member + admin/instructor route groups.
- `packages/ui`: Shared UI components.
- `packages/validation`: Zod schemas and shared validators.
- `infra/cdk`: AWS infrastructure stack code.
- `infra/graphql`: AppSync schema and resolver mapping docs.
- `infra/lambda`: Lambda function modules.
- `infra/sql/migrations`: PostgreSQL migrations.
- `docs/architecture`, `docs/api`, `docs/db`: Living technical docs.

## C) PostgreSQL Schema Direction
- Identity: `users`, `roles`, `user_roles`, `organizations`, `memberships`, `plans`.
- Learning: `courses`, `course_sections`, `lessons`, `assets`, `lesson_assets`.
- Assessment: `question_banks`, `questions`, `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_attempt_answers`.
- Certification: `certification_tracks`, `certification_rules`, `certificates`, `certificate_events`.
- Storage: `storage_folders`, `storage_files`, `file_access_policies`.
- Operations: `forms`, `form_submissions`, `audit_logs`, `notifications`, `feature_flags`.

## D) GraphQL API Direction
- Query focus: profile, courses, lesson assets, quiz metadata, cert records, signed asset access.
- Mutation focus: upload init/finalize, quiz submit, form submit, certificate issue/revoke.
- Resolver model:
  - AppSync JS/Aurora: straight reads/writes.
  - Lambda: entitlement checks, signing, certificate generation, async orchestration.

## E) Route Map
- Public: `/`, `/about`, `/pricing`, `/login`, `/signup`, `/verify-certificate/[token]`.
- Member: `/app/dashboard`, `/app/courses`, `/app/library/videos`, `/app/library/documents`, `/app/forms`, `/app/quizzes`, `/app/my-certificates`, `/app/storage`.
- Admin: `/admin/dashboard`, `/admin/courses`, `/admin/assets/videos`, `/admin/assets/documents`, `/admin/forms`, `/admin/question-bank`, `/admin/quizzes`, `/admin/certifications`, `/admin/storage`, `/admin/reports`.
- Instructor: `/instructor/dashboard`, `/instructor/courses`, `/instructor/submissions`, `/instructor/results`.

## F) Phased Implementation Plan
1. Foundation
- Cognito auth, role middleware, core course catalog, private asset access endpoint.

2. Content and Media
- Upload init/finalize, S3 object registration, MediaConvert job submission/handler, video/document library pages.

3. Assessments and Forms
- Question bank, quiz runtime/scoring, dynamic form system, submission queues.

4. Certification
- Rule engine, certificate issuance, PDF rendering, verification route.

5. Membership Storage and Reporting
- Org/user folder model, policy checks, audit exports, role-scoped analytics.

## Security Non-Negotiables
- No public S3 objects.
- No direct origin URLs in frontend.
- Signed URL/cookie issuance only after entitlement check.
- Admin mutations must write audit logs.
