const STORAGE_KEY = "sallyhealth-forms-workspace";

const fieldCatalog = [
  { type: "text", label: "Short text", description: "Patient name, physician, account ID" },
  { type: "email", label: "Email", description: "Notifications and portal invites" },
  { type: "phone", label: "Phone", description: "Patient or family contact" },
  { type: "date", label: "Date", description: "Appointment, discharge, visit date" },
  { type: "textarea", label: "Long answer", description: "Clinical notes and summaries" },
  { type: "select", label: "Dropdown", description: "Route forms and standardize intake" },
  { type: "checkbox", label: "Checkboxes", description: "Symptoms, services, consents" },
  { type: "file", label: "File upload", description: "Photos, referrals, insurance cards" },
  { type: "signature", label: "E-signature", description: "Consents and attestations" },
  { type: "payment", label: "Payment", description: "Copays, deposits, supply fees" }
];

const templates = [
  {
    id: "wound-referral",
    name: "Wound Referral",
    description: "Referral intake with urgency routing and image upload",
    layout: "classic",
    fields: [
      { type: "text", label: "Patient full name", required: true, placeholder: "Enter patient name", helper: "Primary wound referral record", page: 1 },
      { type: "date", label: "Requested start of care", required: true, placeholder: "", helper: "Preferred visit date", page: 1 },
      { type: "select", label: "Referral urgency", required: true, options: ["Routine", "Urgent within 24 hours", "Same-day escalation"], helper: "Used in workflow routing", page: 1 },
      { type: "textarea", label: "Clinical summary", required: true, placeholder: "Describe wound type, measurements, exudate, and infection concerns", helper: "Supports triage", page: 2 },
      { type: "file", label: "Upload wound photos", required: false, placeholder: "", helper: "Photo capture or referral PDF", page: 2 },
      { type: "signature", label: "Referring clinician signature", required: true, placeholder: "", helper: "Required before acceptance", page: 2 }
    ]
  },
  {
    id: "patient-intake",
    name: "Patient Intake",
    description: "Demographics, payer data, consent, and copay",
    layout: "card",
    fields: [
      { type: "text", label: "Patient full name", required: true, placeholder: "Enter patient name", helper: "Used in signatures and receipts", page: 1 },
      { type: "phone", label: "Mobile phone", required: true, placeholder: "(555) 555-5555", helper: "Text reminders supported", page: 1 },
      { type: "email", label: "Email address", required: false, placeholder: "patient@example.com", helper: "Portal updates and receipts", page: 1 },
      { type: "select", label: "Primary payer", required: true, options: ["Medicare", "Medicaid", "Commercial", "Workers Comp", "Self-pay"], helper: "Maps to billing workflow", page: 2 },
      { type: "payment", label: "Collect copay", required: false, placeholder: "", helper: "Stripe, Square, and Authorize.Net supported", page: 2 },
      { type: "signature", label: "Consent signature", required: true, placeholder: "", helper: "Consent to treatment and privacy notice", page: 3 }
    ]
  },
  {
    id: "incident-report",
    name: "Staff Incident",
    description: "Multi-step incident reporting with manager approval",
    layout: "classic",
    fields: [
      { type: "text", label: "Reporting staff member", required: true, placeholder: "Enter staff name", helper: "Auto-assign manager follow-up", page: 1 },
      { type: "date", label: "Incident date", required: true, placeholder: "", helper: "", page: 1 },
      { type: "checkbox", label: "Incident categories", required: true, options: ["Fall", "Medication", "Equipment", "Skin breakdown", "Other"], helper: "Multi-select", page: 1 },
      { type: "textarea", label: "Narrative summary", required: true, placeholder: "Describe the event, actions taken, and witnesses", helper: "Feeds into report builder", page: 2 },
      { type: "file", label: "Supporting documents", required: false, placeholder: "", helper: "Upload images or scanned statements", page: 2 },
      { type: "signature", label: "Supervisor sign-off", required: true, placeholder: "", helper: "Completes the workflow", page: 2 }
    ]
  }
];

