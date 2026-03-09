const STORAGE_KEY = "platform-rollout-workspace-v2";
const ALL_MODULES = "All Modules";
const ALL_FEATURES = "All Features";
const MODULE_ACCENTS = {
  Platform: "#c86642",
  Identity: "#1f7a70",
  Forms: "#cc8c29",
  Payments: "#b3566e",
  Workflows: "#3c73d4",
  Sign: "#8c6ccf",
  Tables: "#3e8b59",
  Inbox: "#ad6a1f",
  Reports: "#1c7c85",
  Store: "#a4573f",
  Automation: "#c24f68",
  Interfaces: "#4a6bd1",
  AI: "#5a6ee8"
};

const ROLLOUT_PHASES = [
  {
    id: "operations",
    label: "Phase 1",
    title: "Operations",
    rationale: "Add orchestration, payments, signing, reporting, and app-facing operating surfaces.",
    modules: ["Payments", "Workflows", "Sign", "Inbox", "Reports", "Store", "Automation", "Interfaces"]
  },
  {
    id: "foundation",
    label: "Phase 2",
    title: "Foundation",
    rationale: "Establish navigation, identity, authoring, and structured data before layering operational workflows.",
    modules: ["Platform", "Identity", "Forms", "Tables"]
  },
  {
    id: "intelligence",
    label: "Phase 3",
    title: "Intelligence",
    rationale: "Introduce AI-native agents, copilots, canvas tooling, and external tool-control surfaces.",
    modules: ["AI"]
  }
];

const ADMIN_PERMISSIONS = ["Admin", "Owner", "Security Admin", "Billing Admin"];

const CHECKLIST_DEFINITIONS = [
  {
    key: "ui",
    title: "Compose route UI",
    getDetail: (screen) => `Build ${screen.components.length} planned components for ${screen.screen}.`
  },
  {
    key: "actions",
    title: "Wire primary actions",
    getDetail: (screen) => `Implement ${screen.primaryActions.join(", ")} with route-safe behavior.`
  },
  {
    key: "states",
    title: "Handle empty and error states",
    getDetail: (screen) => `${screen.emptyState} and ${screen.errorState} both need explicit UX coverage.`
  },
  {
    key: "permissions",
    title: "Enforce access policy",
    getDetail: (screen) => `Honor ${screen.permissions.join(", ")} before exposing this route or its actions.`
  },
  {
    key: "contracts",
    title: "Wire APIs and data model",
    getDetail: (screen) => `Connect ${screen.apis.length} APIs and ${screen.dbObjects.length} DB objects without drifting from the spec.`
  },
  {
    key: "acceptance",
    title: "Validate acceptance criteria",
    getDetail: (screen) => `${screen.acceptanceCriteria.join("; ")}`
  }
];

const routeMap = new Map(screenInventory.map((screen) => [screen.route, screen]));
const moduleOrder = [...new Set(screenInventory.map((screen) => screen.module))];
const moduleFeaturePairs = [...new Set(screenInventory.map((screen) => `${screen.module}::${screen.feature}`))];
const uniqueApiCount = new Set(screenInventory.flatMap((screen) => screen.apis)).size;
const defaultRoute = screenInventory[0]?.route ?? "";

const elements = {
  sidebarStats: document.querySelector("#sidebar-stats"),
  moduleFilter: document.querySelector("#module-filter"),
  clearModule: document.querySelector("#clear-module"),
  journeyRail: document.querySelector("#journey-rail"),
  screenSearch: document.querySelector("#screen-search"),
  featureFilter: document.querySelector("#feature-filter"),
  sortOrder: document.querySelector("#sort-order"),
  routeReadout: document.querySelector("#route-readout"),
  exportInventory: document.querySelector("#export-inventory"),
  exportProgress: document.querySelector("#export-progress"),
  randomScreen: document.querySelector("#random-screen"),
  nextScreen: document.querySelector("#next-screen"),
  clearFilters: document.querySelector("#clear-filters"),
  viewTitle: document.querySelector("#view-title"),
  screenKicker: document.querySelector("#screen-kicker"),
  screenTitle: document.querySelector("#screen-title"),
  screenPurpose: document.querySelector("#screen-purpose"),
  screenMetrics: document.querySelector("#screen-metrics"),
  metaPills: document.querySelector("#meta-pills"),
  primaryActions: document.querySelector("#primary-actions"),
  coverageGrid: document.querySelector("#coverage-grid"),
  catalogCount: document.querySelector("#catalog-count"),
  routeCatalog: document.querySelector("#route-catalog"),
  moduleFeatureGrid: document.querySelector("#module-feature-grid"),
  wireframeStage: document.querySelector("#wireframe-stage"),
  componentGrid: document.querySelector("#component-grid"),
  stateGrid: document.querySelector("#state-grid"),
  contractGrid: document.querySelector("#contract-grid"),
  copyScreenSpec: document.querySelector("#copy-screen-spec"),
  downloadScreen: document.querySelector("#download-screen"),
  dependencyGrid: document.querySelector("#dependency-grid"),
  resetScreenChecklist: document.querySelector("#reset-screen-checklist"),
  executionSummary: document.querySelector("#execution-summary"),
  implementationList: document.querySelector("#implementation-list"),
  acceptanceList: document.querySelector("#acceptance-list"),
  moduleBoard: document.querySelector("#module-board"),
  portfolioSummary: document.querySelector("#portfolio-summary"),
  phaseProgress: document.querySelector("#phase-progress"),
  moduleProgress: document.querySelector("#module-progress"),
  phaseBoard: document.querySelector("#phase-board"),
  statusToast: document.querySelector("#status-toast")
};

let state = loadState();
let toastTimer = null;

initialize();

function initialize() {
  normalizeState();
  bindEvents();
  syncStateWithHash(true);
  render();
}

