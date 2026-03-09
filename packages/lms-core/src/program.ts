import { LESSON_SCRIPT_LIBRARY, type LessonScript } from "./lessonScripts.js";
import { awbAcademyLessonReplacements } from "./lessonReplacements.js";
import { providerTrackLessons } from "./providerTrackLessons.js";
import { trackLessonReplacements } from "./trackLessonReplacements.js";

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
  slug: string;
  title: string;
  format: "lecture" | "clinical-demo" | "workflow" | "roleplay";
  durationMin: number;
  summary?: string;
  objectives: string[];
  complianceCallout?: string;
  script?: LessonScript;
  rawScript?: string;
  owner?: string;
}

interface ModuleLessonSeed {
  title: string;
  durationMin?: number;
  slug?: string;
  objectives?: string[];
  complianceCallout?: string;
}

const LESSON_REPLACEMENT_MAP = new Map(
  [...awbAcademyLessonReplacements, ...providerTrackLessons, ...trackLessonReplacements].map((lesson) => [
    lesson.slug,
    lesson,
  ]),
);

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
    catalogName: "Provider",
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
    catalogName: "Sales & Marketing",
    certificateTitle: AWB_BRAND.masterProgramTitle,
    estimatedHours: "3-4 hours",
    outcomes: [
      "Explain wound care product value using compliant evidence language.",
      "Navigate Medicare LCD realities without coverage promises.",
      "Support documentation workflows ethically.",
      "Avoid fraud-and-abuse pitfalls in field execution.",
    ],
    moduleCount: 7,
    finalExamQuestions: 40,
    passScore: 80,
    requiresPracticalAssignment: false,
  },
  {
    id: "distributors",
    code: "DIST",
    title: "Distributor Track",
    catalogName: "Distributor",
    certificateTitle: AWB_BRAND.masterProgramTitle,
    estimatedHours: "2.5-3.5 hours",
    outcomes: [
      "Maintain product integrity, traceability, and storage controls.",
      "Support compliant replenishment and documentation logistics.",
      "Understand clinic documentation needs without practicing medicine.",
    ],
    moduleCount: 6,
    finalExamQuestions: 30,
    passScore: 80,
    requiresPracticalAssignment: false,
  },
  {
    id: "post-acute-senior-care",
    code: "FAC",
    title: "Post-Acute & Senior Care Track",
    catalogName: "Post-Acute & Senior Care",
    certificateTitle: "Post-Acute Wound Care & Skin Grafting Operations",
    estimatedHours: "4-6 hours",
    outcomes: [
      "Implement a facility-wide wound workflow aligned to document, measure, trend, and escalate.",
      "Run barrier screening and document it once for reuse across visits.",
      "Standardize pressure injury prevention, offloading, and adherence documentation.",
      "Prepare defensible documentation packets for advanced modalities and grafting.",
    ],
    moduleCount: 7,
    finalExamQuestions: 40,
    passScore: 80,
    requiresPracticalAssignment: false,
  },
  {
    id: "asc-ortho",
    code: "ASC",
    title: "ASC / Ortho Track",
    catalogName: "ASC / Ortho",
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
  namedModule(
    "C1",
    "Medicare LCD Reality + Coverage Language",
    "shared-core",
    "Policy-first workflow for MAC-aware coverage and compliant communication.",
    [
      {
        title: "Case-by-Case Reality After LCD Withdrawals",
        durationMin: 8,
        slug: "case-by-case-reality-after-lcd-withdrawals",
      },
      {
        title: "How Medicare Decides: Reasonable and Necessary + Documentation Sufficiency",
        durationMin: 10,
        slug: "how-medicare-decides-reasonable-and-necessary-documentation-sufficiency",
      },
      {
        title: "LCD vs NCD vs Articles: What Actually Drives Denials",
        durationMin: 8,
        slug: "lcd-vs-ncd-vs-articles-what-actually-drives-denials",
      },
    ],
  ),
  namedModule(
    "C2",
    "Audit-Ready Wound Documentation",
    "shared-core",
    "Clinical note structure that is defensible for audit and escalation.",
    [
      {
        title: "Plan of Care: What Medicare Expects to See",
        durationMin: 8,
        slug: "plan-of-care-what-medicare-expects-to-see",
      },
      {
        title: "The Non-Negotiables: Measure, Stage, and Trend",
        durationMin: 10,
        slug: "the-non-negotiables-measure-stage-and-trend",
      },
      {
        title: "Using Photos Correctly (and Safely)",
        durationMin: 7,
        slug: "using-photos-correctly-and-safely",
      },
      {
        title: "Writing a Debridement Note: Depth, Method, Area, Tissue",
        durationMin: 10,
        slug: "writing-a-debridement-note-depth-method-area-tissue",
      },
    ],
    "clinical-demo",
    ["Wound visit documentation template", "Photo protocol one-pager", "Plan of Care template"],
  ),
  namedModule(
    "C3",
    "Debridement Essentials",
    "shared-core",
    "Clear debridement documentation and coding-ready note structure.",
    [
      {
        title: "Common Denial Triggers: Exposed Bone Does Not Equal Bone Removed",
        durationMin: 7,
        slug: "common-denial-triggers-exposed-bone-does-not-equal-bone-removed",
      },
      {
        title: "Depth-Based Coding Logic: Choosing the Correct Level",
        durationMin: 10,
        slug: "depth-based-coding-logic-choosing-the-correct-level",
      },
      {
        title: "What Counts as Debridement (and What Doesn't)",
        durationMin: 8,
        slug: "what-counts-as-debridement-and-what-doesnt",
      },
    ],
    "clinical-demo",
  ),
  namedModule(
    "C4",
    "Escalation to Advanced Modalities + Grafting/CTP",
    "shared-core",
    "Escalation logic tied to standard care and objective trends.",
    [
      "Standard of care by wound type",
      "Stalled healing and objective trend triggers",
      "Building the escalation packet: records, labs, photos",
    ],
    "workflow",
  ),
];