const defaultState = {
  activePanel: "overview",
  published: false,
  editor: {
    currentPage: 1,
    selectedFieldId: null,
    previewPage: 1
  },
  previewDraft: {},
  form: {
    title: "Home Health Wound Referral",
    slug: "home-health-wound-referral",
    description: "Secure referral, wound photo capture, approvals, and signatures.",
    layout: "classic",
    accent: "#ff7a59",
    pageCount: 2,
    capabilities: ["Conditional logic", "Payments", "Mobile app", "HIPAA controls", "PDF export"],
    fields: templates[0].fields.map((field, index) => inflateField(field, index + 1))
  },
  submissions: [
    { id: "WF-1031", record: "Maria Thompson", status: "review", owner: "Case Mgmt", stage: "Clinical review", payment: "Pending", updated: "10m ago", urgency: "Urgent within 24 hours" },
    { id: "WF-1030", record: "David Nguyen", status: "approved", owner: "Billing", stage: "Consent signed", payment: "$85 captured", updated: "38m ago", urgency: "Routine" },
    { id: "WF-1029", record: "Elaine Brooks", status: "new", owner: "Intake", stage: "New submission", payment: "Not requested", updated: "1h ago", urgency: "Same-day escalation" },
    { id: "WF-1028", record: "Ruben Garza", status: "complete", owner: "Operations", stage: "Visit scheduled", payment: "$40 captured", updated: "3h ago", urgency: "Routine" }
  ],
  workflow: {
    stages: [
      { name: "Submitted", count: 31, note: "New web and mobile entries" },
      { name: "Clinical review", count: 11, note: "Nurse triage and wound classification" },
      { name: "Insurance", count: 8, note: "Eligibility and authorizations" },
      { name: "Signature", count: 5, note: "Consent packets waiting" },
      { name: "Complete", count: 73, note: "Visits scheduled or delivered" }
    ],
    automations: [
      { title: "Urgent routing", detail: "If urgency is same-day escalation, notify wound lead and push task to the top of Inbox.", tag: "Conditional branch" },
      { title: "Missing photo reminder", detail: "If wound photos are absent after 30 minutes, send secure SMS and email reminder.", tag: "Reminder" },
      { title: "Copay capture", detail: "When payer is self-pay or commercial, attach payment step before final confirmation.", tag: "Payment" },
      { title: "PDF packet", detail: "Generate branded referral PDF and sync to cloud storage after approval.", tag: "Document" }
    ]
  },
  sign: {
    documents: [
      { name: "Consent to Treatment", patient: "Maria Thompson", status: "Awaiting patient", progress: "1 of 2 signed" },
      { name: "Photo Release", patient: "Elaine Brooks", status: "Awaiting clinician", progress: "0 of 1 signed" },
      { name: "Supply Authorization", patient: "David Nguyen", status: "Completed", progress: "2 of 2 signed" }
    ],
    audit: [
      { event: "Consent opened", actor: "Maria Thompson", when: "4 minutes ago" },
      { event: "Reminder email sent", actor: "System", when: "21 minutes ago" },
      { event: "Supply Authorization signed", actor: "Dr. Ana Lopez", when: "42 minutes ago" }
    ]
  },
  apps: [
    { title: "Field nurse app", detail: "Offline wound photo capture, rounds checklist, and voice-to-note summaries." },
    { title: "Patient portal", detail: "Consents, payments, after-visit surveys, and education packets." },
    { title: "Referral hub", detail: "Partner physicians submit cases and watch approval status in real time." },
    { title: "Kiosk mode", detail: "Front desk intake with locked-down navigation and QR handoff." }
  ],
  integrations: [
    { name: "Google Drive", category: "Storage", description: "Sync PDFs, uploads, and packet archives.", connected: true },
    { name: "Dropbox", category: "Storage", description: "Store wound images and signed forms.", connected: false },
    { name: "Slack", category: "Messaging", description: "Post approval alerts to intake and triage channels.", connected: true },
    { name: "Salesforce", category: "CRM", description: "Push lead, referral, and account records.", connected: false },
    { name: "Stripe", category: "Payments", description: "Collect copays, deposits, and invoice balances.", connected: true },
    { name: "Authorize.Net", category: "Payments", description: "Healthcare billing support for secure checkout.", connected: false },
    { name: "HubSpot", category: "CRM", description: "Track referral source performance.", connected: false },
    { name: "Google Sheets", category: "Analytics", description: "Mirror structured submissions for operations.", connected: true }
  ],
  security: {
    controls: [
      { title: "HIPAA workspace mode", note: "Restrict PHI exports, enforce signer controls, and surface BAA workflow.", enabled: true },
      { title: "Role-based access", note: "Separate intake, billing, clinical, and admin permissions.", enabled: true },
      { title: "Audit logging", note: "Track builder edits, exports, status changes, and signer events.", enabled: true },
      { title: "Data retention", note: "Auto-archive or purge records by workflow and payer rules.", enabled: false },
      { title: "Encrypted file storage", note: "Route attachments to approved storage destinations only.", enabled: true },
      { title: "Password-protected PDFs", note: "Secure outbound packets and receipts with password policy.", enabled: false }
    ],
    log: [
      { action: "Published Home Health Wound Referral", actor: "Admin", when: "Today 10:42 AM" },
      { action: "Enabled Slack triage alerts", actor: "Operations", when: "Today 9:16 AM" },
      { action: "Downloaded signed consent packet", actor: "Billing", when: "Today 8:54 AM" }
    ]
  }
};

let state = loadState();

const panelTitle = document.querySelector("#panel-title");
const navLinks = [...document.querySelectorAll(".nav-link")];
const panels = [...document.querySelectorAll(".panel")];
const fieldPalette = document.querySelector("#field-palette");
const canvas = document.querySelector("#canvas");
const inspector = document.querySelector("#inspector");
const previewForm = document.querySelector("#preview-form");
const pageTabs = document.querySelector("#page-tabs");
const templateBar = document.querySelector("#template-bar");
const formTitleInput = document.querySelector("#form-title");
const formLayoutSelect = document.querySelector("#form-layout");
const themeAccentInput = document.querySelector("#theme-accent");
const previewStatus = document.querySelector("#preview-status");
const shareLink = document.querySelector("#share-link");
const embedCode = document.querySelector("#embed-code");
const capabilityPills = document.querySelector("#capability-pills");

