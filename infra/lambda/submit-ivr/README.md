# submit-ivr Lambda

Lambda handler for AWB IVR insurance verification submissions.

## Endpoint contract
- Method: `POST`
- Payload shape:
  - `requestSetup`
  - `facilityPhysician`
  - `patient`
  - `insurance`
  - `products`
  - `testResults`
  - `diagnosis`
  - `wounds`
  - `authorization`
  - `meta`

## Response
- `200`: `{ ok, referenceId, message }`
- `400`: `{ message, errors[] }` for validation failures
- `500`: `{ message }`

## Integration notes
- Replace `saveToDatabase()` with:
  - DynamoDB write, or
  - Aurora insert, or
  - AppSync mutation
- Keep CORS headers aligned with your API Gateway stage policy.