function bindEvents() {
  window.addEventListener("hashchange", () => {
    syncStateWithHash();
    render();
  });

  elements.screenSearch.addEventListener("input", (event) => {
    state.query = event.target.value;
    persistState();
    render();
  });

  elements.featureFilter.addEventListener("change", (event) => {
    state.feature = event.target.value;
    const filtered = getFilteredScreens();
    if (filtered.length && !filtered.some((screen) => screen.route === state.selectedRoute)) {
      state.selectedRoute = filtered[0].route;
      updateHash(state.selectedRoute);
    }
    persistState();
    render();
  });

  elements.sortOrder.addEventListener("change", (event) => {
    state.sort = event.target.value;
    persistState();
    render();
  });

  elements.clearModule.addEventListener("click", () => {
    state.module = ALL_MODULES;
    state.feature = ALL_FEATURES;
    persistState();
    render();
  });

  elements.clearFilters.addEventListener("click", resetFilters);

  elements.exportInventory.addEventListener("click", () => {
    downloadJson("platform-rollout-inventory.json", {
      exportedAt: new Date().toISOString(),
      screenCount: screenInventory.length,
      screens: screenInventory
    });
    showToast("Inventory JSON downloaded.");
  });

  elements.exportProgress.addEventListener("click", () => {
    downloadJson("platform-rollout-progress.json", buildProgressSnapshot());
    showToast("Progress snapshot downloaded.");
  });

  elements.randomScreen.addEventListener("click", () => {
    const pool = getFilteredScreens();
    const targetPool = pool.length ? pool : screenInventory;
    const randomScreen = targetPool[Math.floor(Math.random() * targetPool.length)];
    if (randomScreen) {
      selectScreen(randomScreen.route);
    }
  });

  elements.nextScreen.addEventListener("click", () => {
    const pool = getFilteredScreens();
    const targetPool = pool.length ? pool : screenInventory;
    const currentIndex = targetPool.findIndex((screen) => screen.route === state.selectedRoute);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % targetPool.length : 0;
    const nextScreen = targetPool[nextIndex];
    if (nextScreen) {
      selectScreen(nextScreen.route);
    }
  });

  elements.moduleFilter.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-module]");
    if (!trigger) return;
    focusModule(trigger.dataset.module);
  });

  elements.routeCatalog.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-route]");
    if (!trigger) {
      const resetTrigger = event.target.closest("[data-action='reset-filters']");
      if (resetTrigger) {
        resetFilters();
      }
      return;
    }
    selectScreen(trigger.dataset.route);
  });

  elements.journeyRail.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-route]");
    if (!trigger) return;
    selectScreen(trigger.dataset.route);
  });

  elements.moduleBoard.addEventListener("click", (event) => {
    const routeTrigger = event.target.closest("[data-route]");
    if (routeTrigger) {
      selectScreen(routeTrigger.dataset.route);
      return;
    }

    const moduleTrigger = event.target.closest("[data-module-select]");
    if (!moduleTrigger) return;
    focusModule(moduleTrigger.dataset.moduleSelect);
  });

  elements.copyScreenSpec.addEventListener("click", async () => {
    const currentScreen = getCurrentScreen();
    if (!currentScreen) return;
    const copied = await copyText(buildScreenMarkdown(currentScreen));
    showToast(copied ? `Copied ${currentScreen.screen} spec.` : "Clipboard copy failed.");
  });

  elements.downloadScreen.addEventListener("click", () => {
    const currentScreen = getCurrentScreen();
    if (!currentScreen) return;
    downloadJson(`${sanitizeFilename(currentScreen.screen)}-spec.json`, currentScreen);
    showToast(`${currentScreen.screen} JSON downloaded.`);
  });

  elements.dependencyGrid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-route]");
    if (!trigger) return;
    selectScreen(trigger.dataset.route);
  });

  elements.implementationList.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-check-key]");
    if (!trigger) return;
    const currentScreen = getCurrentScreen();
    if (!currentScreen) return;
    toggleChecklistItem(currentScreen, trigger.dataset.checkKey);
  });

  elements.resetScreenChecklist.addEventListener("click", () => {
    const currentScreen = getCurrentScreen();
    if (!currentScreen) return;
    delete state.checklistProgress[currentScreen.id];
    persistState();
    render();
    showToast(`${currentScreen.screen} checklist reset.`);
  });

  elements.phaseBoard.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-route]");
    if (!trigger) return;
    selectScreen(trigger.dataset.route);
  });

  elements.moduleProgress.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-module-select]");
    if (!trigger) return;
    focusModule(trigger.dataset.moduleSelect);
  });
}

function render() {
  normalizeState();
  const filteredScreens = getFilteredScreens();
  const selectedScreen = routeMap.get(state.selectedRoute) || filteredScreens[0] || routeMap.get(defaultRoute);

  if (!selectedScreen) return;

  document.documentElement.style.setProperty("--module-accent", getModuleAccent(selectedScreen.module));
  document.title = `${selectedScreen.screen} | Platform Rollout Blueprint`;
  elements.viewTitle.textContent = selectedScreen.screen;

  syncControls();
  renderSidebarStats(filteredScreens);
  renderModuleFilter();
  renderJourney(selectedScreen);
  renderHero(selectedScreen);
  renderCoverageGrid(selectedScreen, filteredScreens);
  renderCatalog(filteredScreens, selectedScreen);
  renderBlueprint(selectedScreen);
  renderStates(selectedScreen);
  renderContracts(selectedScreen);
  renderDependencies(selectedScreen);
  renderExecution(selectedScreen);
  renderAcceptance(selectedScreen);
  renderModuleBoard(selectedScreen);
  renderPortfolioProgress(selectedScreen);
  renderPhaseBoard(selectedScreen);

  persistState();
}

function syncControls() {
  if (elements.screenSearch.value !== state.query) {
    elements.screenSearch.value = state.query;
  }

  renderFeatureOptions();
  elements.sortOrder.value = state.sort;
}

function renderFeatureOptions() {
  const features = getAvailableFeatures();
  const options = [ALL_FEATURES, ...features];
  if (!options.includes(state.feature)) {
    state.feature = ALL_FEATURES;
  }

  elements.featureFilter.innerHTML = options
    .map((feature) => `<option value="${escapeAttribute(feature)}">${escapeHtml(feature)}</option>`)
    .join("");
  elements.featureFilter.value = state.feature;
}

