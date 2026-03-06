import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { randomUUID } from "node:crypto";

type YesNo = "" | "Yes" | "No";

type IvrPayload = {
  requestSetup: {
    salesExecutive: string | null;
    requestType: string | null;
    proceduralDate: string | null;
  };
  facilityPhysician: {
    physicianName: string | null;
    physicianSpecialty: string | null;
    facilityName: string | null;
    facilityAddress: string | null;
    facilityCityStateZip: string | null;
    contactName: string | null;
    primaryCarePhysician: string | null;
    primaryCarePhysicianPhone: string | null;
    npi: string | null;
    taxId: string | null;
    ptan: string | null;
    medicaidNumber: string | null;
    phone: string | null;
    fax: string | null;
    accountNumber: string | null;
    placeOfService: string[];
  };
  patient: {
    patientName: string | null;
    patientDob: string | null;
    patientAddress: string | null;
    patientCityStateZip: string | null;
    inSkilledNursingFacility: YesNo;
    inSurgicalGlobalPeriod: YesNo;
  };
  insurance: {
    primary: {
      payerName: string | null;
      facilityName: string | null;
      policyNumber: string | null;
      payerPhone: string | null;
      facilityInNetwork: YesNo;
      providerInNetwork: YesNo;
    };
    secondary: {
      payerName: string | null;
      facilityName: string | null;
      policyNumber: string | null;
      payerPhone: string | null;
      facilityInNetwork: YesNo;
      providerInNetwork: YesNo;
    };
    workersCompOrVACaseManager: string | null;
  };
  products: {
    selected: string[];
    attemptAuthorizationIfNotCovered: boolean;
  };
  testResults: Record<string, unknown>;
  diagnosis: Record<string, unknown>;
  wounds: {
    woundTypes: string[];
    wound1: Record<string, unknown>;
    wound2: Record<string, unknown>;
  };
  authorization: {
    authorizedSignature: string | null;
    signatureDate: string | null;
    consentConfirmed: boolean;
  };
  meta: {
    formVersion: string;
    generatedAt: string;
  };
};

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
    },
    body: JSON.stringify(body),
  };
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validate(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return ["Payload must be an object."];
  }

  const ivr = payload as IvrPayload;
  const errors: string[] = [];

  if (!hasText(ivr.requestSetup?.salesExecutive)) errors.push("requestSetup.salesExecutive is required.");
  if (!hasText(ivr.requestSetup?.requestType)) errors.push("requestSetup.requestType is required.");
  if (!hasText(ivr.facilityPhysician?.physicianName)) errors.push("facilityPhysician.physicianName is required.");
  if (!hasText(ivr.facilityPhysician?.facilityName)) errors.push("facilityPhysician.facilityName is required.");
  if (!hasText(ivr.facilityPhysician?.facilityAddress)) errors.push("facilityPhysician.facilityAddress is required.");
  if (!hasText(ivr.facilityPhysician?.facilityCityStateZip)) errors.push("facilityPhysician.facilityCityStateZip is required.");
  if (!hasText(ivr.facilityPhysician?.phone)) errors.push("facilityPhysician.phone is required.");
  if (!isStringArray(ivr.facilityPhysician?.placeOfService) || ivr.facilityPhysician.placeOfService.length === 0) {
    errors.push("facilityPhysician.placeOfService must include at least one value.");
  }
  if (!hasText(ivr.patient?.patientName)) errors.push("patient.patientName is required.");
  if (!hasText(ivr.insurance?.primary?.payerName)) errors.push("insurance.primary.payerName is required.");
  if (!hasText(ivr.insurance?.primary?.policyNumber)) errors.push("insurance.primary.policyNumber is required.");
  if (!hasText(ivr.authorization?.authorizedSignature)) errors.push("authorization.authorizedSignature is required.");
  if (!hasText(ivr.authorization?.signatureDate)) errors.push("authorization.signatureDate is required.");
  if (ivr.authorization?.consentConfirmed !== true) errors.push("authorization.consentConfirmed must be true.");

  return errors;
}

async function saveToDatabase(referenceId: string, payload: IvrPayload): Promise<void> {
  // Replace with DynamoDB/Aurora/AppSync integration in deployment stack.
  console.log(JSON.stringify({ referenceId, payload }));
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext.http.method;

  if (method === "OPTIONS") {
    return json(200, { ok: true });
  }
  if (method !== "POST") {
    return json(405, { message: "Method not allowed." });
  }

  try {
    const payload = event.body ? (JSON.parse(event.body) as unknown) : null;
    const errors = validate(payload);
    if (errors.length > 0) {
      return json(400, { message: "Validation failed.", errors });
    }

    const referenceId = `AWB-IVR-${randomUUID()}`;
    await saveToDatabase(referenceId, payload as IvrPayload);

    return json(200, {
      ok: true,
      referenceId,
      message: "IVR submitted successfully.",
    });
  } catch (error) {
    console.error("submit-ivr lambda error", error);
    return json(500, { message: "Internal server error." });
  }
}