initialize();

function initialize() {
  bindEvents();
  render();
}

function bindEvents() {
  navLinks.forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.panel));
  });

  document.querySelectorAll(".nav-shortcut").forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.target));
  });

  document.querySelector("#save-all").addEventListener("click", () => {
    persistState();
    pulseButton("save-all", "Saved");
  });

  document.querySelector("#publish-form").addEventListener("click", () => {
    state.published = !state.published;
    persistState();
    renderBuilderMeta();
  });

  document.querySelector("#new-page").addEventListener("click", addPage);
  document.querySelector("#load-template").addEventListener("click", () => {
    switchPanel("builder");
    loadTemplate(templates[1].id);
  });
  document.querySelector("#reset-form").addEventListener("click", resetForm);

  formTitleInput.addEventListener("input", (event) => {
    state.form.title = event.target.value;
    state.form.slug = slugify(event.target.value || "untitled-form");
    persistState();
    renderBuilderMeta();
  });

  formLayoutSelect.addEventListener("change", (event) => {
    state.form.layout = event.target.value;
    persistState();
    renderBuilderMeta();
    renderPreview();
  });

  themeAccentInput.addEventListener("input", (event) => {
    state.form.accent = event.target.value;
    document.documentElement.style.setProperty("--accent", state.form.accent);
    persistState();
    renderBuilderMeta();
  });

  canvas.addEventListener("dragover", (event) => {
    event.preventDefault();
    canvas.classList.add("is-dragover");
  });

  canvas.addEventListener("dragleave", () => {
    canvas.classList.remove("is-dragover");
  });

  canvas.addEventListener("drop", (event) => {
    event.preventDefault();
    canvas.classList.remove("is-dragover");
    const type = event.dataTransfer.getData("text/plain");
    if (!type) return;
    addField(type);
  });

  previewForm.addEventListener("submit", handlePreviewSubmit);
  document.querySelector("#submission-search").addEventListener("input", renderSubmissions);
  document.querySelector("#submission-filter").addEventListener("change", renderSubmissions);
  document.querySelector("#integration-search").addEventListener("input", renderIntegrations);
}

function render() {
  document.documentElement.style.setProperty("--accent", state.form.accent);
  switchPanel(state.activePanel, false);
  renderOverview();
  renderBuilder();
  renderSubmissions();
  renderWorkflows();
  renderSign();
  renderReports();
  renderApps();
  renderIntegrations();
  renderSecurity();
}

function renderOverview() {
  document.querySelector("#metric-forms").textContent = "1";
  document.querySelector("#metric-runs").textContent = sum(state.workflow.stages.map((stage) => stage.count));
  document.querySelector("#metric-submissions").textContent = state.submissions.length;
  document.querySelector("#metric-integrations").textContent = state.integrations.filter((item) => item.connected).length;
}

function renderBuilder() {
  renderPalette();
  renderTemplateBar();
  renderPages();
  renderCanvas();
  renderInspector();
  renderPreview();
  renderBuilderMeta();
}

function renderPalette() {
  fieldPalette.innerHTML = fieldCatalog.map((field) => `
    <button class="palette-item" draggable="true" data-type="${field.type}">
      <strong>${field.label}</strong>
      <span class="small-copy">${field.description}</span>
    </button>
  `).join("");

  fieldPalette.querySelectorAll(".palette-item").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.type);
    });
    item.addEventListener("click", () => addField(item.dataset.type));
  });
}

function renderTemplateBar() {
  templateBar.innerHTML = templates.map((template) => `
    <button class="template-chip ${state.form.title === template.name ? "is-active" : ""}" data-template="${template.id}">
      ${template.name}
    </button>
  `).join("");

  templateBar.querySelectorAll(".template-chip").forEach((button) => {
    button.addEventListener("click", () => loadTemplate(button.dataset.template));
  });
}

function renderPages() {
  pageTabs.innerHTML = Array.from({ length: state.form.pageCount }, (_, index) => index + 1).map((page) => `
    <button class="chip ${page === state.editor.currentPage ? "is-active" : ""}" data-page="${page}">Page ${page}</button>
  `).join("");

  pageTabs.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.editor.currentPage = Number(button.dataset.page);
      state.editor.previewPage = state.editor.currentPage;
      persistState();
      renderBuilder();
    });
  });
}

