export type AudienceTrackId =
  | "providers"
  | "sales-marketers"
  | "distributors"
  | "post-acute-senior-care"
  | "asc-ortho";

export const AWB_BRAND = {
  issuerName: "Advance Wound Biologic",
  domain: "advancewoundbiologic.com",
  abbreviation: "AWB",
  academyName: "AWB Academy",
  masterProgramTitle: "Advanced Wound Care & Skin Grafting",
} as const;

export interface ProgramLesson {
  id: string;
  title: string;
  format: "lecture" | "clinical-demo" | "workflow" | "roleplay";
  durationMin: number;
  objectives: string[];
  complianceCallout?: string;
}

export interface ProgramModule {
  id: string;
  title: string;
  audience: AudienceTrackId | "shared-core";
  summary: string;
  outcomes: string[];
  downloads?: string[];
  lessons: ProgramLesson[];
}

export interface ProgramTrack {
  id: AudienceTrackId;
  code: "PROV" | "SALES" | "DIST" | "FAC" | "ASC";
  title: string;
  catalogName: string;
  certificateTitle: string;
  estimatedHours: string;
  outcomes: string[];
  moduleCount: number;
  finalExamQuestions: number;
  passScore: number;
  requiresPracticalAssignment: boolean;
}

export interface CertificateRequirement {
  id: string;
  description: string;
}

export interface LcdUpdateLogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  impact: string;
}

export interface ProgramTool {
  id: string;
  title: string;
  audience: AudienceTrackId | "all";
  summary: string;
  downloadUrl: string;
  formRoute: string;
  printFriendly: boolean;
}

export interface DocumentationPackFieldGroup {
  id: string;
  title: string;
  fields: string[];
}

export interface ProgramCatalog {
  portability: {
    scorm: string[];
    xapi: boolean;
  };
  latestLcdHandling: {
    strategy: string;
    requiredSkills: string[];
  };
  certificateRequirements: CertificateRequirement[];
  sharedCore: ProgramModule[];
  tracks: ProgramTrack[];
  trackModules: Record<AudienceTrackId, ProgramModule[]>;
  lcdUpdateLog: LcdUpdateLogEntry[];
  toolLibrary: ProgramTool[];
  documentationPack: {
    title: string;
    summary: string;
    downloadUrl: string;
    sourceReferences: string[];
    fieldGroups: DocumentationPackFieldGroup[];
  };
}

export const CERTIFICATE_REQUIREMENTS: CertificateRequirement[] = [
  { id: "video-progress", description: "Watch at least 90% of each lesson." },
  { id: "module-quizzes", description: "Complete every module quiz." },
  { id: "final-exam", description: "Pass the final exam with a score of at least 80%." },
  {
    id: "provider-practical",
    description: "Provider track requires a documentation practical assignment score of at least 80%.",
  },
  {
    id: "facility-assignment",
    description: "Facility track includes a wound-packet operational assignment upload.",
  },
];

