export interface AwbAcademyLessonReplacement {
  slug: string;
  title: string;
  track: string;
  course: string;
  durationMin: number;
  owner: string;
  summary?: string;
  learningObjectives?: string[];
  script: string;
}

export const awbAcademyLessonReplacements: AwbAcademyLessonReplacement[] = [
  {
    slug: "provider-billing-coding-modifiers-claim-support-lesson-3",
    title: "Billing, coding, modifiers, and claim support lesson 3",
    track: "Provider Track",
    course: "Billing, coding, modifiers, and claim support",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
Welcome back. In lesson three, we move from coding theory to claim support in the real world. The goal is simple: submit claims that are accurate, medically supported, and audit-ready.

[SECTION 1 - CLAIM SUPPORT MINDSET]
A clean wound claim starts before the bill is dropped. It starts with clinical clarity. The chart needs to show the wound type, location, severity, duration, comorbid barriers, prior standard care, the treatment performed, and the ongoing plan. Billing cannot rescue poor documentation. Billing can only reflect what the record supports.

[SECTION 2 - WHAT CLAIM SUPPORT SHOULD INCLUDE]
For advanced wound services, your support stack usually includes:
the encounter note,
procedure detail,
measurements before and after when relevant,
medical necessity language,
diagnosis coding tied to the wound etiology,
product details when a skin substitute or biologic is used,
and any required consent or inventory logs.

If debridement is billed, the note should support the depth, tissue removed, instrument used, wound measurements, and total surface area treated. If an application is billed, the chart should support why the product was used at that point in the treatment pathway.

[SECTION 3 - MODIFIERS AND COMMON FAILURE POINTS]
Modifiers are not decorations. They communicate context. Use them only when the record supports them. Common denials happen when modifier use is inconsistent with the note, when diagnoses do not match the procedure, when product amount used versus wasted is unclear, or when repeated applications lack interval progress language.

[SECTION 4 - DENIAL PREVENTION WORKFLOW]
Before claim submission, use a simple checklist:
Does the note identify the wound clearly?
Does the procedure match the documented depth and size?
Does the diagnosis support the service?
Does the plan explain why treatment continues?
Are product identifiers, amount used, and wastage documented where required?

[SECTION 5 - IF A CLAIM IS CHALLENGED]
When a payer asks for support, respond with the exact records that explain medical necessity. Avoid emotional arguments. Lead with facts: wound history, failed standard care, objective measurements, treatment rationale, and interval response.

[CLOSING]
The strongest claim is not the most aggressively coded claim. It is the most clearly supported claim. Accurate coding plus disciplined documentation equals cleaner reimbursement and lower audit risk.`,
  },
  {
    slug: "sales-wound-care-101-lesson-1",
    title: "Wound care 101 for commercial teams lesson 1",
    track: "Sales & Marketing Track",
    course: "Wound care 101 for commercial teams",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
Welcome to Wound Care 101 for commercial teams. In lesson one, we build the foundation. Your job is not to practice medicine. Your job is to understand the clinical environment well enough to communicate responsibly and add value.

[SECTION 1 - WHAT A CHRONIC WOUND IS]
A chronic wound is a wound that has not progressed through the normal stages of healing in an expected timeframe. Common categories include diabetic foot ulcers, venous leg ulcers, pressure injuries, arterial ulcers, traumatic wounds, and post-surgical wounds with delayed healing.

[SECTION 2 - WHY WOUNDS STALL]
Wounds do not usually fail for one reason. They stall because of barriers. Those barriers may include pressure, poor blood flow, infection, uncontrolled diabetes, edema, malnutrition, smoking, immobility, or poor offloading. This matters because commercial teams should understand that advanced products are part of care, not a substitute for fundamentals.

[SECTION 3 - STANDARD OF CARE FIRST]
The clinical team will often think in this order:
identify etiology,
address reversible barriers,
perform local wound care,
offload or compress when indicated,
monitor progress,
and escalate appropriately.

That sequence matters. When you speak with customers, never imply that a product alone heals every wound. Strong field language respects clinical judgment and the full treatment pathway.

[SECTION 4 - CLINICAL TERMINOLOGY]
Know these terms:
etiology means cause,
exudate means drainage,
granulation means healthy healing tissue,
slough and eschar refer to non-viable tissue,
periwound means surrounding skin,
and debridement means removal of non-viable tissue when clinically appropriate.

[CLOSING]
The commercial professional who earns trust is the one who understands the basics, respects scope, and speaks with precision. In the next lesson, we will map the actual wound care workflow and show where commercial teams can support without crossing lines.`,
  },
  {
    slug: "sales-wound-care-101-lesson-2",
    title: "Wound care 101 for commercial teams lesson 2",
    track: "Sales & Marketing Track",
    course: "Wound care 101 for commercial teams",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
In lesson two, we look at the wound care workflow from referral to follow-up so you can understand where customers experience friction and where your support can be useful.

[SECTION 1 - THE REAL WORKFLOW]
A typical pathway begins with patient identification, referral, assessment, diagnosis, standard care, documentation, treatment selection, ongoing monitoring, and billing. Each step has its own failure points. Missing referrals delay care. Weak intake slows scheduling. Incomplete measurements weaken documentation. Poor follow-up creates repeat questions from payers.

[SECTION 2 - KEY STAKEHOLDERS]
Commercial teams interact with a network, not just one clinician. Stakeholders may include physicians, nurse practitioners, physician assistants, wound nurses, office managers, billers, purchasing staff, and administrators. Each stakeholder cares about something different. Clinicians care about outcomes and workflow fit. Billing teams care about clean claims. Administrators care about efficiency, denials, and cost discipline.

[SECTION 3 - WHERE COMMERCIAL TEAMS ADD VALUE]
Helpful support includes product education, inventory coordination, in-service training, response-time reliability, document organization, and explaining where official resources can be found. Unhelpful behavior includes telling providers what to document, promising coverage, or implying guaranteed reimbursement.

[SECTION 4 - COMMON CLINIC PAIN POINTS]
Watch for recurring problems:
missing wound measurements,
unclear standard-care history,
uncertain ordering process,
staff turnover,
incomplete product logs,
and no consistent follow-up cadence.

When you understand the workflow, your conversations become more relevant and less promotional.

[CLOSING]
The best commercial partner reduces operational friction. They are organized, clinically aware, and disciplined about compliance. In lesson three, we will cover how to speak about value without overselling and how to stay credible with sophisticated wound customers.`,
  },
  {
    slug: "sales-wound-care-101-lesson-3",
    title: "Wound care 101 for commercial teams lesson 3",
    track: "Sales & Marketing Track",
    course: "Wound care 101 for commercial teams",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
This final Wound Care 101 lesson is about commercial credibility. Customers can tell quickly whether a representative understands the space or is simply repeating slogans.

[SECTION 1 - HOW TO TALK ABOUT VALUE]
Value in wound care is multi-dimensional. It may include workflow efficiency, product handling, training support, responsiveness, evidence quality, and fit within a clinician's practice model. Value is not a magic phrase. It must be tied to real use, real documentation, and real operational benefit.

[SECTION 2 - WHAT SOPHISTICATED CUSTOMERS NOTICE]
Experienced wound professionals notice whether you:
understand wound categories,
respect standard of care,
avoid clinical overreach,
know the difference between evidence and opinion,
and speak precisely about indications, limitations, and process.

They also notice when someone exaggerates. One careless claim can damage trust across an entire account.

[SECTION 3 - GOOD FIELD LANGUAGE]
Examples of stronger language:
"Our role is to support product education and operational readiness."
"Coverage decisions depend on payer rules and the clinical record."
"Providers should use independent clinical judgment."
"We can point your team to the official resources and documentation tools."

Examples of risky language:
"This is always covered."
"Just document it this way."
"This product works on everything."
"You will definitely get paid."

[SECTION 4 - TRUST AS A COMMERCIAL ADVANTAGE]
In wound care, trust compounds. Reliable, compliant, clinically literate teams stay in the room longer. That creates better long-term relationships than aggressive short-term selling ever will.

[CLOSING]
You do not need to be the loudest person in the room. You need to be the most accurate, prepared, and professional. That is how commercial teams win in a complex wound environment.`,
  },
  {
    slug: "sales-medicare-coverage-what-you-can-and-cannot-say-lesson-1",
    title: "Medicare coverage: what you can and cannot say lesson 1",
    track: "Sales & Marketing Track",
    course: "Medicare coverage: what you can and cannot say",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
This lesson covers a critical commercial discipline: coverage communication. The purpose is not to make you a lawyer or coder. The purpose is to help you speak responsibly when Medicare or other payer coverage comes up.

[SECTION 1 - THE CORE RULE]
Do not promise coverage. Do not guarantee payment. Do not imply that reimbursement is automatic. Coverage depends on multiple factors: payer policy, jurisdiction, patient eligibility, medical necessity, documentation, coding, frequency limits, and the clinical facts of the case.

[SECTION 2 - WHAT YOU CAN SAY]
Acceptable language sounds like this:
"Coverage depends on the applicable payer policy and the medical record."
"Providers should review current payer guidance and use independent judgment."
"We can help your team locate official policy resources."
"The claim outcome depends on the documented clinical scenario."

That language is accurate because it respects uncertainty and keeps the decision with the payer and provider.

[SECTION 3 - WHAT YOU SHOULD NOT SAY]
Avoid statements like:
"Medicare covers this."
"This always pays."
"You can bill this every week."
"Use this wording and it will be approved."

Even if a service is commonly reimbursed in some contexts, broad promises are risky and often false.

[SECTION 4 - WHY THIS MATTERS]
Improper coverage statements create legal, contractual, and reputational risk. They can also create bad expectations inside the customer account. Once trust is broken, even correct education becomes harder to deliver.

[CLOSING]
The safest and most professional habit is simple: describe policy frameworks, not guarantees. In lesson two, we will practice how to answer real-world coverage questions without drifting into risky language.`,
  },
  {
    slug: "sales-medicare-coverage-what-you-can-and-cannot-say-lesson-2",
    title: "Medicare coverage: what you can and cannot say lesson 2",
    track: "Sales & Marketing Track",
    course: "Medicare coverage: what you can and cannot say",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
In lesson two, we move from rules to live conversations. Let's practice how to respond when customers ask direct reimbursement questions.

[SECTION 1 - COMMON QUESTION ONE]
A clinician asks: "Will Medicare cover this product for my patient?"
A compliant response is:
"Coverage depends on the applicable payer rules, the patient's clinical scenario, and the documentation. I can help you locate the relevant policy and product information, but the provider and billing team should evaluate the case based on the current requirements."

Notice what that does. It is helpful, but it does not guarantee an outcome.

[SECTION 2 - COMMON QUESTION TWO]
An office manager asks: "What do we need to write so this gets paid?"
A compliant response is:
"I cannot direct clinical documentation for payment purposes, but I can point your team to the official policy language and the standard documentation resources your clinicians can review independently."

[SECTION 3 - COMMON QUESTION THREE]
A biller asks: "Can we bill this with that code every time?"
A compliant response is:
"Code selection and claim submission should be based on the actual service provided, the patient record, and the applicable payer guidance. Your coding and billing team should make that determination."

[SECTION 4 - TONE MATTERS]
You do not need to sound evasive. Calm, precise, and resource-oriented language works better than defensive language. You are not refusing to help. You are helping correctly.

[CLOSING]
The discipline is this: answer the question without taking ownership of a payer decision. In lesson three, we will cover escalation, documentation support boundaries, and when to bring compliance or reimbursement specialists into the conversation.`,
  },
  {
    slug: "sales-medicare-coverage-what-you-can-and-cannot-say-lesson-3",
    title: "Medicare coverage: what you can and cannot say lesson 3",
    track: "Sales & Marketing Track",
    course: "Medicare coverage: what you can and cannot say",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
Lesson three is about escalation and discipline. Not every question should be answered in the field, and knowing when to escalate is part of professional judgment.

[SECTION 1 - WHEN TO ESCALATE]
Escalate when a question involves disputed payer interpretation, coding disputes, repeated denials, legal risk, unusual utilization patterns, or pressure to say something you cannot support. Escalation is not weakness. It is a control.

[SECTION 2 - WHAT TO DOCUMENT INTERNALLY]
If a sensitive reimbursement question arises, document the account, the question asked, the high-level response provided, and the fact that you directed the customer to official resources or internal specialists. Good internal notes protect continuity and reduce miscommunication.

[SECTION 3 - RED FLAGS]
Be alert when someone says:
"Just tell me the wording that gets this approved."
"We bill it this way for everybody."
"No one checks that."
"Can you put in writing that this is covered?"

Those are moments to slow down immediately. Return to neutral language and route the issue appropriately.

[SECTION 4 - THE PROFESSIONAL STANDARD]
A high-performing commercial team is accurate under pressure. They do not chase the sale by overstating coverage. They protect the customer, the company, and themselves by staying inside policy-based communication.

[CLOSING]
The right answer is not always the most satisfying answer in the moment. But long term, precise and compliant communication is what keeps accounts healthy and relationships durable.`,
  },
  {
    slug: "sales-lcd-documentation-support-without-steering-care-lesson-1",
    title: "LCD documentation support without steering care lesson 1",
    track: "Sales & Marketing Track",
    course: "LCD documentation support without steering care",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
This course teaches an important boundary: supporting documentation readiness without steering clinical care or dictating chart language.

[SECTION 1 - WHAT SUPPORT MEANS]
Support means helping teams understand where official requirements live, what categories of records are commonly reviewed, and how to organize operational processes. Support does not mean telling a clinician what to diagnose, what procedure to perform, or what specific words to insert just to get paid.

[SECTION 2 - WHAT AN LCD-TYPE FRAMEWORK OFTEN LOOKS LIKE]
Documentation frameworks often focus on elements like wound history, prior treatment, measurements, progress, medical necessity, and rationale for ongoing treatment. Your role is to help customers understand the framework exists, not to customize the clinical record for reimbursement.

[SECTION 3 - SAFE LANGUAGE]
Safe language sounds like:
"Your clinical team should independently review the applicable policy and document the actual patient condition."
"We can share educational tools that summarize common documentation categories."
"Clinical decisions should reflect the patient's needs and provider judgment."

[SECTION 4 - RISKY LANGUAGE]
Risky language sounds like:
"Write exactly this."
"Say the wound failed in four weeks and it will go through."
"Use this diagnosis because it pays better."

[CLOSING]
Support is about transparency, education, and organization. Steering is about manipulating care or documentation toward payment. In this course, always know the difference.`,
  },
  {
    slug: "sales-lcd-documentation-support-without-steering-care-lesson-2",
    title: "LCD documentation support without steering care lesson 2",
    track: "Sales & Marketing Track",
    course: "LCD documentation support without steering care",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
In lesson two, let's convert the principle into field behavior. What can you actually do that is useful and compliant?

[SECTION 1 - COMPLIANT SUPPORT EXAMPLES]
You can provide policy-location guides.
You can share blank operational checklists.
You can train staff on product handling and inventory discipline.
You can help accounts identify missing non-clinical process steps, such as incomplete logs or inconsistent follow-up scheduling.
You can encourage teams to review official payer resources.

[SECTION 2 - WHAT YOU SHOULD LEAVE TO THE PROVIDER]
Providers determine diagnosis, medical necessity, treatment sequence, procedure choice, frequency, and the wording of the clinical record. Billing and compliance specialists help interpret claims requirements. Do not collapse those roles into the sales role.

[SECTION 3 - A GOOD CONVERSATION MODEL]
Start with this:
"What process challenges is your team experiencing?"
Then:
"Would it help if I shared the official resource location and our neutral checklist?"
Then:
"Your clinicians can decide what applies based on the patient."

That model keeps the conversation educational and operational.

[SECTION 4 - WHY THIS BUILDS TRUST]
Customers remember when a representative helps them clean up their process without pressuring them to document in a way that feels forced. That distinction increases credibility.

[CLOSING]
A compliant commercial partner improves readiness, not chart authorship. That boundary is not a limit on value. It is part of the value.`,
  },
  {
    slug: "sales-lcd-documentation-support-without-steering-care-lesson-3",
    title: "LCD documentation support without steering care lesson 3",
    track: "Sales & Marketing Track",
    course: "LCD documentation support without steering care",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
Lesson three is about hard situations. What do you do when the customer pressures you for shortcuts?

[SECTION 1 - THE PRESSURE TEST]
A customer says, "Just tell me the exact wording that works."
Your response:
"I can't direct clinical wording or care decisions. What I can do is point your team to the official policy resources and the neutral documentation categories your providers can review independently."

[SECTION 2 - STAYING CALM UNDER PRESSURE]
Do not sound accusatory. Do not lecture. Keep your tone professional. The goal is to redirect, not embarrass. Calm repetition is often enough.

[SECTION 3 - WHEN TO STOP THE CONVERSATION]
If the account persists in asking for false or manipulated documentation strategies, stop providing detail, restate your boundary, and escalate internally. Certain conversations should not continue at field level.

[SECTION 4 - INTERNAL PROTECTION]
After a sensitive discussion, note what was asked and how you responded. That creates clarity for follow-up and protects against misremembered conversations.

[CLOSING]
Compliance is tested most when there is pressure. The right response is steady, neutral, and documented. That protects the integrity of care and the integrity of your role.`,
  },
  {
    slug: "sales-evidence-and-claims-communicating-responsibly-lesson-1",
    title: "Evidence & claims: communicating responsibly lesson 1",
    track: "Sales & Marketing Track",
    course: "Evidence & claims: communicating responsibly",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
In this course, we focus on evidence discipline. Commercial teams must know the difference between data, interpretation, and promotion.

[SECTION 1 - WHAT COUNTS AS A CLAIM]
A claim is any statement suggesting performance, comparative advantage, superiority, expected outcome, speed of healing, cost savings, or breadth of use. Claims can be spoken, written, implied, or visual.

[SECTION 2 - EVIDENCE HIERARCHY]
Not all support is equal. Stronger support generally comes from well-designed studies, relevant patient populations, clear endpoints, and transparent limitations. Lower-strength support may still be useful, but it should not be presented as definitive proof.

[SECTION 3 - RESPONSIBLE COMMUNICATION]
Use language that matches the evidence:
"The study suggests..."
"In this data set..."
"In the population studied..."
"These results may not apply to every setting..."

Avoid turning limited findings into universal promises.

[SECTION 4 - WHY PRECISION MATTERS]
Overstated evidence creates compliance risk and damages scientific credibility. It also makes sophisticated customers distrust everything else you say.

[CLOSING]
A disciplined communicator is not less persuasive. They are more believable. In lesson two, we will translate evidence into field-ready language customers can respect.`,
  },
  {
    slug: "sales-evidence-and-claims-communicating-responsibly-lesson-2",
    title: "Evidence & claims: communicating responsibly lesson 2",
    track: "Sales & Marketing Track",
    course: "Evidence & claims: communicating responsibly",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
Lesson two is about how to speak when you have evidence in hand.

[SECTION 1 - MATCH THE WORDS TO THE DATA]
If a study looked at a narrow population, say that.
If the endpoint was wound area reduction, do not upgrade it to complete healing unless the data showed complete healing.
If the study lacked a comparator, do not imply superiority.

[SECTION 2 - GOOD VERSUS BAD EXAMPLES]
Weak: "This product heals wounds faster."
Stronger: "In the referenced study population, investigators reported improvement in the measured endpoint over the study period."

Weak: "This is better than other options."
Stronger: "I'm not making a comparative superiority claim. I can share the available data and product information for your team to evaluate."

[SECTION 3 - USE LIMITATIONS OPENLY]
Mentioning limitations does not weaken your credibility. It strengthens it. Customers trust people who can say, "Here is what the study shows, and here is what it does not show."

[SECTION 4 - VISUAL CLAIMS COUNT TOO]
Slides, leave-behinds, charts, and before-and-after images must also align with approved, supportable messaging. A dramatic visual can create an implied claim even when the script sounds careful.

[CLOSING]
Responsible communication means the audience leaves with an accurate impression, not just an exciting one. That is the standard.`,
  },
  {
    slug: "sales-evidence-and-claims-communicating-responsibly-lesson-3",
    title: "Evidence & claims: communicating responsibly lesson 3",
    track: "Sales & Marketing Track",
    course: "Evidence & claims: communicating responsibly",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
In the final lesson, we cover what to do when evidence questions become difficult.

[SECTION 1 - WHEN YOU DO NOT KNOW]
If you do not know, say so. Then route the question to the correct source. Guessing is dangerous in evidence conversations. Confidence without support is not professionalism.

[SECTION 2 - HANDLING COMPARATIVE QUESTIONS]
Customers may ask, "Is your product better than theirs?"
A safer response is:
"I'm not making a comparative superiority claim here. I can walk through the approved product information and the available evidence so your team can evaluate fit for your practice."

[SECTION 3 - STAY INSIDE APPROVED MATERIALS]
Use approved decks, approved studies, approved language, and approved summaries. Do not freelance because the conversation feels advanced. Advanced customers are exactly the ones who will detect unsupported language.

[SECTION 4 - BUILDING A SCIENTIFIC REPUTATION]
A strong commercial reputation is built when the field team can explain evidence without distortion, acknowledge limitations, and escalate technical questions appropriately.

[CLOSING]
The goal is not to sound like the smartest person in the room. The goal is to be the most accurate. That is what responsible evidence communication looks like.`,
  },
  {
    slug: "sales-objection-handling-with-compliance-lesson-1",
    title: "Objection handling with compliance lesson 1",
    track: "Sales & Marketing Track",
    course: "Objection handling with compliance",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
Objections are normal. The question is whether you handle them with discipline. In this lesson, we cover the compliant mindset for objection handling.

[SECTION 1 - WHY PEOPLE OBJECT]
Customers raise objections because of cost concerns, workflow burden, prior bad experiences, evidence skepticism, reimbursement uncertainty, or simple overload. Do not assume every objection is resistance. Many are requests for clarity.

[SECTION 2 - THE THREE-STEP MODEL]
First, acknowledge.
Second, clarify.
Third, respond within approved boundaries.

Example:
"I understand that reimbursement uncertainty is a concern."
"Can you tell me whether the issue is denials, documentation burden, or staff workflow?"
"Based on that, I can share the approved resources we have and discuss operational support."

[SECTION 3 - WHAT NOT TO DO]
Do not answer pressure with exaggeration.
Do not promise payment to neutralize reimbursement anxiety.
Do not make unsupported comparative claims to overcome skepticism.

[SECTION 4 - STAYING USEFUL]
A compliant response can still be very helpful. You can provide process support, approved information, product education, and escalation pathways.

[CLOSING]
Effective objection handling is not about winning the argument. It is about moving the conversation forward without compromising accuracy.`,
  },
  {
    slug: "sales-objection-handling-with-compliance-lesson-2",
    title: "Objection handling with compliance lesson 2",
    track: "Sales & Marketing Track",
    course: "Objection handling with compliance",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
Lesson two focuses on common objections and compliant responses.

[SECTION 1 - "WE HAD DENIALS BEFORE"]
Response:
"I understand. Denials can stem from several factors, including payer rules and record specifics. I can help your team locate the relevant official resources and share neutral process tools, but claim outcomes depend on the clinical record and payer review."

[SECTION 2 - "YOUR PRODUCT IS TOO EXPENSIVE"]
Response:
"I hear the concern. Total value discussions should consider workflow fit, handling, support, and the evidence package. I'm happy to walk through those elements and leave the evaluation to your team."

[SECTION 3 - "WE ALREADY USE SOMETHING ELSE"]
Response:
"That makes sense. I'm not asking you to change based on hype. I can share approved product information, evidence, and operational details so you can determine whether it fits any unmet need in your practice."

[SECTION 4 - "JUST TELL US HOW TO DOCUMENT IT"]
Response:
"I can't direct clinical wording or care decisions. I can point you to the official policy resources and neutral documentation categories for your team to review independently."

[CLOSING]
Notice the pattern: acknowledge, clarify, respond accurately, and never trade compliance for momentum.`,
  },
  {
    slug: "sales-objection-handling-with-compliance-lesson-3",
    title: "Objection handling with compliance lesson 3",
    track: "Sales & Marketing Track",
    course: "Objection handling with compliance",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
In this final objection handling lesson, we focus on composure, escalation, and long-term account trust.

[SECTION 1 - COMPOSURE IS A SKILL]
When objections feel aggressive, slow down. Do not rush to fill silence. Ask one precise question. Answer one issue at a time. Fast talking often leads to unsupported statements.

[SECTION 2 - KNOW WHEN TO ESCALATE]
Escalate when a customer requests legal interpretations, comparative claims beyond approved materials, coding opinions outside your role, or documentation tactics designed around payment rather than patient care.

[SECTION 3 - LONG-TERM THINKING]
A representative may "win" a moment by promising too much, but lose the account later when the promise fails. Compliant communication protects long-term trust.

[SECTION 4 - THE BEST CLOSE]
A strong close sounds like this:
"Based on what you shared, the most useful next step may be to review the approved materials together and identify whether a follow-up with billing, compliance, or clinical education would help."

[CLOSING]
The best objection handlers are calm, accurate, and hard to rattle. They know the boundary lines and stay inside them every time.`,
  },
  {
    slug: "sales-ethical-marketing-and-fraud-and-abuse-basics-lesson-1",
    title: "Ethical marketing and fraud-and-abuse basics lesson 1",
    track: "Sales & Marketing Track",
    course: "Ethical marketing and fraud-and-abuse basics",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
This course covers the ethical foundation of commercial conduct. Ethics is not a separate topic from performance. In healthcare, ethics is part of performance.

[SECTION 1 - WHY ETHICS MATTER]
Healthcare decisions affect patients, clinical practice, public funds, and organizational trust. That means aggressive shortcuts are not just bad style. They can become compliance exposure.

[SECTION 2 - BASIC RISK AREAS]
Risk areas include improper inducements, misleading claims, pressure around documentation, inappropriate reimbursement promises, and anything that looks like paying for influence rather than supporting legitimate business operations.

[SECTION 3 - THE PRACTICAL TEST]
Before you say or offer anything, ask:
Is it accurate?
Is it necessary?
Is it approved?
Could it be misunderstood as influencing care or purchasing improperly?
Would I be comfortable seeing this reviewed later?

[SECTION 4 - ETHICAL MARKETING HABITS]
Use approved materials.
Represent evidence fairly.
Respect provider independence.
Document sensitive interactions.
Escalate red flags early.

[CLOSING]
Ethical marketing is not passive. It is disciplined, intentional, and protective of everyone involved, especially the patient environment your customers serve.`,
  },
  {
    slug: "sales-ethical-marketing-and-fraud-and-abuse-basics-lesson-2",
    title: "Ethical marketing and fraud-and-abuse basics lesson 2",
    track: "Sales & Marketing Track",
    course: "Ethical marketing and fraud-and-abuse basics",
    durationMin: 8,
    owner: "AWB Academy",
    script: `[OPEN]
In lesson two, we make ethics operational. What does it look like in field behavior?

[SECTION 1 - RED FLAG SITUATIONS]
Be cautious when someone asks for personal favors tied to business, reimbursement guarantees, documentation coaching designed only to secure payment, or anything that sounds like "everyone does it" or "no one will notice."

[SECTION 2 - SAFE RESPONSE FRAME]
A strong response is calm and brief:
"I can't support that approach."
"What I can do is help with approved education and operational resources."
"If needed, I can connect the right internal team."

[SECTION 3 - CULTURE IN THE FIELD]
One ethical lapse can contaminate an account relationship and damage the team around you. Ethical culture is built when representatives are consistent, even when under quota pressure or account pressure.

[SECTION 4 - WHAT GOOD LOOKS LIKE]
Good looks like accuracy, restraint, documentation, approved materials, proper escalation, and respect for provider independence. Good does not always feel dramatic in the moment, but it is how durable healthcare businesses are built.

[CLOSING]
Ethics is not the opposite of commercial success. It is the structure that keeps success real, defensible, and sustainable.`,
  },
];