function renderCanvas() {
  const fields = currentPageFields();
  if (!fields.length) {
    canvas.innerHTML = `
      <div class="empty-state">
        <div>
          <strong>Drop fields here</strong>
          <p>Build intake packets, approvals, consents, and payment steps.</p>
        </div>
      </div>
    `;
    return;
  }

  canvas.innerHTML = fields.map((field, index) => `
    <article class="field-card ${field.id === state.editor.selectedFieldId ? "is-selected" : ""}" draggable="true" data-id="${field.id}">
      <div class="field-head">
        <div>
          <strong>${field.label}</strong>
          <p class="small-copy">${field.type}${field.required ? " • required" : ""}</p>
        </div>
        <span class="pill">${field.type}</span>
      </div>
      <p class="small-copy">${field.helper || "No helper text"}</p>
      <div class="field-actions">
        <button class="icon-button" data-action="select" data-id="${field.id}">Edit</button>
        <button class="icon-button" data-action="up" data-id="${field.id}" ${index === 0 ? "disabled" : ""}>Move up</button>
        <button class="icon-button" data-action="down" data-id="${field.id}" ${index === fields.length - 1 ? "disabled" : ""}>Move down</button>
        <button class="icon-button" data-action="clone" data-id="${field.id}">Duplicate</button>
        <button class="icon-button" data-action="delete" data-id="${field.id}">Delete</button>
      </div>
    </article>
  `).join("");

  canvas.querySelectorAll(".field-card").forEach((card) => {
    card.addEventListener("click", () => selectField(card.dataset.id));
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/reorder-id", card.dataset.id);
    });
    card.addEventListener("dragover", (event) => event.preventDefault());
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData("text/reorder-id");
      if (draggedId && draggedId !== card.dataset.id) {
        reorderField(draggedId, card.dataset.id);
      }
    });
  });

  canvas.querySelectorAll(".icon-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const { action, id } = button.dataset;
      handleFieldAction(action, id);
    });
  });
}

function renderInspector() {
  const field = state.form.fields.find((item) => item.id === state.editor.selectedFieldId) || currentPageFields()[0];
  if (field && !state.editor.selectedFieldId) {
    state.editor.selectedFieldId = field.id;
  }

  if (!field) {
    inspector.innerHTML = `
      <div class="empty-state">
        <div>
          <strong>No field selected</strong>
          <p>Select a field to edit labels, requirements, options, and helper copy.</p>
        </div>
      </div>
    `;
    return;
  }

  inspector.innerHTML = `
    <section class="inspector-group">
      <p class="eyebrow">Field settings</p>
      <label class="stack-field">
        <span>Label</span>
        <input id="field-label" type="text" value="${escapeAttribute(field.label)}">
      </label>
      <label class="stack-field">
        <span>Placeholder</span>
        <input id="field-placeholder" type="text" value="${escapeAttribute(field.placeholder || "")}">
      </label>
      <label class="stack-field">
        <span>Helper text</span>
        <textarea id="field-helper" rows="3">${field.helper || ""}</textarea>
      </label>
      ${["select", "checkbox"].includes(field.type) ? `
        <label class="stack-field">
          <span>Options (comma separated)</span>
          <input id="field-options" type="text" value="${escapeAttribute((field.options || []).join(", "))}">
        </label>
      ` : ""}
      <label class="stack-field">
        <span>Page</span>
        <select id="field-page">
          ${Array.from({ length: state.form.pageCount }, (_, index) => index + 1).map((page) => `
            <option value="${page}" ${field.page === page ? "selected" : ""}>Page ${page}</option>
          `).join("")}
        </select>
      </label>
      <label class="list-item">
        <span>Required field</span>
        <input id="field-required" type="checkbox" ${field.required ? "checked" : ""}>
      </label>
    </section>
    <section class="inspector-group">
      <p class="eyebrow">Form settings</p>
      <label class="list-item">
        <span>Save and continue later</span>
        <input id="cap-save" type="checkbox" ${state.form.capabilities.includes("Save & continue") ? "checked" : ""}>
      </label>
      <label class="list-item">
        <span>Conditional logic</span>
        <input id="cap-logic" type="checkbox" ${state.form.capabilities.includes("Conditional logic") ? "checked" : ""}>
      </label>
      <label class="list-item">
        <span>Payments</span>
        <input id="cap-payments" type="checkbox" ${state.form.capabilities.includes("Payments") ? "checked" : ""}>
      </label>
      <label class="list-item">
        <span>HIPAA controls</span>
        <input id="cap-hipaa" type="checkbox" ${state.form.capabilities.includes("HIPAA controls") ? "checked" : ""}>
      </label>
    </section>
  `;

  inspector.querySelector("#field-label").addEventListener("input", (event) => updateField(field.id, "label", event.target.value));
  inspector.querySelector("#field-placeholder").addEventListener("input", (event) => updateField(field.id, "placeholder", event.target.value));
  inspector.querySelector("#field-helper").addEventListener("input", (event) => updateField(field.id, "helper", event.target.value));

  const optionsInput = inspector.querySelector("#field-options");
  if (optionsInput) {
    optionsInput.addEventListener("input", (event) => {
      const options = event.target.value.split(",").map((option) => option.trim()).filter(Boolean);
      updateField(field.id, "options", options);
    });
  }

  inspector.querySelector("#field-page").addEventListener("change", (event) => updateField(field.id, "page", Number(event.target.value)));
  inspector.querySelector("#field-required").addEventListener("change", (event) => updateField(field.id, "required", event.target.checked));
  inspector.querySelector("#cap-save").addEventListener("change", () => toggleCapability("Save & continue"));
  inspector.querySelector("#cap-logic").addEventListener("change", () => toggleCapability("Conditional logic"));
  inspector.querySelector("#cap-payments").addEventListener("change", () => toggleCapability("Payments"));
  inspector.querySelector("#cap-hipaa").addEventListener("change", () => toggleCapability("HIPAA controls"));
}