export const PROGRAM_TRACKS: ProgramTrack[] = [
  {
    id: "providers",
    code: "PROV",
    title: "Provider Track",
    catalogName: "Provider Track (Clinical + Documentation + Audit-Ready)",
    certificateTitle: AWB_BRAND.masterProgramTitle,
    estimatedHours: "6-8 hours",
    outcomes: [
      "Perform advanced wound assessment and build a defensible plan of care.",
      "Select candidates for skin grafting and CTP use appropriately.",
      "Document and code with LCD-aligned specificity.",
      "Reduce denials by aligning documentation to MAC-driven standards.",
    ],
    moduleCount: 10,
    finalExamQuestions: 50,
    passScore: 80,
    requiresPracticalAssignment: true,
  },
  {
    id: "sales-marketers",
    code: "SALES",
    title: "Sales & Marketing Track",
    catalogName: "Sales & Marketing Track (Access + Evidence + Compliance)",
    certificateTitle: AWB_BRAND.masterProgramTitle,
    estimatedHours: "3-4 hours",
    outcomes: [
      "Explain wound care product value using compliant evidence language.",
      "Navigate Medicare LCD realities without coverage promises.",
      "Support documentation workflows ethically.",
      "Avoid fraud-and-abuse pitfalls in field execution.",
    ],
    moduleCount: 7,
    finalExamQuestions: 30,
    passScore: 80,
    requiresPracticalAssignment: false,
  },
  {
    id: "distributors",
    code: "DIST",
    title: "Distributor Track",
    catalogName: "Distributor Track (Operations + Traceability + Compliant Support)",
    certificateTitle: AWB_BRAND.masterProgramTitle,
    estimatedHours: "2.5-3.5 hours",
    outcomes: [
      "Maintain product integrity, traceability, and storage controls.",
      "Support compliant replenishment and documentation logistics.",
      "Understand clinic documentation needs without practicing medicine.",
    ],
    moduleCount: 6,
    finalExamQuestions: 25,
    passScore: 80,
    requiresPracticalAssignment: false,
  },
  {
    id: "post-acute-senior-care",
    code: "FAC",
    title: "Post-Acute & Senior Care Track",
    catalogName: "Post-Acute & Senior Care Track (SNF/NH/ALF/Adult Senior Care)",
    certificateTitle: "Post-Acute Wound Care & Skin Grafting Operations",
    estimatedHours: "4-6 hours",
    outcomes: [
      "Implement a facility-wide wound workflow aligned to document, measure, trend, and escalate.",
      "Run barrier screening and document it once for reuse across visits.",
      "Standardize pressure injury prevention, offloading, and adherence documentation.",
      "Prepare defensible documentation packets for advanced modalities and grafting.",
    ],
    moduleCount: 7,
    finalExamQuestions: 30,
    passScore: 80,
    requiresPracticalAssignment: false,
  },
  {
    id: "asc-ortho",
    code: "ASC",
    title: "ASC / Ortho Track",
    catalogName: "ASC / Ortho Track (Operations + Grafting + Audit-Ready)",
    certificateTitle: "Surgical Wounds, Skin Grafting & Biologic Adjuncts (ASC/Ortho)",
    estimatedHours: "4-6 hours",
    outcomes: [
      "Classify surgical and traumatic wounds and plan closure strategy plus escalation.",
      "Prepare a graft-ready wound bed and document the rationale clearly.",
      "Standardize postoperative protocols and complication documentation.",
      "Communicate coverage correctly without guarantees.",
    ],
    moduleCount: 7,
    finalExamQuestions: 30,
    passScore: 80,
    requiresPracticalAssignment: false,
  },
];

export const SHARED_CORE_MODULES: ProgramModule[] = [
  {
    id: "CORE-1",
    title: "Medicare Coverage Logic (LCD/NCD/Article)",
    audience: "shared-core",
    summary: "How Medicare decides what is reasonable, necessary, and sufficiently documented.",
    outcomes: [
      "Distinguish LCD, NCD, and Article roles in denials and appeals.",
      "Use MAC jurisdiction to locate the controlling policy language.",
      "Understand why documentation remains the reimbursement gate.",
    ],
    lessons: [
      lesson("CORE-1-1", "How Medicare decides: reasonable and necessary + documentation sufficiency", "lecture", 10),
      lesson("CORE-1-2", "LCD vs NCD vs Articles: what actually drives denials", "workflow", 8),
      lesson("CORE-1-3", "Case-by-case reality after LCD withdrawals", "lecture", 8),
    ],
  },
  {
    id: "CORE-2",
    title: "Audit-Ready Wound Documentation",
    audience: "shared-core",
    summary: "Measurement, tissue, infection, debridement note, and plan-of-care standards that survive review.",
    outcomes: [
      "Produce wound notes complete enough to support advanced therapies.",
      "Use consistent measurement and progress tracking methods.",
      "Avoid common documentation denial triggers.",
    ],
    downloads: [
      "Wound visit documentation template",
      "Photo protocol one-pager",
      "Plan of Care template",
    ],
    lessons: [
      lesson("CORE-2-1", "The non-negotiables: measure, stage, and trend", "clinical-demo", 10),
      lesson("CORE-2-2", "Writing a debridement note: depth, method, area, tissue", "clinical-demo", 10),
      lesson("CORE-2-3", "Plan of care: what Medicare expects to see", "lecture", 8),
      lesson("CORE-2-4", "Using photos correctly (and safely)", "workflow", 7),
    ],
  },
  {
    id: "CORE-3",
    title: "Debridement Essentials",
    audience: "shared-core",
    summary: "Coverage scope, depth-based documentation, and common debridement denial triggers.",
    outcomes: [
      "Differentiate debridement from non-debridement wound care.",
      "Document actual tissue depth removed rather than visible structures.",
      "Map procedure details to defensible coding logic.",
    ],
    lessons: [
      lesson("CORE-3-1", "What counts as debridement (and what doesn’t)", "lecture", 8),
      lesson("CORE-3-2", "Depth-based coding logic: choosing the correct level", "clinical-demo", 10),
      lesson("CORE-3-3", "Common denial triggers: exposed bone does not equal bone removed", "lecture", 7),
    ],
  },
];

