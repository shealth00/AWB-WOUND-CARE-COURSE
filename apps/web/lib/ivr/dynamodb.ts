import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { IvrPayload } from "./types";

let docClient: DynamoDBDocumentClient | null = null;

function requireEnv(name: "AWS_REGION" | "IVR_TABLE_NAME"): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const region = requireEnv("AWS_REGION");
    const client = new DynamoDBClient({ region });
    docClient = DynamoDBDocumentClient.from(client);
  }

  return docClient;
}

function normalizeKeyPart(prefix: string, value: string | null): string {
  const cleaned = (value ?? "UNKNOWN").trim().replace(/\s+/g, " ");
  return `${prefix}#${cleaned.length > 0 ? cleaned : "UNKNOWN"}`;
}

export async function saveIvrSubmission(referenceId: string, payload: IvrPayload): Promise<void> {
  const tableName = requireEnv("IVR_TABLE_NAME");
  const client = getClient();
  const now = new Date().toISOString();

  const requestType = payload.requestSetup.requestType ?? "Unknown";
  const facilityName = payload.facilityPhysician.facilityName ?? "Unknown";
  const patientName = payload.patient.patientName ?? "Unknown";
  const status = "RECEIVED";

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `IVR#${referenceId}`,
        sk: "SUBMISSION",
        referenceId,
        entityType: "IVR_SUBMISSION",
        status,
        createdAt: now,
        updatedAt: now,
        requestType,
        physicianName: payload.facilityPhysician.physicianName,
        facilityName,
        patientName,
        primaryPayerName: payload.insurance.primary.payerName,
        signatureDate: payload.authorization.signatureDate,
        formVersion: payload.meta.formVersion,
        gsi1pk: normalizeKeyPart("STATUS", status),
        gsi1sk: now,
        gsi2pk: normalizeKeyPart("FACILITY", facilityName),
        gsi2sk: now,
        gsi3pk: normalizeKeyPart("PATIENT", patientName),
        gsi3sk: now,
        payload,
      },
    }),
  );
}