function renderPreview() {
  const page = state.editor.previewPage;
  const fields = state.form.fields.filter((field) => field.page === page);
  previewForm.innerHTML = `
    <div class="preview-page">
      <div class="list-item">
        <div>
          <strong>${state.form.title}</strong>
          <p class="small-copy">${state.form.description}</p>
        </div>
        <span class="pill">${state.form.layout} layout</span>
      </div>
      ${fields.map(renderPreviewField).join("")}
      <div class="field-actions">
        ${page > 1 ? `<button type="button" class="ghost-button" id="preview-prev">Previous</button>` : ""}
        ${page < state.form.pageCount ? `<button type="button" class="ghost-button" id="preview-next">Next</button>` : `<button type="submit" class="primary-button">Submit Demo Entry</button>`}
      </div>
    </div>
  `;

  const nextButton = previewForm.querySelector("#preview-next");
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      capturePreviewDraft();
      state.editor.previewPage += 1;
      renderPreview();
    });
  }

  const prevButton = previewForm.querySelector("#preview-prev");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      capturePreviewDraft();
      state.editor.previewPage -= 1;
      renderPreview();
    });
  }
}

function renderBuilderMeta() {
  const publishButton = document.querySelector("#publish-form");
  formTitleInput.value = state.form.title;
  formLayoutSelect.value = state.form.layout;
  themeAccentInput.value = state.form.accent;
  previewStatus.textContent = state.published ? "Published" : "Draft";
  previewStatus.style.background = state.published ? "rgba(44, 143, 99, 0.16)" : "rgba(229, 169, 61, 0.18)";
  previewStatus.style.color = state.published ? "#1d6a49" : "#8c5b00";
  publishButton.textContent = state.published ? "Unpublish Form" : "Publish Form";
  shareLink.textContent = `sallyhealthforms.app/forms/${state.form.slug}${state.published ? "" : "-draft"}`;
  embedCode.textContent = `<iframe src="https://${shareLink.textContent}" title="${state.form.title}" width="100%" height="720"></iframe>`;
  capabilityPills.innerHTML = state.form.capabilities.map((capability) => `<span class="pill">${capability}</span>`).join("");
  document.querySelector("#canvas-title").textContent = state.form.title;
}

function renderSubmissions() {
  const search = document.querySelector("#submission-search").value.toLowerCase();
  const filter = document.querySelector("#submission-filter").value;
  const filtered = state.submissions.filter((submission) => {
    const matchesSearch = [submission.record, submission.owner, submission.stage, submission.status].join(" ").toLowerCase().includes(search);
    const matchesFilter = filter === "all" || submission.status === filter;
    return matchesSearch && matchesFilter;
  });

  document.querySelector("#submissions-body").innerHTML = filtered.map((submission) => `
    <tr>
      <td>
        <strong>${submission.record}</strong>
        <div class="small-copy">${submission.id}</div>
      </td>
      <td>
        <select class="status-select" data-id="${submission.id}">
          ${["new", "review", "approved", "complete"].map((status) => `
            <option value="${status}" ${submission.status === status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </td>
      <td>${submission.owner}</td>
      <td>${submission.stage}</td>
      <td>${submission.payment}</td>
      <td>${submission.updated}</td>
    </tr>
  `).join("");

  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const submission = state.submissions.find((item) => item.id === select.dataset.id);
      submission.status = event.target.value;
      submission.updated = "just now";
      persistState();
      renderSubmissions();
      renderReports();
    });
  });

  const queueCounts = [
    { title: "Urgent review", count: state.submissions.filter((item) => item.urgency !== "Routine").length, detail: "Priority cases needing triage" },
    { title: "Pending payment", count: state.submissions.filter((item) => item.payment.includes("Pending")).length, detail: "Copays or balances waiting" },
    { title: "Awaiting signature", count: state.sign.documents.filter((item) => item.status !== "Completed").length, detail: "Documents still open" },
    { title: "Completed today", count: state.submissions.filter((item) => item.status === "complete").length, detail: "Operationally closed records" }
  ];

  document.querySelector("#queue-cards").innerHTML = queueCounts.map((queue) => `
    <article class="queue-card">
      <p class="eyebrow">${queue.title}</p>
      <strong>${queue.count}</strong>
      <p>${queue.detail}</p>
    </article>
  `).join("");
}

function renderWorkflows() {
  document.querySelector("#workflow-stages").innerHTML = state.workflow.stages.map((stage) => `
    <article class="workflow-stage">
      <strong>${stage.name}</strong>
      <span class="pill">${stage.count} active</span>
      <p class="small-copy">${stage.note}</p>
    </article>
  `).join("");

  document.querySelector("#automation-list").innerHTML = state.workflow.automations.map((automation) => `
    <article class="list-item">
      <div>
        <strong>${automation.title}</strong>
        <p class="small-copy">${automation.detail}</p>
      </div>
      <span class="pill">${automation.tag}</span>
    </article>
  `).join("");
}

function renderSign() {
  document.querySelector("#sign-documents").innerHTML = state.sign.documents.map((documentItem, index) => `
    <article class="document-card">
      <p class="eyebrow">${documentItem.patient}</p>
      <strong>${documentItem.name}</strong>
      <p class="small-copy">${documentItem.progress}</p>
      <div class="field-actions">
        <span class="pill">${documentItem.status}</span>
        <button class="icon-button" data-document-index="${index}">Send reminder</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-document-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sign.audit.unshift({ event: "Reminder email sent", actor: "System", when: "just now" });
      persistState();
      renderSign();
    });
  });

  document.querySelector("#audit-log").innerHTML = state.sign.audit.map((event) => `
    <article class="list-item">
      <div>
        <strong>${event.event}</strong>
        <p class="small-copy">${event.actor}</p>
      </div>
      <span class="pill">${event.when}</span>
    </article>
  `).join("");
}