export const TRACK_MODULES: Record<AudienceTrackId, ProgramModule[]> = {
  providers: [
    module("P1", "Advanced wound assessment & staging", "providers", "Etiology differentiation, perfusion, neuropathy, and risk stratification.", 3),
    module("P2", "Infection, biofilm, inflammation", "providers", "Local versus systemic infection, culture strategy, and stewardship.", 3),
    module("P3", "Debridement mastery", "providers", "Technique selection plus LCD-aligned documentation and coding.", 3),
    module("P4", "Moisture balance, dressings, and advanced modalities", "providers", "Dressing algorithms and high-level modality selection.", 3),
    module("P5", "Offloading and compression", "providers", "DFU offloading and VLU compression with adherence barriers.", 3),
    module("P6", "When standard care has failed", "providers", "Stalled healing criteria and escalation decisioning.", 3),
    module("P7", "Skin grafting fundamentals", "providers", "Autografts, allografts, xenografts, recipient bed preparation, and aftercare.", 3),
    module("P8", "Skin substitute grafts / CTPs", "providers", "DFU/VLU adjunct use and MAC-driven coverage logic.", 3),
    module("P9", "Billing, coding, modifiers, and claim support", "providers", "Claim-line mapping, denial reasons, and MCD retrieval workflow.", 3),
    module("P10", "Audit readiness & compliance", "providers", "Record completeness, photo reconciliation, and internal QA workflows.", 3),
  ],
  "sales-marketers": [
    module("S1", "Wound care 101 for commercial teams", "sales-marketers", "Basic wound types, standard care, and escalation pathways.", 3),
    module("S2", "Medicare coverage: what you can and cannot say", "sales-marketers", "Coverage is payer-policy and documentation dependent.", 3),
    module("S3", "LCD documentation support without steering care", "sales-marketers", "Support tools and the lines you cannot cross.", 3),
    module("S4", "Evidence & claims: communicating responsibly", "sales-marketers", "Evidence tiers, endpoints, and avoiding overclaims.", 3),
    module("S5", "Objection handling with compliance", "sales-marketers", "Coverage objections, pricing changes, and scrutiny responses.", 3),
    module("S6", "Ethical marketing and fraud-and-abuse basics", "sales-marketers", "AKS/Stark awareness and documentation integrity.", 3),
    module("S7", "Field playbook", "sales-marketers", "Call flow, stakeholder map, and clinic onboarding checklist.", 3),
  ],
  distributors: [
    module("D1", "Wound care ecosystem & terminology", "distributors", "Roles across clinics, MACs, DMEs, and manufacturers.", 3),
    module("D2", "Chain of custody, traceability, and storage controls", "distributors", "Lot control, expiration, and product integrity.", 3),
    module("D3", "Ordering workflows & site onboarding", "distributors", "PAR levels, consignment, and shortage mitigation.", 3),
    module("D4", "Documentation logistics that reduce friction", "distributors", "What clinics must capture and how to support workflow organization.", 3),
    module("D5", "Returns, wastage, substitutions, and compliance", "distributors", "Policies, wastage logs, and risk flags.", 3),
    module("D6", "Audit support & incident response", "distributors", "Record retention and what to do during review.", 3),
  ],
  "post-acute-senior-care": [
    facilityModule("F1", "Facility wound workflow & roles", "IDT model for SNF/NH/ALF wound rounds and role ownership.", [
      "Video: Who documents what in SNF/NH so nothing is missed",
      "Output: Facility wound workflow map",
      "Output: Weekly wound rounds checklist",
    ]),
    facilityModule("F2", "Pressure injury prevention + risk scoring", "Braden and Norton scoring thresholds tied to facility actions.", [
      "Video: Braden & Norton: scoring, thresholds, and what actions follow",
      "Template: Pressure injury prevention bundle",
    ]),
    facilityModule("F3", "Barrier screening that impacts healing", "Diabetes, vascular, nutrition, and smoking documentation that can be reused each visit.", [
      "Video: Diabetes, vascular insufficiency, nutrition, tobacco, and alcohol barrier screening",
      "Reuse once-per-visit barrier prompts",
    ]),
    facilityModule("F4", "Offloading, support surfaces, and compliance documentation", "Facility-level support surface, ROHO, boots, and duration/results documentation.", [
      "Video: Offloading in a facility: boots, cushions, mattresses, and duration/results",
    ]),
    facilityModule("F5", "Wound assessment & measurement standardization", "Head-to-toe orientation, tunneling, undermining, tissue percentages, exudate, and periwound.", [
      "Video: Measurement technique and tissue percentage documentation",
      "Checklist: LxWxD, U/T, tissue %, exudate, periwound",
    ]),
    facilityModule("F6", "Debridement documentation basics", "What nursing and facility teams should capture before and after debridement.", [
      "Video: What nursing should capture before/after debridement",
      "Policy anchor: debridement rigor plus photo recommendation",
    ]),
    facilityModule("F7", "Escalation to advanced modalities + skin substitutes", "Failed conservative care trend review and documentation packet readiness.", [
      "Video: When standard care has failed and the documentation package must be ready",
      "Operational assignment: build your facility wound packet",
    ]),
  ],
  "asc-ortho": [
    surgicalModule("SURG1", "Surgical wound types & complication taxonomy", "Dehiscence, infection, seroma, necrosis, and hardware exposure that alter management."),
    surgicalModule("SURG2", "Recipient bed preparation", "Devitalized tissue removal, bioburden control, moisture balance, and depth/extent documentation."),
    surgicalModule("SURG3", "Skin grafting fundamentals in ASC", "STSG/FTSG overview, fixation, immobilization, and dressing protocols."),
    surgicalModule("SURG4", "Biologic adjuncts and CTP workflow", "Medical necessity documentation and response tracking for biologic adjuncts."),
    surgicalModule("SURG5", "Postop monitoring and documentation", "Serial measurements, photos, complication log, and exudate/infection checklist."),
    surgicalModule("SURG6", "Ortho-specific considerations", "Hardware-adjacent incisions, edema control, offloading, and rehab coordination."),
    surgicalModule("SURG7", "Claims defensibility & audit readiness", "Baseline, standard care, escalation rationale, and MAC-driven coverage realities."),
  ],
};

