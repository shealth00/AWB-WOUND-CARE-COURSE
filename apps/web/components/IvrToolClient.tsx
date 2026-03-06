"use client";

import { useMemo, useState } from "react";
import { fetchJson } from "../src/http";

type YesNo = "" | "Yes" | "No";

interface SubmitResponse {
  submissionId: string;
  intakeId: string;
  caseId: string;
  callId: string;
  status: string;
  priority: "Routine" | "Urgent";
  assignedTo: string;
  nextActionDue: string;
  smartsheetSynced: boolean;
}

interface IvrPayload {
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
  testResults: {
    hba1c: string | null;
    hba1cDate: string | null;
    abi: string | null;
    abiDate: string | null;
    serumCreatinine: string | null;
    serumCreatinineDate: string | null;
    preAlbuminAlbumin: string | null;
    preAlbuminAlbuminDate: string | null;
  };
  diagnosis: {
    icd10Primary: string | null;
    icd10Secondary: string | null;
  };
  wounds: {
    woundTypes: string[];
    wound1: {
      location: string | null;
      duration: string | null;
      postDebridementSizeCm2: string | null;
    };
    wound2: {
      location: string | null;
      duration: string | null;
      postDebridementSizeCm2: string | null;
    };
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
}

interface FormState {
  salesExecutive: string;
  requestType: string;
  proceduralDate: string;
  physicianName: string;
  physicianSpecialty: string;
  facilityName: string;
  facilityAddress: string;
  facilityCityStateZip: string;
  contactName: string;
  primaryCarePhysician: string;
  primaryCarePhysicianPhone: string;
  npi: string;
  taxId: string;
  ptan: string;
  medicaidNumber: string;
  phone: string;
  fax: string;
  accountNumber: string;
  pos: string[];
  patientName: string;
  patientDob: string;
  patientAddress: string;
  patientCityStateZip: string;
  inSnf: YesNo;
  globalPeriod: YesNo;
  primaryPayerName: string;
  primaryFacilityName: string;
  primaryPolicyNumber: string;
  primaryPayerPhone: string;
  primaryFacilityInNetwork: YesNo;
  primaryProviderInNetwork: YesNo;
  secondaryPayerName: string;
  secondaryFacilityName: string;
  secondaryPolicyNumber: string;
  secondaryPayerPhone: string;
  secondaryFacilityInNetwork: YesNo;
  secondaryProviderInNetwork: YesNo;
  workersComp: string;
  products: string[];
  attemptAuthorization: boolean;
  hba1c: string;
  hba1cDate: string;
  abi: string;
  abiDate: string;
  serumCreatinine: string;
  serumCreatinineDate: string;
  preAlbumin: string;
  preAlbuminDate: string;
  icd10Primary: string;
  icd10Secondary: string;
  woundTypes: string[];
  wound1Location: string;
  wound1Duration: string;
  wound1PostDebridementSize: string;
  wound2Location: string;
  wound2Duration: string;
  wound2PostDebridementSize: string;
  authorizedSignature: string;
  signatureDate: string;
  consentConfirmed: boolean;
}

const REQUEST_TYPES = [
  "New Request",
  "Re-Verification",
  "Additional Applications",
  "New Insurance",
  "Benefits Only",
];

const POS_OPTIONS = [
  "Physician Office (POS 11)",
  "Hospital Outpatient (POS 22)",
  "Ambulatory Surgical Center (POS 24)",
  "Home (POS 12)",
  "Assisted Living (POS 13)",
  "Nursing Facility (POS 32)",
  "Critical Access Hospital",
  "Hospital Inpatient (POS 21)",
  "Other",
];

const PRODUCT_OPTIONS = [
  "EPIFIX or EPIFIX Mesh Allograft (Q4186)",
  "EPICORD or EPICORD Expandable Allograft (Q4187)",
  "EPIEFFECT Allograft (Q4278)",
  "CELERA Allograft (Q4259)",
  "EPIXPRESS Allograft (Q4361)",
  "EMERGE Allograft (Q4297)",
  "RegenKit Wound Gel (GO465)",
];

const WOUND_TYPES = [
  "Diabetic Foot Ulcer",
  "Chronic Diabetic Ulcer",
  "Venous Leg Ulcer",
  "Chronic Ulcer",
  "Dehisced Surgical Wound",
  "Mohs Surgical Wound",
  "Other",
];

const initialState: FormState = {
  salesExecutive: "",
  requestType: "",
  proceduralDate: "",
  physicianName: "",
  physicianSpecialty: "",
  facilityName: "",
  facilityAddress: "",
  facilityCityStateZip: "",
  contactName: "",
  primaryCarePhysician: "",
  primaryCarePhysicianPhone: "",
  npi: "",
  taxId: "",
  ptan: "",
  medicaidNumber: "",
  phone: "",
  fax: "",
  accountNumber: "",
  pos: [],
  patientName: "",
  patientDob: "",
  patientAddress: "",
  patientCityStateZip: "",
  inSnf: "",
  globalPeriod: "",
  primaryPayerName: "",
  primaryFacilityName: "",
  primaryPolicyNumber: "",
  primaryPayerPhone: "",
  primaryFacilityInNetwork: "",
  primaryProviderInNetwork: "",
  secondaryPayerName: "",
  secondaryFacilityName: "",
  secondaryPolicyNumber: "",
  secondaryPayerPhone: "",
  secondaryFacilityInNetwork: "",
  secondaryProviderInNetwork: "",
  workersComp: "",
  products: [],
  attemptAuthorization: false,
  hba1c: "",
  hba1cDate: "",
  abi: "",
  abiDate: "",
  serumCreatinine: "",
  serumCreatinineDate: "",
  preAlbumin: "",
  preAlbuminDate: "",
  icd10Primary: "",
  icd10Secondary: "",
  woundTypes: [],
  wound1Location: "",
  wound1Duration: "",
  wound1PostDebridementSize: "",
  wound2Location: "",
  wound2Duration: "",
  wound2PostDebridementSize: "",
  authorizedSignature: "",
  signatureDate: "",
  consentConfirmed: false,
};

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toggleArrayValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function buildPayload(state: FormState): IvrPayload {
  return {
    requestSetup: {
      salesExecutive: toNullable(state.salesExecutive),
      requestType: toNullable(state.requestType),
      proceduralDate: toNullable(state.proceduralDate),
    },
    facilityPhysician: {
      physicianName: toNullable(state.physicianName),
      physicianSpecialty: toNullable(state.physicianSpecialty),
      facilityName: toNullable(state.facilityName),
      facilityAddress: toNullable(state.facilityAddress),
      facilityCityStateZip: toNullable(state.facilityCityStateZip),
      contactName: toNullable(state.contactName),
      primaryCarePhysician: toNullable(state.primaryCarePhysician),
      primaryCarePhysicianPhone: toNullable(state.primaryCarePhysicianPhone),
      npi: toNullable(state.npi),
      taxId: toNullable(state.taxId),
      ptan: toNullable(state.ptan),
      medicaidNumber: toNullable(state.medicaidNumber),
      phone: toNullable(state.phone),
      fax: toNullable(state.fax),
      accountNumber: toNullable(state.accountNumber),
      placeOfService: state.pos,
    },
    patient: {
      patientName: toNullable(state.patientName),
      patientDob: toNullable(state.patientDob),
      patientAddress: toNullable(state.patientAddress),
      patientCityStateZip: toNullable(state.patientCityStateZip),
      inSkilledNursingFacility: state.inSnf,
      inSurgicalGlobalPeriod: state.globalPeriod,
    },
    insurance: {
      primary: {
        payerName: toNullable(state.primaryPayerName),
        facilityName: toNullable(state.primaryFacilityName),
        policyNumber: toNullable(state.primaryPolicyNumber),
        payerPhone: toNullable(state.primaryPayerPhone),
        facilityInNetwork: state.primaryFacilityInNetwork,
        providerInNetwork: state.primaryProviderInNetwork,
      },
      secondary: {
        payerName: toNullable(state.secondaryPayerName),
        facilityName: toNullable(state.secondaryFacilityName),
        policyNumber: toNullable(state.secondaryPolicyNumber),
        payerPhone: toNullable(state.secondaryPayerPhone),
        facilityInNetwork: state.secondaryFacilityInNetwork,
        providerInNetwork: state.secondaryProviderInNetwork,
      },
      workersCompOrVACaseManager: toNullable(state.workersComp),
    },
    products: {
      selected: state.products,
      attemptAuthorizationIfNotCovered: state.attemptAuthorization,
    },
    testResults: {
      hba1c: toNullable(state.hba1c),
      hba1cDate: toNullable(state.hba1cDate),
      abi: toNullable(state.abi),
      abiDate: toNullable(state.abiDate),
      serumCreatinine: toNullable(state.serumCreatinine),
      serumCreatinineDate: toNullable(state.serumCreatinineDate),
      preAlbuminAlbumin: toNullable(state.preAlbumin),
      preAlbuminAlbuminDate: toNullable(state.preAlbuminDate),
    },
    diagnosis: {
      icd10Primary: toNullable(state.icd10Primary),
      icd10Secondary: toNullable(state.icd10Secondary),
    },
    wounds: {
      woundTypes: state.woundTypes,
      wound1: {
        location: toNullable(state.wound1Location),
        duration: toNullable(state.wound1Duration),
        postDebridementSizeCm2: toNullable(state.wound1PostDebridementSize),
      },
      wound2: {
        location: toNullable(state.wound2Location),
        duration: toNullable(state.wound2Duration),
        postDebridementSizeCm2: toNullable(state.wound2PostDebridementSize),
      },
    },
    authorization: {
      authorizedSignature: toNullable(state.authorizedSignature),
      signatureDate: toNullable(state.signatureDate),
      consentConfirmed: state.consentConfirmed,
    },
    meta: {
      formVersion: "AWB-IVR-v1",
      generatedAt: new Date().toISOString(),
    },
  };
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

export function IvrToolClient() {
  const [state, setState] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payloadPreview = useMemo(() => JSON.stringify(buildPayload(state), null, 2), [state]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetchJson<SubmitResponse>("/ivr/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(state)),
      });
      setResult(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "IVR submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function checkboxGroup(
    title: string,
    options: string[],
    selected: string[],
    onChange: (next: string[]) => void,
  ) {
    return (
      <div className="field">
        <span>{title}</span>
        <div className="check-grid">
          {options.map((option) => (
            <label className="check-item" key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onChange(toggleArrayValue(selected, option))}
              />
              {option}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">IVR Tool</div>
        <h1>AWB Insurance Verification Request</h1>
        <p className="muted">
          Structured insurance verification intake with the exact field groups for AWB routing.
        </p>
      </section>

      <form className="grid" onSubmit={onSubmit}>
        <Section title="Request Setup">
          <div className="split">
            <label className="field">
              Sales Executive
              <input
                required
                value={state.salesExecutive}
                onChange={(event) => updateField("salesExecutive", event.target.value)}
              />
            </label>
            <label className="field">
              Request Type
              <select
                required
                value={state.requestType}
                onChange={(event) => updateField("requestType", event.target.value)}
              >
                <option value="">Select</option>
                {REQUEST_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Procedural Date
              <input
                type="date"
                value={state.proceduralDate}
                onChange={(event) => updateField("proceduralDate", event.target.value)}
              />
            </label>
          </div>
        </Section>

        <Section title="Facility and Physician Information">
          <div className="split">
            <label className="field">Physician Name<input required value={state.physicianName} onChange={(event) => updateField("physicianName", event.target.value)} /></label>
            <label className="field">Physician Specialty<input value={state.physicianSpecialty} onChange={(event) => updateField("physicianSpecialty", event.target.value)} /></label>
            <label className="field">Facility Name<input required value={state.facilityName} onChange={(event) => updateField("facilityName", event.target.value)} /></label>
            <label className="field">Facility Address<input required value={state.facilityAddress} onChange={(event) => updateField("facilityAddress", event.target.value)} /></label>
            <label className="field">Facility City, State, Zip<input required value={state.facilityCityStateZip} onChange={(event) => updateField("facilityCityStateZip", event.target.value)} /></label>
            <label className="field">Contact Name<input value={state.contactName} onChange={(event) => updateField("contactName", event.target.value)} /></label>
            <label className="field">Primary Care Physician<input value={state.primaryCarePhysician} onChange={(event) => updateField("primaryCarePhysician", event.target.value)} /></label>
            <label className="field">Primary Care Physician Phone<input value={state.primaryCarePhysicianPhone} onChange={(event) => updateField("primaryCarePhysicianPhone", event.target.value)} /></label>
            <label className="field">NPI<input value={state.npi} onChange={(event) => updateField("npi", event.target.value)} /></label>
            <label className="field">Tax ID<input value={state.taxId} onChange={(event) => updateField("taxId", event.target.value)} /></label>
            <label className="field">PTAN<input value={state.ptan} onChange={(event) => updateField("ptan", event.target.value)} /></label>
            <label className="field">Medicaid #<input value={state.medicaidNumber} onChange={(event) => updateField("medicaidNumber", event.target.value)} /></label>
            <label className="field">Phone #<input required value={state.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
            <label className="field">Fax #<input value={state.fax} onChange={(event) => updateField("fax", event.target.value)} /></label>
            <label className="field">Account #<input value={state.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} /></label>
          </div>
          {checkboxGroup("Place of Service", POS_OPTIONS, state.pos, (next) => updateField("pos", next))}
        </Section>

        <Section title="Patient Information">
          <div className="split">
            <label className="field">Patient Name<input required value={state.patientName} onChange={(event) => updateField("patientName", event.target.value)} /></label>
            <label className="field">Patient Date of Birth<input type="date" value={state.patientDob} onChange={(event) => updateField("patientDob", event.target.value)} /></label>
            <label className="field">Patient Address<input value={state.patientAddress} onChange={(event) => updateField("patientAddress", event.target.value)} /></label>
            <label className="field">Patient City, State, Zip<input value={state.patientCityStateZip} onChange={(event) => updateField("patientCityStateZip", event.target.value)} /></label>
            <label className="field">Currently in skilled nursing facility?
              <select value={state.inSnf} onChange={(event) => updateField("inSnf", event.target.value as YesNo)}>
                <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
            <label className="field">Currently in surgical global period?
              <select value={state.globalPeriod} onChange={(event) => updateField("globalPeriod", event.target.value as YesNo)}>
                <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
          </div>
        </Section>

        <Section title="Insurance Information">
          <h3>Primary Insurance</h3>
          <div className="split">
            <label className="field">Payer Name<input required value={state.primaryPayerName} onChange={(event) => updateField("primaryPayerName", event.target.value)} /></label>
            <label className="field">Facility Name<input value={state.primaryFacilityName} onChange={(event) => updateField("primaryFacilityName", event.target.value)} /></label>
            <label className="field">Policy #<input required value={state.primaryPolicyNumber} onChange={(event) => updateField("primaryPolicyNumber", event.target.value)} /></label>
            <label className="field">Payer Phone #<input value={state.primaryPayerPhone} onChange={(event) => updateField("primaryPayerPhone", event.target.value)} /></label>
            <label className="field">Facility In Network?
              <select value={state.primaryFacilityInNetwork} onChange={(event) => updateField("primaryFacilityInNetwork", event.target.value as YesNo)}>
                <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
            <label className="field">Provider In Network?
              <select value={state.primaryProviderInNetwork} onChange={(event) => updateField("primaryProviderInNetwork", event.target.value as YesNo)}>
                <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
          </div>

          <h3>Secondary Insurance</h3>
          <div className="split">
            <label className="field">Payer Name<input value={state.secondaryPayerName} onChange={(event) => updateField("secondaryPayerName", event.target.value)} /></label>
            <label className="field">Facility Name<input value={state.secondaryFacilityName} onChange={(event) => updateField("secondaryFacilityName", event.target.value)} /></label>
            <label className="field">Policy #<input value={state.secondaryPolicyNumber} onChange={(event) => updateField("secondaryPolicyNumber", event.target.value)} /></label>
            <label className="field">Payer Phone #<input value={state.secondaryPayerPhone} onChange={(event) => updateField("secondaryPayerPhone", event.target.value)} /></label>
            <label className="field">Facility In Network?
              <select value={state.secondaryFacilityInNetwork} onChange={(event) => updateField("secondaryFacilityInNetwork", event.target.value as YesNo)}>
                <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
            <label className="field">Provider In Network?
              <select value={state.secondaryProviderInNetwork} onChange={(event) => updateField("secondaryProviderInNetwork", event.target.value as YesNo)}>
                <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </label>
          </div>
          <label className="field">Worker’s Compensation Adjuster or VA Case Manager
            <textarea rows={3} value={state.workersComp} onChange={(event) => updateField("workersComp", event.target.value)} />
          </label>
        </Section>

        <Section title="Products, Tests, Diagnosis, and Wounds">
          {checkboxGroup("Products", PRODUCT_OPTIONS, state.products, (next) => updateField("products", next))}

          <label className="check-item">
            <input
              type="checkbox"
              checked={state.attemptAuthorization}
              onChange={(event) => updateField("attemptAuthorization", event.target.checked)}
            />
            Attempt authorization / pre-determination if policy does not cover this product
          </label>

          <div className="split">
            <label className="field">HbA1C<input value={state.hba1c} onChange={(event) => updateField("hba1c", event.target.value)} /></label>
            <label className="field">HbA1C Date<input type="date" value={state.hba1cDate} onChange={(event) => updateField("hba1cDate", event.target.value)} /></label>
            <label className="field">ABI<input value={state.abi} onChange={(event) => updateField("abi", event.target.value)} /></label>
            <label className="field">ABI Date<input type="date" value={state.abiDate} onChange={(event) => updateField("abiDate", event.target.value)} /></label>
            <label className="field">Serum Creatinine<input value={state.serumCreatinine} onChange={(event) => updateField("serumCreatinine", event.target.value)} /></label>
            <label className="field">Serum Creatinine Date<input type="date" value={state.serumCreatinineDate} onChange={(event) => updateField("serumCreatinineDate", event.target.value)} /></label>
            <label className="field">Pre-Albumin / Albumin<input value={state.preAlbumin} onChange={(event) => updateField("preAlbumin", event.target.value)} /></label>
            <label className="field">Pre-Albumin / Albumin Date<input type="date" value={state.preAlbuminDate} onChange={(event) => updateField("preAlbuminDate", event.target.value)} /></label>
          </div>

          <div className="split">
            <label className="field">ICD-10 Primary<input value={state.icd10Primary} onChange={(event) => updateField("icd10Primary", event.target.value)} /></label>
            <label className="field">ICD-10 Secondary<input value={state.icd10Secondary} onChange={(event) => updateField("icd10Secondary", event.target.value)} /></label>
          </div>

          {checkboxGroup("Wound Type", WOUND_TYPES, state.woundTypes, (next) => updateField("woundTypes", next))}

          <h3>Wound 1 Description</h3>
          <div className="split">
            <label className="field">Location of Ulcer<input value={state.wound1Location} onChange={(event) => updateField("wound1Location", event.target.value)} /></label>
            <label className="field">Duration of Ulcer<input value={state.wound1Duration} onChange={(event) => updateField("wound1Duration", event.target.value)} /></label>
            <label className="field">Post Debridement Total Size of Ulcers (cm2)<input value={state.wound1PostDebridementSize} onChange={(event) => updateField("wound1PostDebridementSize", event.target.value)} /></label>
          </div>

          <h3>Wound 2 Description</h3>
          <div className="split">
            <label className="field">Location of Ulcer<input value={state.wound2Location} onChange={(event) => updateField("wound2Location", event.target.value)} /></label>
            <label className="field">Duration of Ulcer<input value={state.wound2Duration} onChange={(event) => updateField("wound2Duration", event.target.value)} /></label>
            <label className="field">Post Debridement Total Size of Ulcers (cm2)<input value={state.wound2PostDebridementSize} onChange={(event) => updateField("wound2PostDebridementSize", event.target.value)} /></label>
          </div>
        </Section>

        <Section title="Authorized Healthcare Professional Signature">
          <div className="split">
            <label className="field">Authorized Signature<input required value={state.authorizedSignature} onChange={(event) => updateField("authorizedSignature", event.target.value)} /></label>
            <label className="field">Date<input required type="date" value={state.signatureDate} onChange={(event) => updateField("signatureDate", event.target.value)} /></label>
          </div>
          <label className="check-item">
            <input
              type="checkbox"
              checked={state.consentConfirmed}
              onChange={(event) => updateField("consentConfirmed", event.target.checked)}
              required
            />
            I certify that necessary patient authorization was received to release medical and/or patient information.
          </label>
        </Section>

        <section className="card">
          <div className="actions">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit IVR"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setState(initialState);
                setResult(null);
                setError(null);
              }}
            >
              Reset
            </button>
          </div>

          {result ? (
            <div className={result.priority === "Urgent" ? "status-bad" : "status-good"}>
              Submitted Case ID {result.caseId}. Queue: {result.assignedTo}. Priority: {result.priority}.
            </div>
          ) : null}
          {error ? <div className="status-bad">{error}</div> : null}
        </section>
      </form>

      <section className="card">
        <h2>Payload Preview</h2>
        <pre className="question mono">{payloadPreview}</pre>
      </section>
    </div>
  );
}