export const TRACK_MODULES: Record<AudienceTrackId, ProgramModule[]> = {
  providers: [
    namedModule(
      "P1",
      "Moisture balance, dressings, and advanced modalities",
      "providers",
      "Dressing-selection logic and escalation decisions tied to wound behavior.",
      [
        {
          title: "Moisture Balance, Dressings, and Advanced Modalities - Lesson 1",
          durationMin: 8,
          slug: "moisture-balance-dressings-advanced-modalities-lesson-1",
        },
        {
          title: "Moisture Balance, Dressings, and Advanced Modalities - Lesson 2",
          durationMin: 8,
          slug: "moisture-balance-dressings-advanced-modalities-lesson-2",
        },
        {
          title: "Moisture Balance, Dressings, and Advanced Modalities - Lesson 3",
          durationMin: 8,
          slug: "moisture-balance-dressings-advanced-modalities-lesson-3",
        },
      ],
      "clinical-demo",
    ),
    namedModule(
      "P2",
      "Offloading and compression",
      "providers",
      "Pressure redistribution and edema control as core healing mechanics.",
      [
        {
          title: "Offloading and Compression - Lesson 1",
          durationMin: 8,
          slug: "offloading-compression-lesson-1",
        },
        {
          title: "Offloading and Compression - Lesson 2",
          durationMin: 8,
          slug: "offloading-compression-lesson-2",
        },
        {
          title: "Offloading and Compression - Lesson 3",
          durationMin: 8,
          slug: "offloading-compression-lesson-3",
        },
      ],
      "clinical-demo",
    ),
    namedModule(
      "P3",
      "When standard care has failed",
      "providers",
      "Stalled-wound reassessment and escalation decision logic.",
      [
        {
          title: "When Standard Care Has Failed - Lesson 1",
          durationMin: 8,
          slug: "when-standard-care-has-failed-lesson-1",
        },
        {
          title: "When Standard Care Has Failed - Lesson 2",
          durationMin: 8,
          slug: "when-standard-care-has-failed-lesson-2",
        },
        {
          title: "When Standard Care Has Failed - Lesson 3",
          durationMin: 8,
          slug: "when-standard-care-has-failed-lesson-3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "P4",
      "Skin grafting fundamentals",
      "providers",
      "Graft readiness, placement protection, and follow-up decisioning.",
      [
        {
          title: "Skin Grafting Fundamentals - Lesson 1",
          durationMin: 8,
          slug: "skin-grafting-fundamentals-lesson-1",
        },
        {
          title: "Skin Grafting Fundamentals - Lesson 2",
          durationMin: 8,
          slug: "skin-grafting-fundamentals-lesson-2",
        },
        {
          title: "Skin Grafting Fundamentals - Lesson 3",
          durationMin: 8,
          slug: "skin-grafting-fundamentals-lesson-3",
        },
      ],
      "clinical-demo",
    ),
    namedModule(
      "P5",
      "Skin substitute grafts / CTPs",
      "providers",
      "Escalation pathways and charting standards for CTP episodes of care.",
      [
        {
          title: "Skin Substitute Grafts / CTPs - Lesson 1",
          durationMin: 8,
          slug: "skin-substitute-ctps-lesson-1",
        },
        {
          title: "Skin Substitute Grafts / CTPs - Lesson 2",
          durationMin: 8,
          slug: "skin-substitute-ctps-lesson-2",
        },
        {
          title: "Skin Substitute Grafts / CTPs - Lesson 3",
          durationMin: 8,
          slug: "skin-substitute-ctps-lesson-3",
        },
      ],
      "clinical-demo",
    ),
    namedModule(
      "P6",
      "Billing, coding, modifiers, and claim support",
      "providers",
      "Provider-biller alignment for accurate coding and defensible claims.",
      [
        {
          title: "Billing, Coding, Modifiers, and Claim Support - Lesson 1",
          durationMin: 8,
          slug: "billing-coding-modifiers-claim-support-lesson-1",
        },
        {
          title: "Billing, Coding, Modifiers, and Claim Support - Lesson 2",
          durationMin: 8,
          slug: "billing-coding-modifiers-claim-support-lesson-2",
        },
        {
          title: "Billing, coding, modifiers, and claim support lesson 3",
          durationMin: 8,
          slug: "provider-billing-coding-modifiers-claim-support-lesson-3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "P7",
      "Advanced wound assessment & staging",
      "providers",
      "Etiology-first classification and depth-accurate wound characterization for plan quality.",
      [
        {
          title: "Advanced wound assessment & staging lesson 1",
          durationMin: 8,
          slug: "provider_advanced_wound_assessment_staging_l1",
        },
        {
          title: "Advanced wound assessment & staging lesson 2",
          durationMin: 8,
          slug: "provider_advanced_wound_assessment_staging_l2",
        },
        {
          title: "Advanced wound assessment & staging lesson 3",
          durationMin: 8,
          slug: "provider_advanced_wound_assessment_staging_l3",
        },
      ],
      "clinical-demo",
    ),
    namedModule(
      "P8",
      "Audit readiness & compliance",
      "providers",
      "Chart coherence, procedural specificity, and reviewer-reconstructable visit logic.",
      [
        {
          title: "Audit readiness & compliance lesson 1",
          durationMin: 8,
          slug: "provider_audit_readiness_compliance_l1",
        },
        {
          title: "Audit readiness & compliance lesson 2",
          durationMin: 8,
          slug: "provider_audit_readiness_compliance_l2",
        },
        {
          title: "Audit readiness & compliance lesson 3",
          durationMin: 8,
          slug: "provider_audit_readiness_compliance_l3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "P9",
      "Infection, biofilm, inflammation",
      "providers",
      "Pattern-based interpretation and proportional intervention planning for stalled wounds.",
      [
        {
          title: "Infection, biofilm, inflammation lesson 1",
          durationMin: 8,
          slug: "provider_infection_biofilm_inflammation_l1",
        },
        {
          title: "Infection, biofilm, inflammation lesson 2",
          durationMin: 8,
          slug: "provider_infection_biofilm_inflammation_l2",
        },
        {
          title: "Infection, biofilm, inflammation lesson 3",
          durationMin: 8,
          slug: "provider_infection_biofilm_inflammation_l3",
        },
      ],
      "clinical-demo",
    ),
    namedModule(
      "P10",
      "Debridement Mastery",
      "providers",
      "Technique selection, procedural execution, and compliance-grade debridement documentation.",
      [
        {
          title: "Debridement Mastery - Lesson 1",
          durationMin: 8,
          slug: "debridement-mastery-lesson-1",
        },
        {
          title: "Debridement Mastery - Lesson 2",
          durationMin: 8,
          slug: "debridement-mastery-lesson-2",
        },
        {
          title: "Debridement Mastery - Lesson 3",
          durationMin: 8,
          slug: "debridement-mastery-lesson-3",
        },
      ],
      "clinical-demo",
    ),
  ],
  "sales-marketers": [
    namedModule(
      "S1",
      "Wound care 101 for commercial teams",
      "sales-marketers",
      "Commercial baseline for wound care workflows and role boundaries.",
      [
        {
          title: "Wound care 101 for commercial teams lesson 1",
          durationMin: 8,
          slug: "sales-wound-care-101-lesson-1",
        },
        {
          title: "Wound care 101 for commercial teams lesson 2",
          durationMin: 8,
          slug: "sales-wound-care-101-lesson-2",
        },
        {
          title: "Wound care 101 for commercial teams lesson 3",
          durationMin: 8,
          slug: "sales-wound-care-101-lesson-3",
        },
      ],
      "lecture",
    ),
    namedModule(
      "S2",
      "Medicare coverage: what you can and cannot say",
      "sales-marketers",
      "Coverage communication boundaries for compliant field execution.",
      [
        {
          title: "Medicare coverage: what you can and cannot say lesson 1",
          durationMin: 8,
          slug: "sales-medicare-coverage-what-you-can-and-cannot-say-lesson-1",
        },
        {
          title: "Medicare coverage: what you can and cannot say lesson 2",
          durationMin: 8,
          slug: "sales-medicare-coverage-what-you-can-and-cannot-say-lesson-2",
        },
        {
          title: "Medicare coverage: what you can and cannot say lesson 3",
          durationMin: 8,
          slug: "sales-medicare-coverage-what-you-can-and-cannot-say-lesson-3",
        },
      ],
      "lecture",
    ),
    namedModule(
      "S3",
      "Evidence & claims: communicating responsibly",
      "sales-marketers",
      "Evidence framing and compliant outcomes communication.",
      [
        {
          title: "Evidence & claims: communicating responsibly lesson 1",
          durationMin: 8,
          slug: "sales-evidence-and-claims-communicating-responsibly-lesson-1",
        },
        {
          title: "Evidence & claims: communicating responsibly lesson 2",
          durationMin: 8,
          slug: "sales-evidence-and-claims-communicating-responsibly-lesson-2",
        },
        {
          title: "Evidence & claims: communicating responsibly lesson 3",
          durationMin: 8,
          slug: "sales-evidence-and-claims-communicating-responsibly-lesson-3",
        },
      ],
      "lecture",
    ),
    namedModule(
      "S4",
      "Field Execution Playbook",
      "sales-marketers",
      "Operational field workflow for onboarding and stakeholder alignment.",
      [
        {
          title: "Field Playbook Lesson 1",
          durationMin: 8,
          slug: "field-playbook-lesson-1",
        },
        {
          title: "Field Playbook Lesson 2",
          durationMin: 8,
          slug: "field-playbook-lesson-2",
        },
        {
          title: "Field Playbook Lesson 3",
          durationMin: 8,
          slug: "field-playbook-lesson-3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "S5",
      "LCD documentation support without steering care",
      "sales-marketers",
      "Compliant support model for policy education without directing clinical charting.",
      [
        {
          title: "LCD documentation support without steering care lesson 1",
          durationMin: 8,
          slug: "sales-lcd-documentation-support-without-steering-care-lesson-1",
        },
        {
          title: "LCD documentation support without steering care lesson 2",
          durationMin: 8,
          slug: "sales-lcd-documentation-support-without-steering-care-lesson-2",
        },
        {
          title: "LCD documentation support without steering care lesson 3",
          durationMin: 8,
          slug: "sales-lcd-documentation-support-without-steering-care-lesson-3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "S6",
      "Objection handling with compliance",
      "sales-marketers",
      "Field objection handling that preserves compliance and long-term trust.",
      [
        {
          title: "Objection handling with compliance lesson 1",
          durationMin: 8,
          slug: "sales-objection-handling-with-compliance-lesson-1",
        },
        {
          title: "Objection handling with compliance lesson 2",
          durationMin: 8,
          slug: "sales-objection-handling-with-compliance-lesson-2",
        },
        {
          title: "Objection handling with compliance lesson 3",
          durationMin: 8,
          slug: "sales-objection-handling-with-compliance-lesson-3",
        },
      ],
      "roleplay",
    ),
    namedModule(
      "S7",
      "Ethical marketing and fraud-and-abuse basics",
      "sales-marketers",
      "Ethical commercial behavior and escalation boundaries for healthcare field teams.",
      [
        {
          title: "Ethical marketing and fraud-and-abuse basics lesson 1",
          durationMin: 8,
          slug: "sales-ethical-marketing-and-fraud-and-abuse-basics-lesson-1",
        },
        {
          title: "Ethical marketing and fraud-and-abuse basics lesson 2",
          durationMin: 8,
          slug: "sales-ethical-marketing-and-fraud-and-abuse-basics-lesson-2",
        },
        {
          title: "Ethical Marketing and Fraud-and-Abuse Basics Lesson 3",
          durationMin: 8,
          slug: "ethical-marketing-fraud-abuse-basics-lesson-3",
        },
      ],
      "lecture",
    ),
  ],
  distributors: [
    namedModule(
      "D1",
      "Wound care ecosystem & terminology",
      "distributors",
      "Shared language and role boundaries across the wound care distribution ecosystem.",
      [
        {
          title: "Wound care ecosystem & terminology lesson 1",
          durationMin: 8,
          slug: "dist_wound_care_ecosystem_terminology_l1",
        },
        {
          title: "Wound care ecosystem & terminology lesson 2",
          durationMin: 8,
          slug: "dist_wound_care_ecosystem_terminology_l2",
        },
        {
          title: "Wound care ecosystem & terminology lesson 3",
          durationMin: 8,
          slug: "dist_wound_care_ecosystem_terminology_l3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "D2",
      "Chain of custody, traceability, and storage controls",
      "distributors",
      "Custody integrity, storage discipline, and exception handling under operational pressure.",
      [
        {
          title: "Chain of custody, traceability, and storage controls lesson 1",
          durationMin: 8,
          slug: "dist_chain_custody_traceability_storage_l1",
        },
        {
          title: "Chain of custody, traceability, and storage controls lesson 2",
          durationMin: 8,
          slug: "dist_chain_custody_traceability_storage_l2",
        },
        {
          title: "Chain of custody, traceability, and storage controls lesson 3",
          durationMin: 8,
          slug: "dist_chain_custody_traceability_storage_l3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "D3",
      "Ordering workflows & site onboarding",
      "distributors",
      "Clean intake, verification, and onboarding controls that reduce downstream friction.",
      [
        {
          title: "Ordering workflows & site onboarding lesson 1",
          durationMin: 8,
          slug: "dist_ordering_workflows_site_onboarding_l1",
        },
        {
          title: "Ordering workflows & site onboarding lesson 2",
          durationMin: 8,
          slug: "dist_ordering_workflows_site_onboarding_l2",
        },
        {
          title: "Ordering workflows & site onboarding lesson 3",
          durationMin: 8,
          slug: "dist_ordering_workflows_site_onboarding_l3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "D4",
      "Documentation logistics that reduce friction",
      "distributors",
      "Operational documentation flow that scales cleanly and avoids avoidable rework.",
      [
        {
          title: "Documentation logistics that reduce friction lesson 1",
          durationMin: 8,
          slug: "dist_documentation_logistics_reduce_friction_l1",
        },
        {
          title: "Documentation logistics that reduce friction lesson 2",
          durationMin: 8,
          slug: "dist_documentation_logistics_reduce_friction_l2",
        },
        {
          title: "Documentation logistics that reduce friction lesson 3",
          durationMin: 8,
          slug: "dist_documentation_logistics_reduce_friction_l3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "D5",
      "Returns, wastage, substitutions, and compliance",
      "distributors",
      "Exception-event control standards for returns, substitutions, and waste handling.",
      [
        {
          title: "Returns, wastage, substitutions, and compliance lesson 1",
          durationMin: 8,
          slug: "dist_returns_wastage_substitutions_compliance_l1",
        },
        {
          title: "Returns, wastage, substitutions, and compliance lesson 2",
          durationMin: 8,
          slug: "dist_returns_wastage_substitutions_compliance_l2",
        },
        {
          title: "Returns, wastage, substitutions, and compliance lesson 3",
          durationMin: 8,
          slug: "dist_returns_wastage_substitutions_compliance_l3",
        },
      ],
      "workflow",
    ),
    namedModule(
      "D6",
      "Audit support & incident response",
      "distributors",
      "Evidence-first audit and incident response practices for reliable operations.",
      [
        {
          title: "Audit support & incident response lesson 1",
          durationMin: 8,
          slug: "dist_audit_support_incident_response_l1",
        },
        {
          title: "Audit support & incident response lesson 2",
          durationMin: 8,
          slug: "dist_audit_support_incident_response_l2",
        },
        {
          title: "Audit support & incident response lesson 3",
          durationMin: 8,
          slug: "dist_audit_support_incident_response_l3",
        },
      ],
      "workflow",
    ),
  ],
  "post-acute-senior-care": [
    namedModule(
      "F1",
      "Facility wound workflow & roles",
      "post-acute-senior-care",
      "Define ownership, handoffs, and escalation paths for consistent facility wound operations.",
      [
        {
          title: "Facility wound workflow & roles",
          durationMin: 9,
          slug: "postacute_facility_wound_workflow_roles",
        },
      ],
      "workflow",
      ["AWB Weekly Wound Rounds Checklist", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "F2",
      "Pressure injury prevention + risk scoring",
      "post-acute-senior-care",
      "Convert risk scoring into preventive action plans and defensible records.",
      [
        {
          title: "Pressure injury prevention + risk scoring",
          durationMin: 9,
          slug: "postacute_pressure_injury_prevention_risk_scoring",
        },
      ],
      "workflow",
      ["AWB Pressure Injury Prevention Bundle", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "F3",
      "Barrier screening that impacts healing",
      "post-acute-senior-care",
      "Systematic barrier identification to explain stalled healing and guide realistic plans.",
      [
        {
          title: "Barrier screening that impacts healing",
          durationMin: 9,
          slug: "postacute_barrier_screening_impacts_healing",
        },
      ],
      "workflow",
      ["AWB Wound Documentation Pack"],
    ),
    namedModule(
      "F4",
      "Offloading, support surfaces, and compliance documentation",
      "post-acute-senior-care",
      "Execution-focused offloading and support-surface documentation in real facility workflows.",
      [
        {
          title: "Offloading, support surfaces, and compliance documentation",
          durationMin: 9,
          slug: "postacute_offloading_support_surfaces_compliance_doc",
        },
      ],
      "workflow",
      ["AWB Wound Documentation Pack"],
    ),
    namedModule(
      "F5",
      "Wound assessment & measurement standardization",
      "post-acute-senior-care",
      "Repeatable wound-measurement standards for trend reliability and escalation quality.",
      [
        {
          title: "Wound assessment & measurement standardization",
          durationMin: 9,
          slug: "postacute_wound_assessment_measurement_standardization",
        },
      ],
      "workflow",
      ["AWB Wound Documentation Pack"],
    ),
    namedModule(
      "F6",
      "Debridement documentation basics",
      "post-acute-senior-care",
      "Pre/post debridement charting that supports communication and necessity logic.",
      [
        {
          title: "Debridement documentation basics",
          durationMin: 9,
          slug: "postacute_debridement_documentation_basics",
        },
      ],
      "workflow",
      ["AWB Wound Documentation Pack"],
    ),
    namedModule(
      "F7",
      "Escalation to advanced modalities + skin substitutes",
      "post-acute-senior-care",
      "Structured escalation criteria and cross-team coordination for advanced wound care.",
      [
        {
          title: "Escalation to advanced modalities + skin substitutes",
          durationMin: 9,
          slug: "postacute_escalation_advanced_modalities_skin_substitutes",
        },
      ],
      "workflow",
      ["AWB Escalation Packet Checklist", "AWB Wound Documentation Pack"],
    ),
  ],
  "asc-ortho": [
    namedModule(
      "O1",
      "Surgical wound types & complication taxonomy",
      "asc-ortho",
      "Classify postoperative wounds and complications with documentation that supports escalation.",
      [
        {
          title: "Surgical wound types & complication taxonomy",
          durationMin: 9,
          slug: "asc_ortho_surgical_wound_types_complication_taxonomy",
        },
      ],
      "clinical-demo",
      ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "O2",
      "Recipient bed preparation",
      "asc-ortho",
      "Preparation standards for grafting and advanced closure success.",
      [
        {
          title: "Recipient bed preparation",
          durationMin: 9,
          slug: "asc_ortho_recipient_bed_preparation",
        },
      ],
      "clinical-demo",
      ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "O3",
      "Skin grafting fundamentals in ASC",
      "asc-ortho",
      "ASC-specific graft workflow, risk controls, and postoperative discipline.",
      [
        {
          title: "Skin grafting fundamentals in ASC",
          durationMin: 9,
          slug: "asc_ortho_skin_grafting_fundamentals_in_asc",
        },
      ],
      "clinical-demo",
      ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "O4",
      "Biologic adjuncts and CTP workflow",
      "asc-ortho",
      "Workflow-first biologic and CTP execution tied to readiness and traceability.",
      [
        {
          title: "Biologic adjuncts and CTP workflow",
          durationMin: 9,
          slug: "asc_ortho_biologic_adjuncts_ctp_workflow",
        },
      ],
      "clinical-demo",
      ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "O5",
      "Postop monitoring and documentation",
      "asc-ortho",
      "Trend-based postoperative monitoring and documentation for early complication detection.",
      [
        {
          title: "Postop monitoring and documentation",
          durationMin: 9,
          slug: "asc_ortho_postop_monitoring_documentation",
        },
      ],
      "clinical-demo",
      ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "O6",
      "Ortho-specific considerations",
      "asc-ortho",
      "Mechanics-aware wound management for hardware, immobilization, and pressure risk.",
      [
        {
          title: "Ortho-specific considerations",
          durationMin: 9,
          slug: "asc_ortho_ortho_specific_considerations",
        },
      ],
      "clinical-demo",
      ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    ),
    namedModule(
      "O7",
      "Claims defensibility & audit readiness",
      "asc-ortho",
      "Build a coherent chart from wound state to intervention and follow-up logic.",
      [
        {
          title: "Claims defensibility & audit readiness",
          durationMin: 9,
          slug: "asc_ortho_claims_defensibility_audit_readiness",
        },
      ],
      "clinical-demo",
      ["AWB Post-Op Graft Care Protocol", "AWB Wound Documentation Pack"],
    ),
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
    id: "awb-risk-scales",
    title: "AWB Risk Scales (Braden + Norton)",
    audience: "all",
    summary: "One-page AWB risk scales sheet with standardized scoring and sign-off fields.",
    downloadUrl: "/downloads/awb-risk-scales.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "awb-pos-selector",
    title: "AWB Place of Service Selector",
    audience: "all",
    summary: "One-page branded place-of-service selector for clinic, SNF/NH/ALF, ASC, and Ortho workflows.",
    downloadUrl: "/downloads/awb-place-of-service-selector.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "awb-pos-tracking-tool",
    title: "AWB Place of Service Tracking Tool",
    audience: "all",
    summary: "Browser-based tracking tool with encounter log, KPI counters, filters, and CSV export.",
    downloadUrl: "/downloads/awb-place-of-service-tracking-tool.html",
    formRoute: "/forms",
    printFriendly: false,
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
  {
    id: "dictation-guide",
    title: "AWB Wound Care Dictation Guide",
    audience: "all",
    summary: "Core dictation standard covering place of service, barrier screening, risk scales, and procedure documentation.",
    downloadUrl: "/downloads/awb-wound-care-dictation-guide.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "clinical-note-review-requirements",
    title: "Clinical Note Review Requirements",
    audience: "all",
    summary: "Required chart elements checklist for 30-day review and escalation packet readiness.",
    downloadUrl: "/downloads/awb-requirements-clinical-note-review.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "assessment-sample-note",
    title: "Assessment Sample Note",
    audience: "all",
    summary: "Sample assessment note structure aligned to AWB documentation standards.",
    downloadUrl: "/downloads/awb-assessment-sample-note.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "graft-application-sample-note",
    title: "Graft Application Sample Note",
    audience: "all",
    summary: "Sample graft application note with product, units, and follow-up fields.",
    downloadUrl: "/downloads/awb-graft-application-sample-note.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "ctp-graft-guidelines",
    title: "CTP Graft Medicare Guidelines",
    audience: "all",
    summary: "Medicare-focused documentation framework for CTP and graft use.",
    downloadUrl: "/downloads/awb-ctp-graft-medicare-guidelines.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "ctp-assessment-guidelines",
    title: "CTP Assessment Medicare Guidelines",
    audience: "all",
    summary: "Assessment and medical-necessity considerations for CTP workflow readiness.",
    downloadUrl: "/downloads/awb-ctp-assessment-medicare-guidelines.pdf",
    formRoute: "/forms",
    printFriendly: true,
  },
  {
    id: "video-library-manifest",
    title: "AWB Video Library Catalog (JSON)",
    audience: "all",
    summary: "Starter 12-video lesson manifest for LMS ingestion and player mapping.",
    downloadUrl: "/videos/awb-video-catalog.json",
    formRoute: "/catalog",
    printFriendly: false,
  },
];

export const DOCUMENTATION_PACK = {
  title: "AWB Wound Documentation Pack",
  summary:
    "Single standardized documentation language across provider clinic, SNF/NH/ALF, ASC, and Ortho workflows.",
  downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
  sourceReferences: [
    "WOUND CARE DICTATION GUIDE (1).pdf",
    "Requirements for Clinical Note Review (1).pdf",
    "Assessment Sample Note for Pt.pdf",
    "Graft Application Sample Note for Pt.pdf",
    "CTP Graft Medicare Guidelines.pdf",
    "CTP Assessment Medicare Guidelines.pdf",
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
  slug: string,
  title: string,
  format: ProgramLesson["format"],
  durationMin: number,
  summary: string | undefined,
  objectives: string[] = [],
  complianceCallout?: string,
  script?: LessonScript,
  rawScript?: string,
  owner?: string,
): ProgramLesson {
  return {
    id,
    slug,
    title,
    format,
    durationMin,
    summary,
    objectives,
    complianceCallout,
    script,
    rawScript,
    owner,
  };
}

function namedModule(
  id: string,
  title: string,
  audience: AudienceTrackId | "shared-core",
  summary: string,
  lessonSeeds: Array<string | ModuleLessonSeed>,
  format: ProgramLesson["format"] = "lecture",
  downloads?: string[],
): ProgramModule {
  const normalizedLessons = lessonSeeds.map(normalizeLessonSeed);

  return {
    id,
    title,
    audience,
    summary,
    outcomes: normalizedLessons.map((seed) => `Apply: ${seed.title}`),
    downloads,
    lessons: normalizedLessons.map((seed, index) => {
      const lessonSlug = seed.slug ?? toLessonSlug(seed.title);
      const script = LESSON_SCRIPT_LIBRARY[lessonSlug];
      const replacement = LESSON_REPLACEMENT_MAP.get(lessonSlug);

      return lesson(
        `${id}-L${index + 1}`,
        lessonSlug,
        replacement?.title ?? seed.title,
        format,
        replacement?.durationMin ?? seed.durationMin ?? 8,
        replacement?.summary ?? undefined,
        seed.objectives ?? replacement?.learningObjectives ?? script?.learningObjectives ?? [],
        seed.complianceCallout,
        script,
        replacement?.script.trim(),
        replacement?.owner,
      );
    }),
  };
}

function normalizeLessonSeed(seed: string | ModuleLessonSeed): ModuleLessonSeed {
  if (typeof seed === "string") {
    return {
      title: seed,
    };
  }

  return seed;
}

function toLessonSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