export const TOOL_LIBRARY: ProgramTool[] = [
  {
    id: "awb-documentation-pack",
    title: "AWB Wound Documentation Pack",
    audience: "all",
    summary: "Standardized AWB dictation-guide language for place of service, barrier screening, debridement, and skin substitute applications.",
    downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "facility-wound-rounds",
    title: "AWB Weekly Wound Rounds Checklist",
    audience: "post-acute-senior-care",
    summary: "Weekly SNF/NH/ALF rounds checklist covering measurements, infection status, barriers, labs, and escalation flags.",
    downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "pressure-injury-bundle",
    title: "AWB Pressure Injury Prevention Bundle",
    audience: "post-acute-senior-care",
    summary: "Braden/Norton-driven prevention, support surfaces, repositioning, nutrition, and minimum documentation bundle.",
    downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "escalation-packet",
    title: "AWB Escalation Packet Checklist",
    audience: "all",
    summary: "30-day record assembly checklist for advanced modalities and CTP escalation.",
    downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "post-op-graft-care",
    title: "AWB Post-Op Graft Care Protocol",
    audience: "asc-ortho",
    summary: "Immediate postop protocol, dressing instructions, activity restrictions, monitoring triggers, and follow-up cadence.",
    downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "wound-care-lcd",
    title: "LCD - Wound Care (L37166)",
    audience: "all",
    summary: "Reference copy of the Wound Care LCD language used as the course documentation backbone.",
    downloadUrl: "/downloads/lcd-wound-care-l37166.pdf",
    formRoute: "/lcd-updates",
    printFriendly: true,
  },
];

