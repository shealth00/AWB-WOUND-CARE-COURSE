# AWB AWS CDK Plan

This folder will hold CDK stacks for:
- Amplify hosting
- Cognito (user pool, app client, groups)
- AppSync GraphQL API
- Aurora PostgreSQL Serverless v2 + Data API
- S3 private storage buckets
- CloudFront protected delivery
- Lambda workflow functions
- MediaConvert integration
- EventBridge async handlers
- CloudWatch alarms and dashboards

Planned stack breakdown:
- `auth-stack.ts`
- `api-stack.ts`
- `db-stack.ts`
- `storage-stack.ts`
- `media-stack.ts`
- `edge-stack.ts`
- `monitoring-stack.ts`

Security baseline:
- S3 block public access
- OAC for CloudFront -> S3
- KMS encryption
- least-privilege IAM
- signed URL/cookie delivery for private assets
