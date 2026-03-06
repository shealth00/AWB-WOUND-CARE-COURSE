import type { IvrPayload } from "./types";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function validateIvrPayload(payload: IvrPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!hasText(payload.requestSetup?.salesExecutive)) {
    errors.push("requestSetup.salesExecutive is required.");
  }
  if (!hasText(payload.requestSetup?.requestType)) {
    errors.push("requestSetup.requestType is required.");
  }
  if (!hasText(payload.facilityPhysician?.physicianName)) {
    errors.push("facilityPhysician.physicianName is required.");
  }
  if (!hasText(payload.facilityPhysician?.facilityName)) {
    errors.push("facilityPhysician.facilityName is required.");
  }
  if (!hasText(payload.facilityPhysician?.facilityAddress)) {
    errors.push("facilityPhysician.facilityAddress is required.");
  }
  if (!hasText(payload.facilityPhysician?.facilityCityStateZip)) {
    errors.push("facilityPhysician.facilityCityStateZip is required.");
  }
  if (!hasText(payload.facilityPhysician?.phone)) {
    errors.push("facilityPhysician.phone is required.");
  }
  if (!isStringArray(payload.facilityPhysician?.placeOfService)) {
    errors.push("facilityPhysician.placeOfService must be an array of strings.");
  }
  if (!hasText(payload.patient?.patientName)) {
    errors.push("patient.patientName is required.");
  }
  if (!hasText(payload.insurance?.primary?.payerName)) {
    errors.push("insurance.primary.payerName is required.");
  }
  if (!hasText(payload.insurance?.primary?.policyNumber)) {
    errors.push("insurance.primary.policyNumber is required.");
  }
  if (!isStringArray(payload.products?.selected)) {
    errors.push("products.selected must be an array of strings.");
  }
  if (!isStringArray(payload.wounds?.woundTypes)) {
    errors.push("wounds.woundTypes must be an array of strings.");
  }
  if (!hasText(payload.authorization?.authorizedSignature)) {
    errors.push("authorization.authorizedSignature is required.");
  }
  if (!hasText(payload.authorization?.signatureDate)) {
    errors.push("authorization.signatureDate is required.");
  }
  if (payload.authorization?.consentConfirmed !== true) {
    errors.push("authorization.consentConfirmed must be true.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