export const DOCUMENTATION_PACK = {
  title: "AWB Wound Documentation Pack",
  summary:
    "Single standardized documentation language across provider clinic, SNF/NH/ALF, ASC, and Ortho workflows.",
  downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
  sourceReferences: [
    "WOUND CARE DICTATION GUIDE.pdf",
    "LCD - Wound Care (L37166) copy.pdf",
  ],
  fieldGroups: [
    {
      id: "place-of-service",
      title: "Place of service selector",
      fields: ["Home", "ALF", "Nursing home", "SNF", "Office", "ASC", "Ortho clinic"],
    },
    {
      id: "barrier-screening",
      title: "Barrier screening",
      fields: [
        "A1c and diabetes control",
        "Vascular tests",
        "Nutrition and labs",
        "Smoking/alcohol counseling",
      ],
    },
    {
      id: "risk-scales",
      title: "Risk scales",
      fields: ["Braden score", "Norton score"],
    },
    {
      id: "debridement-measurements",
      title: "Pre/post debridement measurements",
      fields: [
        "LxWxD",
        "Undermining/tunneling",
        "Tissue percentages",
        "Exudate",
        "Periwound",
      ],
    },
    {
      id: "skin-substitute-fields",
      title: "Skin substitute application fields",
      fields: [
        "Product name and size",
        "HCPCS",
        "Amount used and wasted",
        "Tissue ID",
        "Expiration date",
      ],
    },
    {
      id: "medical-necessity",
      title: "Medical necessity scaffold",
      fields: [
        "Conservative care >= 4 weeks",
        "Consent",
        "Goals",
        "Failed conservative care narrative",
      ],
    },
  ],
} satisfies ProgramCatalog["documentationPack"];

export const LCD_UPDATE_LOG: LcdUpdateLogEntry[] = [
  {
    id: "lcd-2026-01-withdrawal",
    date: "2026-01-01",
    title: "CMS withdrew the planned January 1, 2026 DFU/VLU skin substitute LCD rollout",
    summary: "The platform teaches learners to work from current MAC jurisdiction and MCD lookup rather than a single national rollout assumption.",
    impact: "Shared core and role-specific modules emphasize MAC-driven review, MCD workflow, and documentation sufficiency instead of coverage promises.",
  },
  {
    id: "lcd-mac-jurisdiction",
    date: "2026-01-02",
    title: "MAC jurisdiction remains the operational starting point",
    summary: "Coverage expectations differ by MAC, so the course requires learners to identify jurisdiction before reading LCD or Article language.",
    impact: "Catalog, field scripts, and audit workflow all point learners back to jurisdiction-specific policy retrieval.",
  },
  {
    id: "lcd-common-documentation",
    date: "2026-01-03",
    title: "Common LCD documentation expectations remain the durable teaching backbone",
    summary: "Measurement, infection status, tissue characterization, debridement specificity, plan of care, and progress trending stay central.",
    impact: "Downloadables, quizzes, practical assignments, and templates align to these recurring documentation elements.",
  },
];

export const PROGRAM_CATALOG: ProgramCatalog = {
  portability: {
    scorm: ["SCORM 1.2", "SCORM 2004"],
    xapi: true,
  },
  latestLcdHandling: {
    strategy: "Teach MAC-jurisdiction lookup, MCD retrieval, and documentation sufficiency instead of assuming one uniform LCD applies nationally.",
    requiredSkills: [
      "Identify MAC jurisdiction",
      "Use the Medicare Coverage Database effectively",
      "Document wound measurements, infection status, tissue removed, plan of care, and progress tracking",
    ],
  },
  certificateRequirements: CERTIFICATE_REQUIREMENTS,
  sharedCore: SHARED_CORE_MODULES,
  tracks: PROGRAM_TRACKS,
  trackModules: TRACK_MODULES,
  lcdUpdateLog: LCD_UPDATE_LOG,
  toolLibrary: TOOL_LIBRARY,
  documentationPack: DOCUMENTATION_PACK,
};

function lesson(
  id: string,
  title: string,
  format: ProgramLesson["format"],
  durationMin: number,
): ProgramLesson {
  return {
    id,
    title,
    format,
    durationMin,
    objectives: [],
  };
}

function module(
  id: string,
  title: string,
  audience: AudienceTrackId,
  summary: string,
  lessonCount: number,
): ProgramModule {
  return {
    id,
    title,
    audience,
    summary,
    outcomes: [],
    lessons: Array.from({ length: lessonCount }, (_, index) =>
      lesson(`${id}-L${index + 1}`, `${title} lesson ${index + 1}`, "lecture", 8),
    ),
  };
}

function facilityModule(
  id: string,
  title: string,
  summary: string,
  outcomes: string[],
): ProgramModule {
  return {
    id,
    title,
    audience: "post-acute-senior-care",
    summary,
    outcomes,
    downloads: ["AWB Wound Documentation Pack", "AWB Weekly Wound Rounds Checklist"],
    lessons: [lesson(`${id}-1`, title, "workflow", 9)],
  };
}

function surgicalModule(id: string, title: string, summary: string): ProgramModule {
  return {
    id,
    title,
    audience: "asc-ortho",
    summary,
    outcomes: [],
    downloads: ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    lessons: [lesson(`${id}-1`, title, "lecture", 9)],
  };
}
