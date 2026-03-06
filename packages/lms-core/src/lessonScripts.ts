export interface LessonScriptSection {
  title: string;
  narration: string;
}

export interface LessonScript {
  hook: string;
  learningObjectives: string[];
  sections: LessonScriptSection[];
  close: string;
}

export const LESSON_SCRIPT_LIBRARY: Record<string, LessonScript> = {
  "ethical-marketing-fraud-abuse-basics-lesson-3": {
    hook: "In wound care, sustainable growth comes from compliant education, truthful positioning, and clear separation between clinical judgment and commercial influence.",
    learningObjectives: [
      "Recognize high-risk sales behavior in wound care.",
      "Differentiate education from inducement.",
      "Use compliant language with referral sources.",
      "Escalate questionable requests before they become liability.",
    ],
    sections: [
      {
        title: "Opening",
        narration:
          "In this lesson we move from theory into field reality. In advanced wound care, risk often starts with small shortcuts: outcome promises, implied coverage guarantees, medically unnecessary utilization, or documentation written to justify decisions after the fact.",
      },
      {
        title: "What ethical marketing looks like",
        narration:
          "Ethical marketing means education without pressure. You explain capabilities, workflows, access, documentation expectations, and patient selection boundaries. You never promise payment, approval, or direct clinical decisions.",
      },
      {
        title: "Fraud-and-abuse risk zones",
        narration:
          "High-risk zones include inducements, referral-based compensation problems, medically unnecessary utilization, and backfilled documentation. Field language that implies guaranteed qualification or coding manipulation is unacceptable.",
      },
      {
        title: "Safe field language",
        narration:
          "Use compliant language: coverage depends on patient-specific facts, payer rules, medical necessity, and documentation sufficiency. Final treatment decisions remain with the treating clinician.",
      },
      {
        title: "Field escalation rule",
        narration:
          "Escalate early when requests involve free items, unusual frequency, prefilled notes, outcome guarantees, or compensation tied to referral volume.",
      },
    ],
    close:
      "Tell the truth, avoid promises, protect clinical independence, and document boundaries. Ethical marketing is durable sales.",
  },
  "field-playbook-lesson-1": {
    hook: "A field rep in wound care needs a repeatable operating system.",
    learningObjectives: [
      "Structure a productive first meeting.",
      "Identify operational pain points without overpromising.",
      "Position AWB as a workflow partner.",
      "Capture next steps clearly.",
    ],
    sections: [
      {
        title: "Opening",
        narration:
          "The first field conversation should diagnose the environment: patient mix, wound types, documentation quality, ordering patterns, response times, and decision owners.",
      },
      {
        title: "First-meeting framework",
        narration:
          "Use context, friction, fit, and next step. Do not pitch everything; align only to the problem stated by the site.",
      },
      {
        title: "Questions to ask",
        narration:
          "Ask where documentation issues occur, how debridement notes are handled, and which patients become long-stay problem cases.",
      },
      {
        title: "Close with action",
        narration:
          "Leave with one concrete action such as a five-chart review, staff training session, or documentation gap analysis.",
      },
    ],
    close:
      "A good first meeting earns credibility by understanding the operation better than anyone else in the room.",
  },
  "field-playbook-lesson-2": {
    hook: "Follow-up is where field opportunities either mature or disappear.",
    learningObjectives: [
      "Run a disciplined follow-up workflow.",
      "Handle silence, delay, and internal resistance.",
      "Move from interest to pilot or launch step.",
      "Document field intelligence.",
    ],
    sections: [
      {
        title: "Opening",
        narration:
          "Follow-up is not reminding; it is advancing. Turn pain points into a defined implementation conversation.",
      },
      {
        title: "Follow-up sequence",
        narration:
          "Confirm what was heard, provide one relevant asset, and request one concrete next action.",
      },
      {
        title: "Handling objections",
        narration:
          "Reframe common objections with narrow pilot options, named decision stakeholders, and explicit criteria.",
      },
      {
        title: "Field intelligence",
        narration:
          "Document decision-maker names, champions, barriers, payer mix, documentation maturity, and urgency drivers.",
      },
    ],
    close:
      "Follow-up works when it is relevant, specific, and decision-oriented.",
  },
  "field-playbook-lesson-3": {
    hook: "Execution beats intention; the playbook matters only if it creates weekly consistency.",
    learningObjectives: [
      "Build a weekly field cadence.",
      "Prioritize accounts by fit and momentum.",
      "Use reporting that leadership can act on.",
      "Avoid wasted visits and random activity.",
    ],
    sections: [
      {
        title: "Weekly cadence",
        narration:
          "Each week should include prospecting, active account follow-up, implementation support, and pipeline review.",
      },
      {
        title: "Account prioritization",
        narration:
          "Prioritize by pain, fit, and responsiveness. High-pain, high-fit, responsive accounts deserve top focus.",
      },
      {
        title: "What to report",
        narration:
          "Report qualified opportunities, stage, named barriers, next scheduled action, and observed documentation gaps.",
      },
      {
        title: "Avoid wasted activity",
        narration:
          "Do not overvalue drop-ins and indefinite maybes. Protect time for accounts that can move.",
      },
    ],
    close: "Structured weeks, compliant messaging, and concrete next steps make field performance measurable.",
  },
  "case-by-case-reality-after-lcd-withdrawals": {
    hook: "After an LCD withdrawal, coverage is not automatic; medical necessity and chart quality matter more.",
    learningObjectives: [
      "Understand what changes after LCD withdrawal.",
      "Avoid broad coverage assumptions.",
      "Frame patient selection and documentation conservatively.",
      "Apply case-by-case reasoning.",
    ],
    sections: [
      {
        title: "What does not change",
        narration:
          "Reasonable and necessary standards remain. The chart must still show diagnosis, conservative care history, objective findings, and rationale for the selected service.",
      },
      {
        title: "Case-by-case review",
        narration:
          "Without narrow local guardrails, each chart carries more weight. Serial findings, prior interventions, and current barriers must be explicit.",
      },
      {
        title: "Operational implication",
        narration:
          "Tighten measurement consistency, conservative care history, and escalation rationale. Become more disciplined, not less.",
      },
    ],
    close: "Coverage is never presumed. It is supported one chart at a time.",
  },
  "how-medicare-decides-reasonable-and-necessary-documentation-sufficiency": {
    hook: "Medicare pays when the record supports that care was reasonable, necessary, and sufficiently documented.",
    learningObjectives: [
      "Define reasonable and necessary in practice.",
      "Understand documentation sufficiency.",
      "Identify chart elements reviewers expect.",
      "Strengthen medical-necessity narratives.",
    ],
    sections: [
      {
        title: "Reasonable and necessary",
        narration:
          "The intervention must fit condition, timing, and context. It cannot be excessive, duplicative, or premature.",
      },
      {
        title: "Documentation sufficiency",
        narration:
          "The record must be persuasive: baseline findings, prior treatment, barriers, assessment, plan, and trend.",
      },
      {
        title: "Reviewer expectations",
        narration:
          "Reviewers test consistency between wound description, treatment intensity, coded depth/area, and follow-up plan.",
      },
      {
        title: "Narrative quality",
        narration:
          "A strong narrative links chronicity, failed conservative care, measurable status, and rationale for next-step intervention.",
      },
    ],
    close: "Mastering medical necessity and documentation sufficiency reduces avoidable denials.",
  },
  "lcd-vs-ncd-vs-articles-what-actually-drives-denials": {
    hook: "Policy acronyms matter, but chart weakness drives most denials.",
    learningObjectives: [
      "Differentiate LCDs, NCDs, and Articles.",
      "Understand how policy hierarchy affects coverage review.",
      "Recognize chart weakness as a primary denial driver.",
      "Apply policy hierarchy correctly.",
    ],
    sections: [
      {
        title: "Practical hierarchy",
        narration:
          "National policy provides broad rules, local policy refines jurisdictional review, and Articles add implementation detail.",
      },
      {
        title: "Why denials happen",
        narration:
          "Common failures include missing chronicity, weak conservative care records, absent serial measurements, and inconsistent debridement detail.",
      },
      {
        title: "Operational takeaway",
        narration:
          "Policy literacy plus disciplined chart execution is the defendable combination.",
      },
    ],
    close: "Treat policy as framework and documentation as proof.",
  },
  "plan-of-care-what-medicare-expects-to-see": {
    hook: "A wound note without a plan of care is a snapshot, not a strategy.",
    learningObjectives: [
      "Define a complete wound plan of care.",
      "Link findings to interventions.",
      "Document goals and reassessment logic.",
      "Avoid generic template language.",
    ],
    sections: [
      {
        title: "Core elements",
        narration:
          "Include etiology, barriers, dressing strategy, offloading/compression, infection approach, follow-up cadence, and measurable goals.",
      },
      {
        title: "Weak vs strong plans",
        narration:
          "Avoid generic language. Use patient-specific, wound-specific, and time-bound plans.",
      },
    ],
    close: "A defensible plan of care makes clinical thinking visible and measurable.",
  },
  "the-non-negotiables-measure-stage-and-trend": {
    hook: "If the wound is not measured, classified, and trended correctly, the chart is unstable.",
    learningObjectives: [
      "Document accurate measurements.",
      "Use staging/classification appropriately.",
      "Trend progress over time.",
      "Avoid contradictory documentation.",
    ],
    sections: [
      {
        title: "Measure",
        narration:
          "Capture length, width, and depth consistently, plus undermining/tunneling when present.",
      },
      {
        title: "Stage or classify",
        narration:
          "Use the correct framework for wound type. Do not force every wound into one staging language.",
      },
      {
        title: "Trend",
        narration:
          "Interpret direction across visits: shrinking, stalled, or worsening, with tissue/exudate/periwound context.",
      },
    ],
    close: "Measure carefully, classify correctly, and trend deliberately.",
  },
  "using-photos-correctly-and-safely": {
    hook: "Photos strengthen documentation but do not replace a complete wound note.",
    learningObjectives: [
      "Use photos as supporting evidence.",
      "Avoid privacy and consent failures.",
      "Standardize photo capture.",
      "Understand documentation limits of photos.",
    ],
    sections: [
      {
        title: "Best use",
        narration:
          "Pair photos with measurements and written findings using consistent angle, scale, date, and site labeling.",
      },
      {
        title: "Privacy",
        narration:
          "Follow consent, storage, and transmission controls. Avoid unsecured personal-device workflows.",
      },
      {
        title: "Limits",
        narration:
          "Photos cannot establish debridement depth or replace tissue and plan-of-care documentation.",
      },
    ],
    close: "Use photos as adjunct evidence, not as a substitute for clinical note quality.",
  },
  "writing-a-debridement-note-depth-method-area-tissue": {
    hook: "Debridement claims are defended by what the note proves, not what the template implies.",
    learningObjectives: [
      "Write a complete debridement note.",
      "Document depth, method, area, and removed tissue clearly.",
      "Align note content with coding logic.",
      "Avoid vague unsupported statements.",
    ],
    sections: [
      {
        title: "Required structure",
        narration:
          "Document indication, tissue removed, method/instrument, deepest level removed, total area, tolerance, and post-procedure status.",
      },
      {
        title: "Depth and area",
        narration:
          "Depth is the deepest tissue actually removed, not merely visible. Area must be specific and supportable.",
      },
      {
        title: "Method and tissue",
        narration:
          "State method and tissue type removed using clinically and coding-appropriate terminology.",
      },
    ],
    close: "Precise, internally consistent notes are easier to defend.",
  },
  "common-denial-triggers-exposed-bone-does-not-equal-bone-removed": {
    hook: "Seeing deeper structures is not the same as debriding deeper structures.",
    learningObjectives: [
      "Separate wound visibility from debridement depth.",
      "Identify high-risk depth documentation errors.",
      "Avoid unsupported deeper-level coding.",
      "Write clearer depth statements.",
    ],
    sections: [
      {
        title: "Core denial trigger",
        narration:
          "Charts often imply bone or muscle debridement when those tissues were visible but not removed.",
      },
      {
        title: "Safer wording",
        narration:
          "Explicitly distinguish wound depth from debridement depth and document only tissue actually removed.",
      },
    ],
    close: "Literal documentation prevents depth-related denials.",
  },
  "depth-based-coding-logic-choosing-the-correct-level": {
    hook: "Correct debridement coding starts with the deepest level of tissue actually removed.",
    learningObjectives: [
      "Apply depth-based coding logic.",
      "Match documentation to the correct debridement level.",
      "Avoid coding based on wound appearance alone.",
      "Build coding discipline into note writing.",
    ],
    sections: [
      {
        title: "Step 1",
        narration:
          "Identify tissue removed: epidermis/dermis, subcutaneous tissue, muscle, or bone.",
      },
      {
        title: "Step 2",
        narration:
          "Match note detail to the proper code family using documented tissue depth and method.",
      },
      {
        title: "Step 3",
        narration:
          "Confirm total debrided area to support final code selection.",
      },
    ],
    close: "Code the deepest level clearly supported by the record, no deeper.",
  },
  "what-counts-as-debridement-and-what-doesnt": {
    hook: "Not every wound-care action is debridement, and mixing them creates audit risk.",
    learningObjectives: [
      "Distinguish debridement from routine cleansing/dressing care.",
      "Identify when tissue removal is clinically meaningful.",
      "Document procedures accurately.",
      "Avoid inflating minor services.",
    ],
    sections: [
      {
        title: "What counts",
        narration:
          "Debridement is intentional removal of devitalized or obstructive tissue to improve healing trajectory.",
      },
      {
        title: "What does not",
        narration:
          "Routine cleansing, topical application, and dressing changes are not automatically debridement.",
      },
      {
        title: "Why precision matters",
        narration:
          "Overcalling routine care as debridement weakens claim defensibility and increases audit exposure.",
      },
    ],
    close: "Document exactly what occurred and let the record support the right service level.",
  },
};