function renderSidebarStats(filteredScreens) {
  const stats = [
    { label: "Screens", value: screenInventory.length },
    { label: "Modules", value: moduleOrder.length },
    { label: "Features", value: moduleFeaturePairs.length },
    { label: "In View", value: filteredScreens.length }
  ];

  elements.sidebarStats.innerHTML = stats
    .map(
      (stat) => `
        <article class="sidebar-stat">
          <span class="metric-label">${escapeHtml(stat.label)}</span>
          <strong>${formatNumber(stat.value)}</strong>
        </article>
      `
    )
    .join("");
}

function renderModuleFilter() {
  elements.moduleFilter.innerHTML = moduleOrder
    .map((module) => {
      const count = screenInventory.filter((screen) => screen.module === module).length;
      const isActive = state.module === module;
      return `
        <button class="module-button ${isActive ? "is-active" : ""}" type="button" data-module="${escapeAttribute(module)}" style="--module-accent: ${getModuleAccent(module)};">
          <span>${escapeHtml(module)}</span>
          <span>${formatNumber(count)}</span>
        </button>
      `;
    })
    .join("");
}

function renderJourney(selectedScreen) {
  const featureFlow = screenInventory.filter(
    (screen) => screen.module === selectedScreen.module && screen.feature === selectedScreen.feature
  );
  const selectedIndex = screenInventory.findIndex((screen) => screen.route === selectedScreen.route);
  const adjacent = [screenInventory[selectedIndex - 1], screenInventory[selectedIndex + 1]].filter(Boolean);

  elements.journeyRail.innerHTML = `
    <div class="journey-block">
      <p class="mini-label">Within ${escapeHtml(selectedScreen.feature)}</p>
      ${featureFlow
        .map(
          (screen) => `
            <button
              class="journey-button ${screen.route === selectedScreen.route ? "is-active" : ""} ${isAdminOnly(screen) ? "is-admin" : ""}"
              type="button"
              data-route="${escapeAttribute(screen.route)}"
              style="--module-accent: ${getModuleAccent(screen.module)};"
            >
              <strong>${escapeHtml(screen.screen)}</strong>
              ${isAdminOnly(screen) ? `<span class="admin-badge">Admin Only</span>` : ""}
              <span class="journey-copy">${escapeHtml(screen.route)}</span>
            </button>
          `
        )
        .join("")}
    </div>
    <div class="journey-block">
      <p class="mini-label">Adjacent Routes</p>
      ${adjacent
        .map(
          (screen) => `
            <button
              class="journey-button ${isAdminOnly(screen) ? "is-admin" : ""}"
              type="button"
              data-route="${escapeAttribute(screen.route)}"
              style="--module-accent: ${getModuleAccent(screen.module)};"
            >
              <strong>${escapeHtml(screen.screen)}</strong>
              ${isAdminOnly(screen) ? `<span class="admin-badge">Admin Only</span>` : ""}
              <span class="journey-copy">${escapeHtml(screen.route)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHero(selectedScreen) {
  const execution = getExecutionMetadata(selectedScreen);
  elements.screenKicker.textContent = `${selectedScreen.module} / ${selectedScreen.feature} / #${selectedScreen.index}`;
  elements.screenTitle.textContent = selectedScreen.screen;
  elements.screenPurpose.textContent = selectedScreen.purpose;

  const metricCards = [
    { label: "Components", value: selectedScreen.components.length },
    { label: "Actions", value: selectedScreen.primaryActions.length },
    { label: "APIs", value: selectedScreen.apis.length },
    { label: "Criteria", value: selectedScreen.acceptanceCriteria.length }
  ];

  elements.screenMetrics.innerHTML = metricCards
    .map(
      (metric) => `
        <article class="metric-chip">
          <span class="metric-label">${escapeHtml(metric.label)}</span>
          <strong>${formatNumber(metric.value)}</strong>
        </article>
      `
    )
    .join("");

  const pills = [
    { label: "Module", value: selectedScreen.module },
    { label: "Feature", value: selectedScreen.feature },
    { label: "Phase", value: `${execution.phase.label} ${execution.phase.title}` },
    { label: "Complexity", value: execution.complexity.tier },
    { label: "Permission", value: selectedScreen.permissions[0] || "No permissions listed" },
    { label: "Route", value: `#${selectedScreen.index} of ${screenInventory.length}` }
  ];

  if (isAdminOnly(selectedScreen)) {
    pills.splice(4, 0, { label: "Access", value: "Admin Only" });
  }

  elements.metaPills.innerHTML = pills
    .map(
      (pill) => `
        <span class="meta-pill">
          <span class="label">${escapeHtml(pill.label)}</span>
          <strong>${escapeHtml(pill.value)}</strong>
        </span>
      `
    )
    .join("");

  elements.primaryActions.innerHTML = selectedScreen.primaryActions
    .map(
      (action) => `
        <button class="action-pill" type="button" aria-label="${escapeAttribute(action)}">
          ${escapeHtml(action)}
        </button>
      `
    )
    .join("");

  elements.routeReadout.innerHTML = `
    <strong>${escapeHtml(selectedScreen.route)}</strong>
    <span class="sequence-chip">#${selectedScreen.index}</span>
  `;
}

function renderCoverageGrid(selectedScreen, filteredScreens) {
  const selectedModuleCount = screenInventory.filter((screen) => screen.module === selectedScreen.module).length;
  const coverageCards = [
    { label: "Visible", value: filteredScreens.length },
    { label: "Module Depth", value: selectedModuleCount },
    { label: "Unique APIs", value: uniqueApiCount },
    { label: "DB Objects", value: selectedScreen.dbObjects.length }
  ];

  elements.coverageGrid.innerHTML = coverageCards
    .map(
      (item) => `
        <article class="coverage-chip">
          <span class="metric-label">${escapeHtml(item.label)}</span>
          <strong>${formatNumber(item.value)}</strong>
        </article>
      `
    )
    .join("");
}

function renderCatalog(filteredScreens, selectedScreen) {
  const selectionHidden = filteredScreens.every((screen) => screen.route !== selectedScreen.route);
  elements.catalogCount.textContent = `${filteredScreens.length} routes in view`;

  if (!filteredScreens.length) {
    elements.routeCatalog.innerHTML = `
      <div class="empty-catalog">
        <p>No rows match the current filter set.</p>
        <button class="ghost-button small-button" type="button" data-action="reset-filters">Reset filters</button>
      </div>
    `;
    return;
  }

  const hiddenNotice = selectionHidden
    ? `
        <div class="empty-catalog">
          <p>The open route stays pinned in the detail canvas, but the current search/filter set hides it from the catalog.</p>
        </div>
      `
    : "";

  elements.routeCatalog.innerHTML = `
    ${hiddenNotice}
    ${filteredScreens
      .map(
        (screen) => `
          <button
            class="catalog-card ${screen.route === selectedScreen.route ? "is-selected" : ""} ${isAdminOnly(screen) ? "is-admin" : ""}"
            type="button"
            data-route="${escapeAttribute(screen.route)}"
            style="--module-accent: ${getModuleAccent(screen.module)};"
          >
            <div class="catalog-card-top">
              <span class="sequence-chip">#${screen.index}</span>
              <span class="route-pill">${escapeHtml(screen.module)}</span>
              ${isAdminOnly(screen) ? `<span class="admin-badge">Admin Only</span>` : ""}
            </div>
            <div>
              <h4>${escapeHtml(screen.screen)}</h4>
              <code>${escapeHtml(screen.route)}</code>
            </div>
            <p>${escapeHtml(screen.purpose)}</p>
            <div class="catalog-meta">
              <span>${formatNumber(screen.components.length)} components</span>
              <span>${formatNumber(screen.apis.length)} APIs</span>
              <span>${formatNumber(screen.acceptanceCriteria.length)} criteria</span>
            </div>
          </button>
        `
      )
      .join("")}
  `;
}

function renderBlueprint(selectedScreen) {
  const metaCards = [
    { label: "Module", value: selectedScreen.module, className: "" },
    { label: "Feature", value: selectedScreen.feature, className: "" },
    { label: "Screen", value: selectedScreen.screen, className: "" },
    { label: "Route", value: selectedScreen.route, className: "route-card" }
  ];

  elements.moduleFeatureGrid.innerHTML = metaCards
    .map(
      (item) => `
        <article class="meta-card ${item.className}">
          <p class="eyebrow">${escapeHtml(item.label)}</p>
          <h4>${escapeHtml(item.value)}</h4>
        </article>
      `
    )
    .join("");

  elements.wireframeStage.innerHTML = `
    <div class="wireframe-shell">
      <div class="wireframe-bar">
        <div class="window-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <code>${escapeHtml(selectedScreen.route)}</code>
        <span class="route-pill">${escapeHtml(selectedScreen.permissions[0] || "Access defined")}</span>
      </div>
      <div class="wireframe-actions">
        ${selectedScreen.primaryActions
          .slice(0, 4)
          .map((action) => `<span class="route-pill">${escapeHtml(action)}</span>`)
          .join("")}
      </div>
      <div class="wireframe-layout">
        ${selectedScreen.components
          .map((component) => {
            const size = getComponentSize(component);
            return `
              <article class="wireframe-block ${size}">
                <span class="component-kind">${escapeHtml(classifyComponent(component))}</span>
                <strong>${escapeHtml(component)}</strong>
                <div class="wireframe-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;

  elements.componentGrid.innerHTML = selectedScreen.components
    .map(
      (component) => `
        <article class="component-card">
          <span class="component-kind">${escapeHtml(classifyComponent(component))}</span>
          <h4>${escapeHtml(component)}</h4>
          <p>${escapeHtml(describeComponent(component, selectedScreen))}</p>
        </article>
      `
    )
    .join("");
}

function renderStates(selectedScreen) {
  const statePanels = [
    {
      label: "Empty State",
      tone: "empty",
      message: selectedScreen.emptyState,
      notes: [
        `${selectedScreen.screen} still needs to communicate purpose before data exists.`,
        `Guide users toward ${selectedScreen.primaryActions[0]?.toLowerCase() || "the first primary action"}.`
      ]
    },
    {
      label: "Error State",
      tone: "error",
      message: selectedScreen.errorState,
      notes: [
        `Recovery should preserve the route context at ${selectedScreen.route}.`,
        `Surface dependency issues around ${selectedScreen.apis[0] || "the failing service"} without hiding next steps.`
      ]
    }
  ];

  elements.stateGrid.innerHTML = statePanels
    .map(
      (panel) => `
        <article class="state-panel ${panel.tone}">
          <span class="state-badge">${escapeHtml(panel.label)}</span>
          <strong>${escapeHtml(panel.message)}</strong>
          <ul>
            ${panel.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("");
}

function renderContracts(selectedScreen) {
  const contracts = [
    {
      title: "Permissions",
      badge: `${selectedScreen.permissions.length} rules`,
      items: selectedScreen.permissions,
      code: false
    },
    {
      title: "APIs",
      badge: `${selectedScreen.apis.length} endpoints`,
      items: selectedScreen.apis,
      code: true
    },
    {
      title: "DB Objects",
      badge: `${selectedScreen.dbObjects.length} objects`,
      items: selectedScreen.dbObjects,
      code: true
    }
  ];

  elements.contractGrid.innerHTML = contracts
    .map(
      (contract) => `
        <article class="contract-panel">
          <div class="card-heading">
            <div>
              <p class="eyebrow">${escapeHtml(contract.title)}</p>
              <h4>${escapeHtml(contract.title)}</h4>
            </div>
            <span class="contract-badge">${escapeHtml(contract.badge)}</span>
          </div>
          <ul class="contract-list">
            ${contract.items
              .map((item) => `<li>${contract.code ? `<code>${escapeHtml(item)}</code>` : escapeHtml(item)}</li>`)
              .join("")}
          </ul>
        </article>
      `
    )
    .join("");
}

function renderDependencies(selectedScreen) {
  const panels = [
    {
      title: "Shared API Surface",
      label: "APIs",
      currentValues: selectedScreen.apis,
      matches: getRelatedScreens(selectedScreen, "apis")
    },
    {
      title: "Shared Data Objects",
      label: "DB Objects",
      currentValues: selectedScreen.dbObjects,
      matches: getRelatedScreens(selectedScreen, "dbObjects")
    },
    {
      title: "Shared Access Rules",
      label: "Permissions",
      currentValues: selectedScreen.permissions,
      matches: getRelatedScreens(selectedScreen, "permissions")
    }
  ];

  elements.dependencyGrid.innerHTML = panels
    .map(
      (panel) => `
        <article class="dependency-panel">
          <div class="dependency-head">
            <p class="eyebrow">${escapeHtml(panel.label)}</p>
            <h4>${escapeHtml(panel.title)}</h4>
          </div>
          <div class="dependency-chip-row">
            ${panel.currentValues.map((value) => `<span class="dependency-chip">${escapeHtml(value)}</span>`).join("")}
          </div>
          <div class="dependency-list">
            ${
              panel.matches.length
                ? panel.matches
                    .map(
                      ({ screen, overlap }) => `
                        <button
                          class="dependency-link"
                          type="button"
                          data-route="${escapeAttribute(screen.route)}"
                          style="--module-accent: ${getModuleAccent(screen.module)};"
                        >
                          <div>
                            <strong>${escapeHtml(screen.screen)}</strong>
                            <code>${escapeHtml(screen.route)}</code>
                          </div>
                          <div class="dependency-chip-row">
                            ${overlap.map((item) => `<span class="dependency-chip">${escapeHtml(item)}</span>`).join("")}
                          </div>
                        </button>
                      `
                    )
                    .join("")
                : `<div class="dependency-empty">No other routes share this ${escapeHtml(panel.label.toLowerCase())} surface.</div>`
            }
          </div>
        </article>
      `
    )
    .join("");
}

function renderExecution(selectedScreen) {
  const metadata = getExecutionMetadata(selectedScreen);
  const completed = metadata.checklist.filter((item) => item.done).length;

  elements.executionSummary.innerHTML = `
    <article class="execution-metric">
      <span class="metric-label">Phase</span>
      <strong>${escapeHtml(`${metadata.phase.label} ${metadata.phase.title}`)}</strong>
    </article>
    <article class="execution-metric">
      <span class="metric-label">Complexity</span>
      <strong>${escapeHtml(metadata.complexity.tier)}</strong>
    </article>
    <article class="execution-metric">
      <span class="metric-label">Tracks</span>
      <strong>${escapeHtml(metadata.deliveryTracks.join(", "))}</strong>
    </article>
    <article class="execution-metric">
      <span class="metric-label">Checklist</span>
      <strong>${completed}/${metadata.checklist.length}</strong>
    </article>
  `;

  elements.implementationList.innerHTML = metadata.checklist
    .map(
      (item) => `
        <button
          class="checklist-item ${item.done ? "is-done" : ""}"
          type="button"
          data-check-key="${escapeAttribute(item.key)}"
        >
          <span class="checkmark">${item.done ? "✓" : "•"}</span>
          <span class="checklist-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </span>
        </button>
      `
    )
    .join("");
}

function renderAcceptance(selectedScreen) {
  elements.acceptanceList.innerHTML = selectedScreen.acceptanceCriteria
    .map(
      (criterion) => `
        <li>
          <strong>${escapeHtml(criterion)}</strong>
          <span>${escapeHtml(`${selectedScreen.screen} is only complete when this condition is demonstrably true.`)}</span>
        </li>
      `
    )
    .join("");
}

function renderPhaseBoard(selectedScreen) {
  const selectedPhase = getPhaseForModule(selectedScreen.module);

  elements.phaseBoard.innerHTML = ROLLOUT_PHASES.map((phase) => {
    const phaseScreens = screenInventory.filter((screen) => phase.modules.includes(screen.module));
    const phaseApis = new Set(phaseScreens.flatMap((screen) => screen.apis)).size;
    const samples = phaseScreens.slice(0, 4);
    return `
      <article class="phase-card ${phase.id === selectedPhase.id ? "is-active" : ""}" style="--module-accent: ${getModuleAccent(phase.modules[0])};">
        <div class="phase-top">
          <div>
            <p class="eyebrow">${escapeHtml(phase.label)}</p>
            <h4>${escapeHtml(phase.title)}</h4>
          </div>
          <span class="sequence-chip">${formatNumber(phaseScreens.length)} routes</span>
        </div>
        <p>${escapeHtml(phase.rationale)}</p>
        <div class="phase-modules">
          ${phase.modules.map((module) => `<span class="phase-module-pill">${escapeHtml(module)}</span>`).join("")}
        </div>
        <div class="phase-screen-list">
          ${samples
            .map(
              (screen) => `
                <button class="phase-screen-button ${isAdminOnly(screen) ? "is-admin" : ""}" type="button" data-route="${escapeAttribute(screen.route)}">
                  <span class="sequence-chip">#${screen.index}</span>
                  <span>${escapeHtml(screen.screen)}</span>
                  ${isAdminOnly(screen) ? `<span class="admin-badge">Admin Only</span>` : ""}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="catalog-meta">
          <span>${formatNumber(phaseApis)} unique APIs</span>
          <span>${formatNumber(new Set(phaseScreens.flatMap((screen) => screen.dbObjects)).size)} DB objects</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderModuleBoard(selectedScreen) {
  elements.moduleBoard.innerHTML = moduleOrder
    .map((module) => {
      const moduleScreens = screenInventory.filter((screen) => screen.module === module);
      const features = [...new Set(moduleScreens.map((screen) => screen.feature))];
      const previewRoutes = moduleScreens.slice(0, 3);
      const remainingCount = moduleScreens.length - previewRoutes.length;
      return `
        <article class="module-board-card ${module === selectedScreen.module ? "is-selected" : ""}" style="--module-accent: ${getModuleAccent(module)};">
          <div class="module-board-top">
            <button class="module-board-title" type="button" data-module-select="${escapeAttribute(module)}">
              <p class="eyebrow">${escapeHtml(module)}</p>
              <h4>${escapeHtml(module)}</h4>
            </button>
            <div class="module-board-meta">
              <span class="sequence-chip">${formatNumber(moduleScreens.length)} routes</span>
            </div>
          </div>
          <p>${escapeHtml(`${features.length} features mapped from the inventory for ${module}.`)}</p>
          <div class="feature-list">
            ${features.map((feature) => `<span class="feature-chip">${escapeHtml(feature)}</span>`).join("")}
          </div>
          <div class="module-route-list">
            ${previewRoutes
              .map(
                (screen) => `
                  <button class="mini-route ${isAdminOnly(screen) ? "is-admin" : ""}" type="button" data-route="${escapeAttribute(screen.route)}">
                    <span class="sequence-chip">#${screen.index}</span>
                    <span class="mini-route-copy">
                      <strong>${escapeHtml(screen.screen)}</strong>
                      <code>${escapeHtml(screen.route)}</code>
                    </span>
                    ${isAdminOnly(screen) ? `<span class="admin-badge">Admin Only</span>` : ""}
                  </button>
                `
              )
              .join("")}
          </div>
          ${
            remainingCount > 0
              ? `<p class="module-board-note">+${formatNumber(remainingCount)} more routes inside ${escapeHtml(module)}</p>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function renderPortfolioProgress(selectedScreen) {
  const snapshot = buildProgressSnapshot();
  const activeModule = state.module === ALL_MODULES ? selectedScreen.module : state.module;
  const activePhase = getPhaseForModule(selectedScreen.module);

  const summaryCards = [
    {
      label: "Checklist Completion",
      value: formatPercent(snapshot.overall.checklistPercent),
      detail: `${snapshot.overall.completedSteps}/${snapshot.overall.totalSteps} steps complete`
    },
    {
      label: "Started Routes",
      value: `${snapshot.overall.startedScreens}/${snapshot.overall.totalScreens}`,
      detail: "Routes with at least one implementation step completed"
    },
    {
      label: "Completed Routes",
      value: `${snapshot.overall.completedScreens}/${snapshot.overall.totalScreens}`,
      detail: "Routes that have every checklist item closed"
    },
    {
      label: "Active Modules",
      value: `${snapshot.modules.filter((module) => module.startedScreens > 0).length}/${snapshot.modules.length}`,
      detail: `Current selection sits in ${activePhase.label} ${activePhase.title}`
    }
  ];

  elements.portfolioSummary.innerHTML = summaryCards
    .map(
      (card) => `
        <article class="summary-card">
          <span class="metric-label">${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.detail)}</p>
        </article>
      `
    )
    .join("");

  elements.phaseProgress.innerHTML = snapshot.phases
    .map(
      (phase) => `
        <article class="phase-progress-card ${phase.id === activePhase.id ? "is-active" : ""}" style="--module-accent: ${getModuleAccent(phase.modules[0])};">
          <div class="phase-progress-top">
            <div>
              <p class="eyebrow">${escapeHtml(phase.label)}</p>
              <h4>${escapeHtml(phase.title)}</h4>
            </div>
            <strong class="progress-value">${formatPercent(phase.checklistPercent)}</strong>
          </div>
          <div class="progress-bar">
            <span style="width: ${phase.checklistPercent}%;"></span>
          </div>
          <div class="progress-meta">
            <span>${escapeHtml(`${phase.completedScreens}/${phase.totalScreens} routes complete`)}</span>
            <span>${escapeHtml(`${phase.completedSteps}/${phase.totalSteps} checklist steps`)}</span>
          </div>
        </article>
      `
    )
    .join("");

  elements.moduleProgress.innerHTML = snapshot.modules
    .map(
      (module) => `
        <button
          class="module-progress-card ${module.module === activeModule ? "is-active" : ""}"
          type="button"
          data-module-select="${escapeAttribute(module.module)}"
          style="--module-accent: ${getModuleAccent(module.module)};"
        >
          <div class="module-progress-top">
            <div>
              <p class="eyebrow">${escapeHtml(`${module.phase.label} ${module.phase.title}`)}</p>
              <h4>${escapeHtml(module.module)}</h4>
            </div>
            <strong class="progress-value">${formatPercent(module.checklistPercent)}</strong>
          </div>
          <div class="progress-bar">
            <span style="width: ${module.checklistPercent}%;"></span>
          </div>
          <div class="progress-meta">
            <span>${escapeHtml(`${module.completedScreens}/${module.totalScreens} routes complete`)}</span>
            <span>${escapeHtml(`${module.startedScreens} started`)}</span>
            <span>${escapeHtml(`${module.featureCount} features`)}</span>
          </div>
        </button>
      `
    )
    .join("");
}

function getFilteredScreens() {
  return [...screenInventory]
    .filter((screen) => {
      if (state.module !== ALL_MODULES && screen.module !== state.module) return false;
      if (state.feature !== ALL_FEATURES && screen.feature !== state.feature) return false;
      if (!state.query.trim()) return true;
      return buildSearchIndex(screen).includes(state.query.trim().toLowerCase());
    })
    .sort(sortScreens);
}

function getRelatedScreens(selectedScreen, field) {
  return screenInventory
    .filter((screen) => screen.route !== selectedScreen.route)
    .map((screen) => {
      const overlap = selectedScreen[field].filter((value) => screen[field].includes(value));
      return { screen, overlap };
    })
    .filter(({ overlap }) => overlap.length)
    .sort((left, right) => {
      if (right.overlap.length !== left.overlap.length) {
        return right.overlap.length - left.overlap.length;
      }
      return left.screen.index - right.screen.index;
    })
    .slice(0, 5);
}

function sortScreens(left, right) {
  if (state.sort === "screen") {
    return left.screen.localeCompare(right.screen) || left.index - right.index;
  }

  if (state.sort === "route") {
    return left.route.localeCompare(right.route) || left.index - right.index;
  }

  if (state.sort === "dependencies") {
    const leftScore = left.apis.length + left.dbObjects.length;
    const rightScore = right.apis.length + right.dbObjects.length;
    return rightScore - leftScore || left.index - right.index;
  }

  return left.index - right.index;
}

function buildSearchIndex(screen) {
  return [
    screen.module,
    screen.feature,
    screen.screen,
    screen.route,
    screen.purpose,
    ...screen.components,
    ...screen.primaryActions,
    screen.emptyState,
    screen.errorState,
    ...screen.permissions,
    ...screen.apis,
    ...screen.dbObjects,
    ...screen.acceptanceCriteria
  ]
    .join(" ")
    .toLowerCase();
}

function getAvailableFeatures() {
  const screens =
    state.module === ALL_MODULES
      ? screenInventory
      : screenInventory.filter((screen) => screen.module === state.module);
  return [...new Set(screens.map((screen) => screen.feature))];
}

function focusModule(module) {
  state.module = module;
  state.feature = ALL_FEATURES;
  const filtered = getFilteredScreens();
  if (filtered.length && !filtered.some((screen) => screen.route === state.selectedRoute)) {
    state.selectedRoute = filtered[0].route;
    updateHash(state.selectedRoute);
  }
  persistState();
  render();
}

function selectScreen(route) {
  const target = routeMap.get(route);
  if (!target) return;

  state.selectedRoute = route;
  if (!matchesCurrentFilters(target)) {
    state.module = target.module;
    state.feature = ALL_FEATURES;
    if (state.query.trim() && !buildSearchIndex(target).includes(state.query.trim().toLowerCase())) {
      state.query = "";
    }
  }

  persistState();
  updateHash(route);
  render();
}

function getCurrentScreen() {
  return routeMap.get(state.selectedRoute) || routeMap.get(defaultRoute) || null;
}

function getExecutionMetadata(screen) {
  const complexityScore =
    screen.components.length * 2 +
    screen.primaryActions.length +
    screen.apis.length * 3 +
    screen.dbObjects.length * 2 +
    screen.acceptanceCriteria.length * 2 +
    screen.permissions.length;

  const tier = complexityScore >= 26 ? "High" : complexityScore >= 18 ? "Medium" : "Low";
  const phase = getPhaseForModule(screen.module);
  const deliveryTracks = deriveDeliveryTracks(screen);
  const checklist = buildChecklist(screen);

  return {
    complexity: {
      score: complexityScore,
      tier
    },
    phase,
    deliveryTracks,
    checklist
  };
}

function getPhaseForModule(module) {
  return ROLLOUT_PHASES.find((phase) => phase.modules.includes(module)) || ROLLOUT_PHASES[0];
}

function deriveDeliveryTracks(screen) {
  const tracks = ["Frontend"];

  if (screen.apis.length || screen.dbObjects.length) {
    tracks.push("Backend");
  }

  if (screen.permissions.length || /identity|sign|payments|ai/i.test(screen.module)) {
    tracks.push("Security");
  }

  if (/workflows|automation|ai/i.test(screen.module)) {
    tracks.push("Automation");
  }

  tracks.push("QA");
  return [...new Set(tracks)];
}

function isAdminOnly(screen) {
  return screen.permissions.some((permission) => ADMIN_PERMISSIONS.includes(permission));
}

function buildChecklist(screen) {
  const progress = state.checklistProgress?.[screen.id] || {};
  return CHECKLIST_DEFINITIONS.map(({ key, title, getDetail }) => ({
    key,
    title,
    detail: getDetail(screen),
    done: Boolean(progress[key])
  }));
}

function toggleChecklistItem(screen, key) {
  const current = state.checklistProgress[screen.id] || {};
  const nextValue = !current[key];
  state.checklistProgress[screen.id] = {
    ...current,
    [key]: nextValue
  };
  persistState();
  render();
  const checklistItem = CHECKLIST_DEFINITIONS.find((item) => item.key === key);
  showToast(`${screen.screen}: ${nextValue ? "completed" : "reopened"} ${checklistItem?.title.toLowerCase() || key}.`);
}

function getScreenProgress(screen) {
  const progress = state.checklistProgress?.[screen.id] || {};
  const completedSteps = CHECKLIST_DEFINITIONS.reduce((total, item) => total + Number(Boolean(progress[item.key])), 0);
  const totalSteps = CHECKLIST_DEFINITIONS.length;

  return {
    completedSteps,
    totalSteps,
    checklistPercent: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
    isStarted: completedSteps > 0,
    isComplete: completedSteps === totalSteps
  };
}

function getGroupProgress(screens) {
  const screenProgress = screens.map((screen) => getScreenProgress(screen));
  const completedSteps = screenProgress.reduce((total, item) => total + item.completedSteps, 0);
  const totalSteps = screenProgress.reduce((total, item) => total + item.totalSteps, 0);
  const startedScreens = screenProgress.filter((item) => item.isStarted).length;
  const completedScreens = screenProgress.filter((item) => item.isComplete).length;

  return {
    totalScreens: screens.length,
    startedScreens,
    completedScreens,
    completedSteps,
    totalSteps,
    checklistPercent: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
    screenPercent: screens.length ? Math.round((completedScreens / screens.length) * 100) : 0
  };
}

function buildProgressSnapshot() {
  return {
    exportedAt: new Date().toISOString(),
    selectedRoute: state.selectedRoute,
    overall: getGroupProgress(screenInventory),
    phases: ROLLOUT_PHASES.map((phase) => {
      const screens = screenInventory.filter((screen) => phase.modules.includes(screen.module));
      return {
        id: phase.id,
        label: phase.label,
        title: phase.title,
        rationale: phase.rationale,
        modules: phase.modules,
        ...getGroupProgress(screens)
      };
    }),
    modules: moduleOrder.map((module) => {
      const screens = screenInventory.filter((screen) => screen.module === module);
      return {
        module,
        phase: getPhaseForModule(module),
        featureCount: new Set(screens.map((screen) => screen.feature)).size,
        ...getGroupProgress(screens)
      };
    }),
    screens: screenInventory.map((screen) => {
      const progress = getScreenProgress(screen);
      return {
        id: screen.id,
        index: screen.index,
        module: screen.module,
        feature: screen.feature,
        screen: screen.screen,
        route: screen.route,
        phase: getPhaseForModule(screen.module),
        deliveryTracks: deriveDeliveryTracks(screen),
        ...progress,
        checklist: buildChecklist(screen).map((item) => ({
          key: item.key,
          title: item.title,
          done: item.done
        }))
      };
    })
  };
}

function matchesCurrentFilters(screen) {
  if (state.module !== ALL_MODULES && screen.module !== state.module) return false;
  if (state.feature !== ALL_FEATURES && screen.feature !== state.feature) return false;
  if (state.query.trim() && !buildSearchIndex(screen).includes(state.query.trim().toLowerCase())) return false;
  return true;
}

function normalizeState() {
  if (!routeMap.has(state.selectedRoute)) {
    state.selectedRoute = defaultRoute;
  }

  if (!state.checklistProgress || typeof state.checklistProgress !== "object") {
    state.checklistProgress = {};
  }

  if (!moduleOrder.includes(state.module) && state.module !== ALL_MODULES) {
    state.module = ALL_MODULES;
  }

  const featureOptions = [ALL_FEATURES, ...getAvailableFeatures()];
  if (!featureOptions.includes(state.feature)) {
    state.feature = ALL_FEATURES;
  }

  const validSorts = ["index", "screen", "route", "dependencies"];
  if (!validSorts.includes(state.sort)) {
    state.sort = "index";
  }
}

function syncStateWithHash(isInitial = false) {
  const route = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (routeMap.has(route)) {
    state.selectedRoute = route;
    const selected = routeMap.get(route);
    if (selected && !matchesCurrentFilters(selected)) {
      state.module = selected.module;
      state.feature = ALL_FEATURES;
      if (isInitial && state.query.trim() && !buildSearchIndex(selected).includes(state.query.trim().toLowerCase())) {
        state.query = "";
      }
    }
    persistState();
    return;
  }

  if (state.selectedRoute) {
    updateHash(state.selectedRoute, true);
  }
}

function updateHash(route, replace = false) {
  const nextHash = `#${route}`;
  if (replace) {
    history.replaceState(null, "", nextHash);
    return;
  }

  if (window.location.hash !== nextHash) {
    window.location.hash = route;
  }
}

function resetFilters() {
  state.module = ALL_MODULES;
  state.feature = ALL_FEATURES;
  state.query = "";
  state.sort = "index";
  persistState();
  render();
}

function getModuleAccent(module) {
  return MODULE_ACCENTS[module] || "#c86642";
}

function getComponentSize(component) {
  const lower = component.toLowerCase();
  if (/(table|grid|board|canvas|editor|builder|diagram|analytics|preview)/.test(lower)) {
    return "wide";
  }
  if (/(list|pane|drawer|modal|viewer|history|feed|queue|gallery|matrix)/.test(lower)) {
    return "medium";
  }
  return "narrow";
}

function classifyComponent(component) {
  const lower = component.toLowerCase();
  if (/(search|filter|tabs|switcher|nav|menu)/.test(lower)) return "Navigation";
  if (/(table|grid|list|queue|board|history|logs|analytics|cards|feed)/.test(lower)) return "Data";
  if (/(builder|editor|designer|canvas|mapping|matrix|logic)/.test(lower)) return "Authoring";
  if (/(modal|drawer|pane|preview|detail|viewer)/.test(lower)) return "Context";
  if (/(form|wizard|checkout|request|upload|signature)/.test(lower)) return "Input";
  return "Support";
}

function describeComponent(component, screen) {
  const lower = component.toLowerCase();
  if (/(table|grid|list|queue|board|history|logs)/.test(lower)) {
    return `Keeps ${screen.purpose.toLowerCase()} visible while supporting ${screen.primaryActions[0]?.toLowerCase() || "core workflow actions"}.`;
  }

  if (/(builder|editor|designer|canvas|mapping|matrix|logic)/.test(lower)) {
    return `Acts as the primary authoring surface for ${screen.feature.toLowerCase()} inside the ${screen.screen.toLowerCase()} flow.`;
  }

  if (/(modal|drawer|pane|preview|detail|viewer)/.test(lower)) {
    return `Adds focused context without forcing users to leave ${screen.route}.`;
  }

  if (/(search|filter|tabs|switcher|nav|menu)/.test(lower)) {
    return `Shapes navigation and discovery across the ${screen.module.toLowerCase()} module.`;
  }

  return `Supports ${screen.purpose.toLowerCase()} and reinforces the acceptance criteria for this route.`;
}

function loadState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return {
      module: saved?.module ?? ALL_MODULES,
      feature: saved?.feature ?? ALL_FEATURES,
      query: saved?.query ?? "",
      sort: saved?.sort ?? "index",
      selectedRoute: saved?.selectedRoute ?? defaultRoute,
      checklistProgress: saved?.checklistProgress ?? {}
    };
  } catch (error) {
    return {
      module: ALL_MODULES,
      feature: ALL_FEATURES,
      query: "",
      sort: "index",
      selectedRoute: defaultRoute,
      checklistProgress: {}
    };
  }
}

function persistState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function sanitizeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildScreenMarkdown(screen) {
  return [
    `# ${screen.screen}`,
    "",
    `- Module: ${screen.module}`,
    `- Feature: ${screen.feature}`,
    `- Route: ${screen.route}`,
    "",
    "## Purpose",
    screen.purpose,
    "",
    "## Components",
    ...screen.components.map((item) => `- ${item}`),
    "",
    "## Primary Actions",
    ...screen.primaryActions.map((item) => `- ${item}`),
    "",
    "## Empty State",
    screen.emptyState,
    "",
    "## Error State",
    screen.errorState,
    "",
    "## Permissions",
    ...screen.permissions.map((item) => `- ${item}`),
    "",
    "## APIs",
    ...screen.apis.map((item) => `- ${item}`),
    "",
    "## DB Objects",
    ...screen.dbObjects.map((item) => `- ${item}`),
    "",
    "## Acceptance Criteria",
    ...screen.acceptanceCriteria.map((item) => `- ${item}`)
  ].join("\n");
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      return fallbackCopyText(value);
    }
  }

  return fallbackCopyText(value);
}

function fallbackCopyText(value) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  return copied;
}

function showToast(message) {
  elements.statusToast.textContent = message;
  elements.statusToast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.statusToast.classList.remove("is-visible");
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
