export type YesNo = "" | "Yes" | "No";

export type IvrPayload = {
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
};
