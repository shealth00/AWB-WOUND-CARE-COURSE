// awb-course-lessons.seed.ts
// Seed data to replace placeholder lessons with real lesson content

export type CourseLessonSeed = {
  code: string;
  title: string;
  track: string;
  module: string;
  durationMinutes: number;
  owner: string;
  lessonType: "video";
  status: "published";
  shortDescription: string;
  learningObjectives: string[];
  script: string;
};

// Canonical seed payload provided by course design.
// This file is intentionally source-of-truth content for CMS/DB imports.
export const awbCourseLessonSeeds: CourseLessonSeed[] = [
  {
    code: "asc_ortho_surgical_wound_types_complication_taxonomy",
    title: "Surgical wound types & complication taxonomy",
    track: "ASC / Ortho Track",
    module: "Surgical wound types & complication taxonomy",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Classify surgical wounds accurately, recognize common postoperative complications, and document findings in a clinically useful and defensible way.",
    learningObjectives: [
      "Differentiate major surgical wound categories",
      "Recognize common postoperative wound complications",
      "Distinguish expected postoperative change from concerning deterioration",
      "Document wound findings using precise terminology",
    ],
    script:
      "Welcome. In this lesson, we organize surgical wounds into a practical taxonomy that supports assessment, communication, and escalation. Start by separating clean incisions, traumatic surgical wounds, dehisced wounds, graft or flap donor and recipient sites, and wounds complicated by infection, ischemia, hematoma, seroma, or hardware exposure. The goal is not just labeling. The goal is understanding what threatens closure. When you assess a postop wound, ask: is this healing on the expected timeline, or is there a complication changing the risk profile? Taxonomy matters because documentation drives decisions, coding logic, and team response. A superficial separation is different from full-thickness dehiscence. Erythema without drainage is different from purulence with systemic signs. A stable dry eschar is different from tissue loss over a pressure point after immobilization. Use precise language, note anatomic site, closure type, drainage, tissue integrity, edge condition, surrounding skin, pain pattern, and any implanted material. A wound described correctly is easier to defend, treat, and monitor.",
  },
  {
    code: "asc_ortho_recipient_bed_preparation",
    title: "Recipient bed preparation",
    track: "ASC / Ortho Track",
    module: "Recipient bed preparation",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Assess wound bed readiness before grafting, biologic use, or other advanced closure strategies.",
    learningObjectives: [
      "Define recipient bed readiness",
      "Identify wound bed barriers that prevent advanced closure success",
      "Document pre- and post-preparation wound status clearly",
      "Link preparation steps to medical necessity",
    ],
    script:
      "Recipient bed preparation determines whether advanced closure strategies have a real chance to succeed. Before applying a graft, biologic, or cellular tissue product, confirm the wound bed is ready. That means nonviable tissue has been addressed, bioburden is controlled, moisture is appropriate, perfusion concerns are recognized, and the wound has a healthy, supportable surface. Granulation alone is not enough. The bed must be clean, vascularized, and free of obvious barriers to incorporation. Document pre-application wound dimensions, tissue composition, exudate, undermining, tunneling, exposed structures, and signs that delay closure such as edema, pressure, shear, infection, or uncontrolled glucose. State what preparation was performed and why it was necessary. In procedural settings, link bed preparation to the medical goal: optimize adherence, reduce non-take risk, and support orderly healing. Avoid vague phrases like wound cleaned and ready. Instead, describe the condition before preparation, the intervention performed, and the status after preparation. Good preparation is clinical, operational, and evidentiary.",
  },
  {
    code: "asc_ortho_skin_grafting_fundamentals_in_asc",
    title: "Skin grafting fundamentals in ASC",
    track: "ASC / Ortho Track",
    module: "Skin grafting fundamentals in ASC",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Understand the essentials of skin grafting workflow, recipient bed readiness, securement, and follow-up in the ASC.",
    learningObjectives: [
      "Identify key prerequisites for skin graft success",
      "Understand graft workflow steps in the ASC",
      "Recognize common causes of graft failure",
      "Document grafting procedures thoroughly",
    ],
    script:
      "This lesson covers the practical fundamentals of skin grafting in the ambulatory surgery center. Start with case selection. The wound needs a recipient bed that can support take, and the patient needs a plan for edema control, protection, and follow-up. Understand the distinction between autograft, allograft, xenograft, and other adjunctive materials, and be precise about what is being applied. In the ASC, success depends on workflow discipline: site confirmation, bed preparation, product verification, sizing, securement, dressing selection, and postop instructions. Graft failure is often not one dramatic event. It is a chain of small preventable misses, such as residual necrosis, excessive motion, shear, pooled fluid, or poor offloading. Document the rationale for grafting, wound status immediately before application, product or graft details, area treated, fixation method, dressing plan, and follow-up interval. The more complex the closure strategy, the more important the documentation becomes. Technical execution matters, but so does proving why the intervention was appropriate.",
  },
  {
    code: "asc_ortho_biologic_adjuncts_ctp_workflow",
    title: "Biologic adjuncts and CTP workflow",
    track: "ASC / Ortho Track",
    module: "Biologic adjuncts and CTP workflow",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Use a workflow-first approach to biologic adjuncts and cellular or tissue-based products in ASC and orthopedic settings.",
    learningObjectives: [
      "Explain when advanced biologic support is reasonable",
      "Describe readiness and traceability requirements",
      "Capture product-use details accurately",
      "Connect product workflow to medical necessity",
    ],
    script:
      "Biologic adjuncts and cellular or tissue-based products belong inside a disciplined workflow, not a product-first mindset. Begin with indication. Why is standard management no longer enough, and what specific barrier are you trying to overcome? Then confirm readiness: adequate bed preparation, moisture balance, infection control, pressure mitigation, and a follow-up plan. Next comes product workflow. Verify identity, size, storage status, expiration, handling requirements, and traceability fields before the package is opened. Record the treated area, amount applied, any wastage, and securement method. In the ASC and ortho environment, coordination matters because timing, sterility, and product handling are tightly linked. The chart should show a straight line from wound status to medical necessity to product selection to application technique to postoperative protection. That is what makes the case clinically coherent and operationally reliable. A strong workflow reduces errors, supports reimbursement logic, and improves the odds that the intervention performs as intended.",
  },
  {
    code: "asc_ortho_postop_monitoring_documentation",
    title: "Postop monitoring and documentation",
    track: "ASC / Ortho Track",
    module: "Postop monitoring and documentation",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Monitor postoperative wound progression and document change over time in a way that supports early intervention.",
    learningObjectives: [
      "Track expected versus concerning postoperative progression",
      "Document wound changes comparatively over time",
      "Recognize early signs of complications",
      "Record follow-up and escalation actions clearly",
    ],
    script:
      "Postoperative monitoring is where good procedures either stay on track or begin to unravel. Your job is to identify early signals of complication before they become failures. Monitor pain trend, drainage pattern, dressing integrity, edema, temperature changes, edge stability, graft appearance if applicable, and the condition of surrounding skin. Note whether the expected healing trajectory is present. Stable improvement is not the same as no change, and no change is not the same as deterioration. Documentation should always compare today's findings with the prior visit. Include wound dimensions when appropriate, tissue appearance, exudate character, odor if present, adherence to offloading or immobilization instructions, and any escalation steps taken. Avoid generic statements like doing well. Instead, describe objective findings and the plan tied to those findings. Good postop documentation protects the patient first. It also protects the team by showing that complications were actively watched for, recognized, and managed with clinical reasoning rather than hindsight.",
  },
  {
    code: "asc_ortho_ortho_specific_considerations",
    title: "Ortho-specific considerations",
    track: "ASC / Ortho Track",
    module: "Ortho-specific considerations",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Address the wound-healing realities unique to orthopedic patients, including hardware, immobilization, pressure, and biomechanics.",
    learningObjectives: [
      "Identify orthopedic factors that alter wound-healing risk",
      "Recognize hardware-adjacent wound concerns",
      "Document mobility and device-related factors properly",
      "Escalate orthopedic wound concerns appropriately",
    ],
    script:
      "Orthopedic wounds bring issues that general wound workflows may understate. Hardware, casts, braces, limited mobility, swelling, pressure points, and altered biomechanics all change healing risk. In ortho, wound status cannot be separated from structural stability and load management. Ask whether the wound is being stressed by motion, edema, friction, or device contact. Also ask whether deeper structures or implants may be involved. A small superficial concern over hardware can carry outsized risk. Your documentation should connect the wound to the orthopedic context: procedure type, site, mobility restrictions, brace or immobilizer use, offloading strategy, infection concern, and communication with the operating team. Be especially careful with drainage timing, tissue separation, exposed tendon or hardware, and pressure injuries related to splints or immobilization. The best ortho wound notes show that the clinician understands both tissue healing and mechanical realities. Healing is not only a biologic process here. It is also an engineering problem.",
  },
  {
    code: "asc_ortho_claims_defensibility_audit_readiness",
    title: "Claims defensibility & audit readiness",
    track: "ASC / Ortho Track",
    module: "Claims defensibility & audit readiness",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Build a chart that supports medical necessity, procedural clarity, reimbursement logic, and audit resilience.",
    learningObjectives: [
      "Understand what makes a wound claim defensible",
      "Align chart details with procedure and product use",
      "Avoid common documentation inconsistencies",
      "Use structure to improve audit readiness",
    ],
    script:
      "Claims defensibility starts long before a payer asks questions. It begins with a chart that tells a complete, consistent, medically necessary story. In the ASC and ortho setting, auditors look for internal coherence. Does the diagnosis match the wound description? Does the procedure note match the product used? Do the dimensions support the amount billed? Is there a clear reason advanced care was needed? Build your documentation around those questions. Identify the wound clearly, describe the clinical problem, record what conservative or standard measures were attempted when relevant, document the state of the bed before intervention, capture product traceability and wastage, and state the postoperative plan. Avoid copy-paste drift, mismatched laterality, and templated phrases that do not fit the case. An auditor should be able to reconstruct the clinical logic without guessing. Strong audit readiness is not decorative paperwork. It is structured proof that the service was appropriate, supported, and executed with documented rationale.",
  },
  {
    code: "dist_wound_care_ecosystem_terminology_l1",
    title: "Wound care ecosystem & terminology lesson 1",
    track: "Distributor Track",
    module: "Wound care ecosystem & terminology",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Map the wound care ecosystem and understand the core terminology used by clinicians, facilities, distributors, and manufacturers.",
    learningObjectives: [
      "Identify key stakeholders in wound care delivery",
      "Differentiate operational from clinical terminology",
      "Use consistent language in field communication",
      "Reduce confusion across teams and sites",
    ],
    script:
      "In this first lesson, we map the wound care ecosystem. Distributors operate inside a network that includes physicians, nurse practitioners, surgery centers, post-acute facilities, home health, billing teams, manufacturers, and patients. Each stakeholder uses overlapping terminology, but not always with the same precision. Your role is to reduce confusion, not amplify it. Know the difference between chronic wound, acute wound, surgical wound, debridement, graft, dressing, biologic adjunct, and cellular or tissue-based product. Also understand the difference between clinical terminology and commercial shorthand. The closer your language stays to accepted clinical meaning, the less friction you create. This foundation matters because a distributor is often the bridge between product logistics and real-world care pathways. When you understand who does what and how the vocabulary is used, your communication becomes more accurate, compliant, and useful.",
  },
  {
    code: "dist_wound_care_ecosystem_terminology_l2",
    title: "Wound care ecosystem & terminology lesson 2",
    track: "Distributor Track",
    module: "Wound care ecosystem & terminology",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Understand the operational language that drives clean ordering, documentation, fulfillment, and site coordination.",
    learningObjectives: [
      "Recognize workflow-critical wound care terminology",
      "Understand where distributor responsibilities begin and end",
      "Support documentation and ordering workflows more effectively",
      "Use standardized language to reduce errors",
    ],
    script:
      "This lesson focuses on terminology that shapes operations. Learn the practical meaning of order intake, verification, site onboarding, chain of custody, storage controls, traceability, treated area, wastage, recipient bed, and follow-up interval. These are not just words for paperwork. They define how product moves safely and compliantly from source to site of care. Distributors need to understand the difference between what can be described operationally and what crosses into clinical judgment. For example, you can confirm required fields, but you should not independently reinterpret wound severity or tell providers what to document. Your value is process clarity, product accountability, and communication discipline. When terminology is used consistently across teams, fewer delays occur, fewer errors appear, and audits are easier to support.",
  },
  {
    code: "dist_wound_care_ecosystem_terminology_l3",
    title: "Wound care ecosystem & terminology lesson 3",
    track: "Distributor Track",
    module: "Wound care ecosystem & terminology",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Translate terminology into real-world execution for field teams, operations teams, and compliance workflows.",
    learningObjectives: [
      "Link terminology to operational actions",
      "Standardize language across internal teams",
      "Recognize escalation-triggering phrases quickly",
      "Improve field reliability through shared vocabulary",
    ],
    script:
      "In lesson three, we connect terminology to field execution. The most effective distributor teams understand which words trigger action. If a site says delayed case, temperature excursion, partial shipment, expired lot, substitution request, or documentation mismatch, each phrase should lead to a defined response. Build a shared vocabulary across sales, customer service, operations, and compliance so that everyone understands the same event the same way. Precision in language reduces preventable mistakes. It also protects credibility with clinicians and facilities. Your goal is to make the process easier without overstepping. The right terminology allows you to move faster, escalate earlier, and communicate in a way that supports clinical care while staying in the proper lane.",
  },
  {
    code: "postacute_facility_wound_workflow_roles",
    title: "Facility wound workflow & roles",
    track: "Post-Acute & Senior Care Track",
    module: "Facility wound workflow & roles",
    durationMinutes: 9,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Define role ownership and handoff structure for wound care inside post-acute and senior care facilities.",
    learningObjectives: [
      "Clarify role responsibilities across the care team",
      "Build a structured wound workflow from admission to escalation",
      "Reduce delays caused by role confusion",
      "Improve coordination and continuity of care",
    ],
    script:
      "Wound outcomes in post-acute care depend heavily on workflow clarity. In this lesson, define who does what, when, and how handoffs occur. Nursing staff identify changes, complete routine skin checks, and execute ordered care. Providers assess, diagnose, and adjust treatment plans. Therapy, dietary teams, administrators, and family often influence mobility, nutrition, and adherence. The problem in many facilities is not lack of effort. It is role confusion. When no one owns the next step, wounds worsen quietly. Create a structured pathway from admission screening to routine surveillance to escalation. Standardize how new wounds are reported, how measurements are recorded, when provider review occurs, and how follow-up is tracked. The facility should function like a system, not a series of isolated tasks. A reliable wound workflow improves healing, reduces avoidable deterioration, and creates documentation that reflects coordinated care.",
  },
  {
    code: "provider_advanced_wound_assessment_staging_l1",
    title: "Advanced wound assessment & staging lesson 1",
    track: "Provider Track",
    module: "Advanced wound assessment & staging",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Approach wound assessment by determining etiology first, not just surface appearance.",
    learningObjectives: [
      "Differentiate major wound etiologies",
      "Interpret wound findings in clinical context",
      "Apply the right classification mindset to the right wound type",
      "Improve diagnostic reasoning at the point of care",
    ],
    script:
      "Advanced wound assessment starts with etiology before treatment selection. In lesson one, focus on reading the wound in context. Is this pressure, venous, arterial, diabetic, surgical, traumatic, mixed, or moisture-associated damage? A wound described without etiologic thinking is only half assessed. Look at location, shape, margins, tissue pattern, exudate, pain profile, surrounding skin, and relevant systemic factors. Staging and classification matter, but they are not interchangeable across wound types. Use the right framework for the right wound. A provider-level assessment should translate bedside findings into a reasoned diagnostic impression and treatment direction.",
  },
  {
    code: "provider_advanced_wound_assessment_staging_l2",
    title: "Advanced wound assessment & staging lesson 2",
    track: "Provider Track",
    module: "Advanced wound assessment & staging",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Use correct depth, tissue, and staging language without forcing all wounds into the same classification system.",
    learningObjectives: [
      "Use staging and classification frameworks correctly",
      "Identify exposed structures and depth-related risk",
      "Document tissue findings with more precision",
      "Avoid misclassification errors that affect care and review",
    ],
    script:
      "In lesson two, we address depth, tissue involvement, and classification discipline. Know when a pressure injury can be staged, when it is unstageable, when deep tissue injury language applies, and when a non-pressure wound should be described rather than staged. Avoid forcing every wound into the wrong framework. Document exposed structures, undermining, tunneling, tissue percentages, bioburden clues, and periwound findings that change management. The chart should make the wound understandable to another clinician without needing to infer what you saw. Precision here improves treatment selection and later audit review.",
  },
  {
    code: "provider_advanced_wound_assessment_staging_l3",
    title: "Advanced wound assessment & staging lesson 3",
    track: "Provider Track",
    module: "Advanced wound assessment & staging",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Translate advanced wound assessment into a prioritized plan based on what is actually preventing healing.",
    learningObjectives: [
      "Identify what is currently preventing healing",
      "Connect wound findings to next-step interventions",
      "Use advanced assessment to guide escalation decisions",
      "Write more actionable provider notes",
    ],
    script:
      "This lesson turns advanced assessment into actionable clinical reasoning. Once the wound is correctly characterized, ask what is preventing healing now. Is it ischemia, edema, pressure, shear, infection, moisture imbalance, glycemic instability, poor adherence, or an inaccurate diagnosis? Advanced assessment is not a longer description. It is a more useful one. Your note should connect the wound findings to the plan: debridement, imaging, culture strategy when appropriate, vascular referral, compression, offloading, advanced modality consideration, or follow-up interval. A high-level assessment should change what happens next.",
  },
  {
    code: "provider_audit_readiness_compliance_l1",
    title: "Audit readiness & compliance lesson 1",
    track: "Provider Track",
    module: "Audit readiness & compliance",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Use internal chart consistency to support stronger medical necessity and compliance logic.",
    learningObjectives: [
      "Recognize the importance of note coherence",
      "Align wound findings with interventions",
      "Avoid cloned or contradictory documentation",
      "Strengthen compliance through accurate charting",
    ],
    script:
      "Audit readiness for providers begins with internal consistency. Every wound note should align diagnosis, assessment, procedure details, and plan. If you document debridement, the wound characteristics should justify it. If you use advanced products, the history should show why simpler care was insufficient. Auditors do not need perfect charts. They need coherent ones. Avoid cloned language, contradictory measurements, and generic plans that ignore actual findings. Good compliance is not defensive writing. It is accurate, decision-linked documentation that reflects what happened and why.",
  },
  {
    code: "provider_audit_readiness_compliance_l2",
    title: "Audit readiness & compliance lesson 2",
    track: "Provider Track",
    module: "Audit readiness & compliance",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Capture procedural detail and product-use detail cleanly in higher-risk audit areas.",
    learningObjectives: [
      "Document procedures more precisely",
      "Record product-use details and treated areas accurately",
      "Support medical necessity for advanced interventions",
      "Reduce exposure from vague procedural notes",
    ],
    script:
      "This lesson focuses on procedural and product-related risk areas. Capture wound size before intervention, describe tissue or pathology prompting treatment, record the method used, and state the post-procedure condition. For products, include name, size, area treated, amount used, wastage when applicable, and traceability details required by your workflow. The more advanced the intervention, the less room there is for vague charting. Compliance is strongest when the note reads like a clinically literate narrative rather than a billing template with blanks filled in.",
  },
  {
    code: "provider_audit_readiness_compliance_l3",
    title: "Audit readiness & compliance lesson 3",
    track: "Provider Track",
    module: "Audit readiness & compliance",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Build an audit-ready chart in real-world conditions by reducing documentation slippage and mismatch.",
    learningObjectives: [
      "Identify common sources of documentation slippage",
      "Reconcile measurements and problem lists accurately",
      "Write visit-specific notes instead of reused notes",
      "Support reviewer reconstruction without guesswork",
    ],
    script:
      "In lesson three, we build a defensible chart under real-world constraints. Most compliance failures are not dramatic fraud issues. They are slippage: missing details, copied findings, unsupported escalation, or disconnected follow-up plans. Build habits that reduce slippage. Reconcile measurements, update the problem list accurately, tailor the assessment to today's findings, and document why the next step is medically reasonable. A strong audit-ready note should allow an outside reviewer to reconstruct the case without filling in gaps from assumption.",
  },
  {
    code: "provider_infection_biofilm_inflammation_l1",
    title: "Infection, biofilm, inflammation lesson 1",
    track: "Provider Track",
    module: "Infection, biofilm, inflammation",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Differentiate colonization, infection, biofilm burden, and chronic inflammatory delay in wound healing.",
    learningObjectives: [
      "Separate infection from inflammation conceptually",
      "Recognize patterns suggestive of biofilm burden",
      "Interpret wound behavior beyond one isolated sign",
      "Improve diagnostic reasoning in stalled wounds",
    ],
    script:
      "Infection, biofilm, and inflammation overlap, but they are not interchangeable. In lesson one, separate colonization from invasive infection and distinguish both from a wound stalled by chronic inflammatory burden. Look for local signs, changes in exudate, friable tissue, odor, pain shifts, delayed granulation, and undermining patterns. Biofilm is not always visible, but the wound behavior can suggest its presence. The provider's task is to interpret the pattern, not just react to a single sign. A wound that stays inflamed and static despite apparently appropriate care requires deeper thinking.",
  },
  {
    code: "provider_infection_biofilm_inflammation_l2",
    title: "Infection, biofilm, inflammation lesson 2",
    track: "Provider Track",
    module: "Infection, biofilm, inflammation",
    durationMinutes: 8,
    owner: "AWB Academy",
    lessonType: "video",
    status: "published",
    shortDescription:
      "Turn signs of infection, biofilm, or inflammatory burden into a more disciplined treatment plan.",
    learningObjectives: [
      "Choose proportional next steps when infection is suspected",
      "Understand why biofilm management is rarely one-time",
      "Document treatment rationale more clearly",
      "Avoid generic infection scripting in wound notes",
    ],
    script:
      "This lesson turns recognition into management logic. When infection is suspected, decide what evidence supports that concern and what action is proportional: debridement, imaging, culture strategy, systemic treatment, local control, or urgent escalation. When biofilm is likely, remember that one-time intervention is rarely enough. The plan usually requires repeated disruption plus supportive wound bed management. Chronic inflammation also demands barrier correction, not just topical change. Document the rationale clearly. State what signs you saw, what you think they mean, and how the treatment plan addresses the specific problem rather than using a generic wound script.",
  },
];

export default awbCourseLessonSeeds;