function renderReports() {
  const total = state.submissions.length || 1;
  const completed = state.submissions.filter((item) => item.status === "complete").length;
  const review = state.submissions.filter((item) => item.status === "review").length;
  const approved = state.submissions.filter((item) => item.status === "approved").length;
  const connected = state.integrations.filter((item) => item.connected).length;

  document.querySelector("#report-metrics").innerHTML = `
    <article class="report-metric">
      <span class="eyebrow">Completion rate</span>
      <strong>${Math.round((completed / total) * 100)}%</strong>
    </article>
    <article class="report-metric">
      <span class="eyebrow">In review</span>
      <strong>${review}</strong>
    </article>
    <article class="report-metric">
      <span class="eyebrow">Approved</span>
      <strong>${approved}</strong>
    </article>
    <article class="report-metric">
      <span class="eyebrow">Live integrations</span>
      <strong>${connected}</strong>
    </article>
  `;

  const chartData = [
    { label: "New", value: state.submissions.filter((item) => item.status === "new").length },
    { label: "In review", value: review },
    { label: "Approved", value: approved },
    { label: "Complete", value: completed }
  ];
  const peak = Math.max(...chartData.map((item) => item.value), 1);

  document.querySelector("#report-chart").innerHTML = chartData.map((item) => `
    <div class="chart-row">
      <span>${item.label}</span>
      <div class="chart-track">
        <div class="chart-fill" style="width: ${(item.value / peak) * 100}%"></div>
      </div>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  document.querySelector("#insight-list").innerHTML = [
    `${review} submission(s) are waiting in clinical review and should drive staffing.`,
    `${state.sign.documents.filter((item) => item.status !== "Completed").length} signature packet(s) still need follow-up.`,
    `${state.submissions.filter((item) => item.payment.includes("$")).length} record(s) have payment captured and can flow to billing exports.`,
    `${connected} integration(s) are connected for storage, analytics, messaging, or payments.`
  ].map((insight) => `
    <article class="list-item">
      <p class="list-copy">${insight}</p>
    </article>
  `).join("");
}

function renderApps() {
  document.querySelector("#app-surfaces").innerHTML = state.apps.map((app) => `
    <article class="app-surface">
      <strong>${app.title}</strong>
      <p class="small-copy">${app.detail}</p>
      <span class="pill">No-code surface</span>
    </article>
  `).join("");
}

function renderIntegrations() {
  const search = document.querySelector("#integration-search").value.toLowerCase();
  const filtered = state.integrations.filter((integration) =>
    [integration.name, integration.category, integration.description].join(" ").toLowerCase().includes(search)
  );

  document.querySelector("#integration-grid").innerHTML = filtered.map((integration, index) => `
    <article class="integration-card ${integration.connected ? "connected" : ""}">
      <p class="eyebrow">${integration.category}</p>
      <strong>${integration.name}</strong>
      <p class="small-copy">${integration.description}</p>
      <div class="field-actions">
        <span class="pill">${integration.connected ? "Connected" : "Available"}</span>
        <button class="icon-button" data-integration-index="${index}">${integration.connected ? "Disconnect" : "Connect"}</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-integration-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = filtered[Number(button.dataset.integrationIndex)];
      const integration = state.integrations.find((item) => item.name === source.name);
      integration.connected = !integration.connected;
      persistState();
      renderOverview();
      renderIntegrations();
      renderReports();
    });
  });
}

function renderSecurity() {
  document.querySelector("#security-controls").innerHTML = state.security.controls.map((control, index) => `
    <article class="security-card ${control.enabled ? "enabled" : ""}">
      <strong>${control.title}</strong>
      <p class="security-note">${control.note}</p>
      <div class="field-actions">
        <span class="pill">${control.enabled ? "Enabled" : "Optional"}</span>
        <button class="icon-button" data-control-index="${index}">${control.enabled ? "Disable" : "Enable"}</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-control-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const control = state.security.controls[Number(button.dataset.controlIndex)];
      control.enabled = !control.enabled;
      state.security.log.unshift({
        action: `${control.enabled ? "Enabled" : "Disabled"} ${control.title}`,
        actor: "Admin",
        when: "just now"
      });
      persistState();
      renderSecurity();
    });
  });

  document.querySelector("#security-log").innerHTML = state.security.log.map((entry) => `
    <article class="list-item">
      <div>
        <strong>${entry.action}</strong>
        <p class="small-copy">${entry.actor}</p>
      </div>
      <span class="pill">${entry.when}</span>
    </article>
  `).join("");
}

function switchPanel(panelId, shouldPersist = true) {
  state.activePanel = panelId;
  navLinks.forEach((button) => button.classList.toggle("is-active", button.dataset.panel === panelId));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === panelId));
  panelTitle.textContent = capitalize(panelId);
  if (shouldPersist) {
    persistState();
  }
}

function addField(type) {
  const seed = fieldCatalog.find((field) => field.type === type);
  const field = inflateField({
    type,
    label: `${seed.label} field`,
    required: false,
    placeholder: type === "textarea" ? "Add response" : "Enter value",
    options: ["Option A", "Option B"],
    helper: seed.description,
    page: state.editor.currentPage
  });
  state.form.fields.push(field);
  state.editor.selectedFieldId = field.id;
  persistState();
  renderBuilder();
}

function handleFieldAction(action, id) {
  switch (action) {
    case "select":
      selectField(id);
      return;
    case "up":
      moveField(id, -1);
      return;
    case "down":
      moveField(id, 1);
      return;
    case "clone":
      cloneField(id);
      return;
    case "delete":
      deleteField(id);
      return;
    default:
      return;
  }
}

function selectField(id) {
  state.editor.selectedFieldId = id;
  persistState();
  renderCanvas();
  renderInspector();
}

function updateField(id, key, value) {
  const field = state.form.fields.find((item) => item.id === id);
  field[key] = value;
  if (key === "page") {
    state.editor.currentPage = value;
  }
  persistState();
  renderBuilder();
}

function moveField(id, delta) {
  const pageFields = currentPageFields();
  const currentIndex = pageFields.findIndex((field) => field.id === id);
  const targetIndex = currentIndex + delta;
  if (targetIndex < 0 || targetIndex >= pageFields.length) return;

  const sourceId = pageFields[currentIndex].id;
  const targetId = pageFields[targetIndex].id;
  reorderField(sourceId, targetId, delta > 0);
}

function reorderField(sourceId, targetId, after = false) {
  const sourceIndex = state.form.fields.findIndex((field) => field.id === sourceId);
  const targetIndex = state.form.fields.findIndex((field) => field.id === targetId);
  const [source] = state.form.fields.splice(sourceIndex, 1);
  let insertIndex = after ? targetIndex + 1 : targetIndex;
  if (sourceIndex < targetIndex) {
    insertIndex -= 1;
  }
  state.form.fields.splice(insertIndex, 0, source);
  persistState();
  renderCanvas();
}

function cloneField(id) {
  const field = state.form.fields.find((item) => item.id === id);
  const clone = inflateField({ ...field, label: `${field.label} Copy` });
  const index = state.form.fields.findIndex((item) => item.id === id);
  state.form.fields.splice(index + 1, 0, clone);
  state.editor.selectedFieldId = clone.id;
  persistState();
  renderBuilder();
}

function deleteField(id) {
  state.form.fields = state.form.fields.filter((field) => field.id !== id);
  const fallback = currentPageFields()[0] || state.form.fields[0] || null;
  state.editor.selectedFieldId = fallback ? fallback.id : null;
  persistState();
  renderBuilder();
}

function addPage() {
  state.form.pageCount += 1;
  state.editor.currentPage = state.form.pageCount;
  state.editor.previewPage = state.form.pageCount;
  persistState();
  renderBuilder();
}

function loadTemplate(templateId) {
  const template = templates.find((item) => item.id === templateId);
  state.form.title = template.name;
  state.form.slug = slugify(template.name);
  state.form.description = template.description;
  state.form.layout = template.layout;
  state.form.pageCount = Math.max(...template.fields.map((field) => field.page));
  state.form.fields = template.fields.map((field, index) => inflateField(field, index + 1));
  state.previewDraft = {};
  state.editor.currentPage = 1;
  state.editor.previewPage = 1;
  state.editor.selectedFieldId = state.form.fields[0]?.id || null;
  persistState();
  renderBuilder();
}

function resetForm() {
  state.form = structuredClone(defaultState.form);
  state.previewDraft = {};
  state.editor.currentPage = 1;
  state.editor.previewPage = 1;
  state.editor.selectedFieldId = state.form.fields[0]?.id || null;
  state.published = false;
  persistState();
  renderBuilder();
}

function toggleCapability(capability) {
  if (state.form.capabilities.includes(capability)) {
    state.form.capabilities = state.form.capabilities.filter((item) => item !== capability);
  } else {
    state.form.capabilities.push(capability);
  }
  persistState();
  renderBuilderMeta();
}

function handlePreviewSubmit(event) {
  event.preventDefault();
  capturePreviewDraft();
  const record = state.previewDraft["Patient full name"] || state.previewDraft["Reporting staff member"] || "New submission";
  const paymentField = state.form.fields.some((field) => field.type === "payment");
  state.submissions.unshift({
    id: `WF-${1000 + state.submissions.length + 1}`,
    record,
    status: "new",
    owner: "Intake",
    stage: "New submission",
    payment: paymentField ? "Pending" : "Not requested",
    updated: "just now",
    urgency: state.previewDraft["Referral urgency"] || "Routine"
  });
  state.previewDraft = {};
  state.editor.previewPage = 1;
  persistState();
  renderOverview();
  renderSubmissions();
  renderReports();
  switchPanel("submissions");
}

function renderPreviewField(field) {
  const required = field.required ? "required" : "";
  const name = escapeAttribute(field.label);
  const draftValue = state.previewDraft[field.label] || "";
  if (field.type === "textarea") {
    return `
      <label class="preview-field">
        <span>${field.label}</span>
        <textarea name="${name}" placeholder="${escapeAttribute(field.placeholder || "")}" ${required}>${escapeAttribute(draftValue)}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    return `
      <label class="preview-field">
        <span>${field.label}</span>
        <select name="${name}" ${required}>
          <option value="">Select an option</option>
          ${(field.options || []).map((option) => `<option value="${escapeAttribute(option)}" ${draftValue === option ? "selected" : ""}>${option}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (field.type === "checkbox") {
    return `
      <fieldset class="preview-field">
        <span>${field.label}</span>
        ${(field.options || []).map((option, index) => `
          <label>
            <input type="checkbox" name="${name}-${index}" value="${escapeAttribute(option)}" ${state.previewDraft[`${field.label}-${index}`] ? "checked" : ""}>
            ${option}
          </label>
        `).join("")}
      </fieldset>
    `;
  }

  if (field.type === "signature") {
    return `
      <label class="preview-field">
        <span>${field.label}</span>
        <input type="text" name="${name}" placeholder="Type signer name" value="${escapeAttribute(draftValue)}" ${required}>
      </label>
    `;
  }

  if (field.type === "payment") {
    return `
      <label class="preview-field">
        <span>${field.label}</span>
        <input type="number" name="${name}" placeholder="85.00" min="0" step="0.01" value="${escapeAttribute(draftValue)}" ${required}>
      </label>
    `;
  }

  if (field.type === "file") {
    return `
      <label class="preview-field">
        <span>${field.label}</span>
        <input type="text" name="${name}" placeholder="Demo mode: enter file name" value="${escapeAttribute(draftValue)}" ${required}>
      </label>
    `;
  }

  const type = field.type === "phone" ? "tel" : field.type;
  return `
    <label class="preview-field">
      <span>${field.label}</span>
      <input type="${type}" name="${name}" placeholder="${escapeAttribute(field.placeholder || "")}" value="${escapeAttribute(draftValue)}" ${required}>
    </label>
  `;
}

function currentPageFields() {
  return state.form.fields.filter((field) => field.page === state.editor.currentPage);
}

function pulseButton(id, label) {
  const button = document.querySelector(`#${id}`);
  const original = button.textContent;
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function loadState() {
  const persisted = window.localStorage.getItem(STORAGE_KEY);
  if (!persisted) {
    return structuredClone(defaultState);
  }

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(persisted) };
  } catch {
    return structuredClone(defaultState);
  }
}

function persistState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function inflateField(field, seed = Date.now()) {
  return {
    id: field.id || `field-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    type: field.type,
    label: field.label,
    required: Boolean(field.required),
    placeholder: field.placeholder || "",
    options: field.options || ["Option A", "Option B"],
    helper: field.helper || "",
    page: field.page || 1
  };
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function capturePreviewDraft() {
  const formData = new FormData(previewForm);
  const nextDraft = { ...state.previewDraft };

  state.form.fields
    .filter((field) => field.page === state.editor.previewPage)
    .forEach((field) => {
      if (field.type === "checkbox") {
        (field.options || []).forEach((_, index) => {
          nextDraft[`${field.label}-${index}`] = previewForm.querySelector(`[name="${CSS.escape(field.label)}-${index}"]`)?.checked || false;
        });
        return;
      }

      nextDraft[field.label] = formData.get(field.label) || "";
    });

  state.previewDraft = nextDraft;
  persistState();
}
