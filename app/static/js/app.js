const state = {
  devices: [],
  wiringDevices: [],
  connectors: [],
  junctionBoxes: [],
  activePlannerTab: "junction",
  selectedJunctionProfile: null,
  items: [],
  wiringLinks: [],
  nextId: 1,
  selectedItemId: null,
  selectedWireId: null,
  altInfoItemId: null,
  drag: null,
  pendingWireSource: null,
  pendingWire: null,
  pendingPlacement: null,
  viewportPan: null,
  cursorIn: null,
  zoom: 1,
  basePixelsPerInch: 36,
  workspaceWidthIn: 240,
  workspaceHeightIn: 240,
};

// Session persistence using localStorage
const SESSION_STORAGE_KEY = "shelly_planner_session";
const SESSION_AUTOSAVE_DELAY = 1000; // milliseconds
let autosaveTimer = null;

function saveSession() {
  const sessionData = {
    items: state.items,
    wiringLinks: state.wiringLinks,
    nextId: state.nextId,
    zoom: state.zoom,
    viewportScrollLeft: el.workspaceViewport?.scrollLeft || 0,
    viewportScrollTop: el.workspaceViewport?.scrollTop || 0,
    activePlannerTab: state.activePlannerTab,
    timestamp: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn("Failed to save session to localStorage:", e);
  }
}

function debouncedSaveSession() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }
  autosaveTimer = setTimeout(() => {
    saveSession();
    autosaveTimer = null;
  }, SESSION_AUTOSAVE_DELAY);
}

function loadSession() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return false;
    
    const sessionData = JSON.parse(stored);
    state.items = sessionData.items || [];
    state.wiringLinks = sessionData.wiringLinks || [];
    state.nextId = Math.max(state.nextId, sessionData.nextId || 1);
    state.zoom = sessionData.zoom || 1;
    state.activePlannerTab = sessionData.activePlannerTab || "junction";
    
    // Restore viewport position after a brief delay to allow rendering
    if (sessionData.viewportScrollLeft !== undefined && sessionData.viewportScrollTop !== undefined) {
      setTimeout(() => {
        el.workspaceViewport.scrollLeft = sessionData.viewportScrollLeft;
        el.workspaceViewport.scrollTop = sessionData.viewportScrollTop;
      }, 100);
    }
    
    return true;
  } catch (e) {
    console.warn("Failed to load session from localStorage:", e);
    return false;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear session from localStorage:", e);
  }
}

// Exposed globally for user convenience
window.clearPlannerSession = function() {
  clearSession();
  console.log("Planner session cleared. Reloading page...");
  location.reload();
};

const COLORS = {
  hot: "#1f1f1f",
  neutral: "#f8fafc",
  red: "#dc2626",
  ground: "#15803d",
};

const NEUTRAL_PREVIEW_COLOR = "#c8be7a";
const JUNCTION_LINK_COLOR = "#8a8f96";
const BASE_BLACK_WIRE_WIDTH = 2.6;
const BASE_GROUND_WIRE_WIDTH = 3;
const JUNCTION_LINK_WIDTH_MULTIPLIER = 5;

const COLOR_LABELS = {
  hot: "BLACK",
  neutral: "WHITE",
  red: "RED",
  ground: "GREEN",
};

const el = {
  workspace: document.getElementById("workspace"),
  workspaceViewport: document.getElementById("workspace-viewport"),
  wireLayer: document.getElementById("wire-layer"),
  rulerTop: document.getElementById("ruler-top"),
  rulerLeft: document.getElementById("ruler-left"),
  zoomRange: document.getElementById("zoom-range"),
  zoomValue: document.getElementById("zoom-value"),
  wireModeHint: document.getElementById("wire-mode-hint"),
  addonType: document.getElementById("addon-type"),
  addAddonBtn: document.getElementById("add-addon-btn"),
  clearGridBtn: document.getElementById("clear-grid-btn"),
  screenshotGridBtn: document.getElementById("screenshot-grid-btn"),
  exportProjectBtn: document.getElementById("export-project-btn"),
  importProjectBtn: document.getElementById("import-project-btn"),
  importProjectInput: document.getElementById("import-project-input"),
  deleteItemBtn: document.getElementById("delete-item-btn"),
  addBoxBtn: document.getElementById("add-box-btn"),
  junctionType: document.getElementById("junction-type"),
  junctionEnvironment: document.getElementById("junction-environment"),
  junctionGang: document.getElementById("junction-gang"),
  junctionClearBtn: document.getElementById("junction-clear-btn"),
  junctionNextBtn: document.getElementById("junction-next-btn"),
  junctionBackBtn: document.getElementById("junction-back-btn"),
  junctionStepChooser: document.getElementById("junction-step-chooser"),
  junctionStepConfig: document.getElementById("junction-step-config"),
  junctionCustomSize: document.getElementById("junction-custom-size"),
  junctionSelectedSummary: document.getElementById("junction-selected-summary"),
  addDeviceBtn: document.getElementById("add-device-btn"),
  drawWiresBtn: document.getElementById("draw-wires-btn"),
  clearWiresBtn: document.getElementById("clear-wires-btn"),
  wireConfigPopover: document.getElementById("wire-config-popover"),
  wireCircuitSelect: document.getElementById("wire-circuit-select"),
  wireColorSelect: document.getElementById("wire-color-select"),
  wireStartBtn: document.getElementById("wire-start-btn"),
  wireCancelBtn: document.getElementById("wire-cancel-btn"),
  boxWidth: document.getElementById("box-width"),
  boxHeight: document.getElementById("box-height"),
  deviceSelect: document.getElementById("device-select"),
  plannerTabs: Array.from(document.querySelectorAll(".tab-btn[data-tab]")),
  plannerPanels: Array.from(document.querySelectorAll(".tab-panel[data-tab-panel]")),
  shellyDeviceList: document.getElementById("shelly-device-list"),
  wiringDeviceList: document.getElementById("wiring-device-list"),
  sourceBox: document.getElementById("source-box"),
  targetDevice: document.getElementById("target-device"),
};

const BASE_WIRE_COLOR_OPTIONS = Array.from(el.wireColorSelect.options).map((opt) => ({
  value: opt.value,
  label: opt.textContent || opt.value,
}));

function getPixelsPerInch() {
  return state.basePixelsPerInch * state.zoom;
}

function inchesToPixels(value) {
  return value * getPixelsPerInch();
}

function pixelsToInches(value) {
  return value / getPixelsPerInch();
}

async function loadDevices() {
  const res = await fetch("/api/devices");
  const payload = await res.json();
  state.devices = payload.devices;

  if (el.deviceSelect) {
    el.deviceSelect.innerHTML = "";
    for (const device of state.devices) {
      const option = document.createElement("option");
      option.value = device.slug;
      option.textContent = device.name;
      el.deviceSelect.appendChild(option);
    }
  }

  renderShellyDeviceList();
}

async function loadWiringDevices() {
  const res = await fetch("/api/wiring-devices");
  const payload = await res.json();
  state.wiringDevices = payload.wiring_devices || [];
  renderWiringDeviceList();
}

function activatePlannerTab(tabKey) {
  state.activePlannerTab = tabKey;
  for (const tab of el.plannerTabs) {
    const active = tab.dataset.tab === tabKey;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const panel of el.plannerPanels) {
    const active = panel.dataset.tabPanel === tabKey;
    panel.classList.toggle("active", active);
    panel.setAttribute("aria-hidden", active ? "false" : "true");
  }
  debouncedSaveSession();
}

function getDeviceDimensionsText(profile) {
  const dims = profile.dimensions?.planner_inches || {};
  const width = Number(dims.width) || Number(profile.width_cells || 0);
  const height = Number(dims.height) || Number(profile.height_cells || 0);
  if (!width || !height) {
    return "Dimensions unavailable";
  }
  return `${width} x ${height} in`;
}

function renderShellyDeviceList() {
  if (!el.shellyDeviceList) {
    return;
  }

  el.shellyDeviceList.innerHTML = "";
  if (!state.devices.length) {
    el.shellyDeviceList.innerHTML = "<p class=\"small\">No Shelly devices found yet.</p>";
    return;
  }

  for (const device of state.devices) {
    const entry = document.createElement("article");
    entry.className = "shelly-device-entry";

    const head = document.createElement("div");
    head.className = "shelly-device-head";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "shelly-device-toggle";
    toggle.innerHTML = `
      <span class="device-name">${device.name}</span>
      <span class="device-meta">${getDeviceDimensionsText(device)}</span>
    `;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "shelly-device-add";
    addBtn.textContent = "+";
    addBtn.title = `Add ${device.name}`;
    addBtn.setAttribute("aria-label", `Add ${device.name}`);

    const body = document.createElement("div");
    body.className = "shelly-device-body";
    const notes = device.notes || "No additional description available.";
    const terminalCount = Array.isArray(device.terminals) ? device.terminals.length : 0;
    body.innerHTML = `
      <p>${notes}</p>
      <ul class="shelly-device-specs">
        <li>Slug: ${device.slug}</li>
        <li>Terminals: ${terminalCount}</li>
      </ul>
    `;

    toggle.addEventListener("click", () => {
      entry.classList.toggle("expanded");
    });

    addBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      addDevice(device.slug);
    });

    head.appendChild(toggle);
    head.appendChild(addBtn);
    entry.appendChild(head);
    entry.appendChild(body);
    el.shellyDeviceList.appendChild(entry);
  }
}

function wiringLocationsToMap(profile) {
  const map = {};
  if (!Array.isArray(profile.terminal_locations)) {
    return map;
  }

  for (const terminal of profile.terminal_locations) {
    const key = String(terminal?.key || "").trim();
    const x = Number(terminal?.x);
    const y = Number(terminal?.y);
    if (!key || !Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    map[key] = { x, y };
  }

  return map;
}

function renderWiringDeviceList() {
  if (!el.wiringDeviceList) {
    return;
  }

  el.wiringDeviceList.innerHTML = "";
  if (!state.wiringDevices.length) {
    el.wiringDeviceList.innerHTML = "<p class=\"small\">No wiring devices found yet.</p>";
    return;
  }

  for (const device of state.wiringDevices) {
    const entry = document.createElement("article");
    entry.className = "shelly-device-entry";

    const head = document.createElement("div");
    head.className = "shelly-device-head";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "shelly-device-toggle";
    toggle.innerHTML = `
      <span class="device-name">${device.name}</span>
      <span class="device-meta">${getDeviceDimensionsText(device)} | ${device.device_type || "Wiring"}</span>
    `;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "shelly-device-add";
    addBtn.textContent = "+";
    addBtn.title = `Add ${device.name}`;
    addBtn.setAttribute("aria-label", `Add ${device.name}`);

    const body = document.createElement("div");
    body.className = "shelly-device-body";
    const notes = device.description || device.notes || "No additional description available.";
    const terminalCount = Array.isArray(device.terminal_locations) ? device.terminal_locations.length : 0;
    body.innerHTML = `
      <p>${notes}</p>
      <ul class="shelly-device-specs">
        <li>Slug: ${device.slug}</li>
        <li>Type: ${device.device_type || "Wiring"}</li>
        <li>Terminals: ${terminalCount}</li>
      </ul>
    `;

    toggle.addEventListener("click", () => {
      entry.classList.toggle("expanded");
    });

    addBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      addWiringDevice(device.slug);
    });

    head.appendChild(toggle);
    head.appendChild(addBtn);
    entry.appendChild(head);
    entry.appendChild(body);
    el.wiringDeviceList.appendChild(entry);
  }
}

async function loadConnectors() {
  const res = await fetch("/api/connectors");
  const payload = await res.json();
  state.connectors = payload.connectors || [];

  el.addonType.innerHTML = "";
  for (const connector of state.connectors) {
    const option = document.createElement("option");
    option.value = connector.slug;
    option.textContent = connector.name;
    el.addonType.appendChild(option);
  }

  el.addAddonBtn.disabled = state.connectors.length === 0;
}

async function loadJunctionBoxes() {
  const res = await fetch("/api/junction-boxes");
  const payload = await res.json();
  state.junctionBoxes = payload.junction_boxes || [];
}

function getCreatedJunctionProfiles() {
  return state.junctionBoxes.filter((profile) => profile.is_generated === true);
}

function getMatchingCreatedProfiles() {
  const type = el.junctionType.value;
  const environment = el.junctionEnvironment.value;
  if (!type || !environment) {
    return [];
  }

  return getCreatedJunctionProfiles().filter((profile) => (
    profile.box_type === type && profile.environment === environment
  ));
}

function populateGangOptions() {
  const matchingProfiles = getMatchingCreatedProfiles();
  const uniqueGangs = Array.from(new Set(matchingProfiles.map((profile) => profile.gang))).sort();
  const previousValue = el.junctionGang.value;

  el.junctionGang.innerHTML = "";
  if (!el.junctionType.value || !el.junctionEnvironment.value) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Choose gang...";
    el.junctionGang.appendChild(opt);
    el.junctionGang.value = "";
    el.junctionGang.disabled = true;
    el.junctionNextBtn.disabled = true;
    return;
  }

  if (!uniqueGangs.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "None Available - Create one";
    el.junctionGang.appendChild(opt);
    el.junctionGang.value = "";
    el.junctionGang.disabled = true;
    el.junctionNextBtn.disabled = true;
    return;
  }

  for (const gang of uniqueGangs) {
    const opt = document.createElement("option");
    opt.value = gang;
    opt.textContent = gang;
    el.junctionGang.appendChild(opt);
  }

  el.junctionGang.disabled = false;
  el.junctionGang.value = uniqueGangs.includes(previousValue) ? previousValue : uniqueGangs[0];
  el.junctionNextBtn.disabled = false;
}

function getSelectedJunctionProfile() {
  const matches = getMatchingCreatedProfiles().filter((profile) => (
    profile.box_type === el.junctionType.value
    && profile.environment === el.junctionEnvironment.value
    && profile.gang === el.junctionGang.value
  ));

  // Prefer the most recently created profile when multiple entries share the same type/env/gang.
  return matches.length ? matches[matches.length - 1] : null;
}

function resetJunctionChooser() {
  state.selectedJunctionProfile = null;
  el.junctionType.value = "";
  el.junctionEnvironment.value = "";
  el.junctionGang.value = "";
  populateGangOptions();
  el.junctionStepChooser.classList.remove("hidden");
  el.junctionStepConfig.classList.add("hidden");
  el.junctionCustomSize.classList.add("hidden");
  el.junctionSelectedSummary.textContent = "";
}

function goToJunctionConfigStep() {
  const profile = getSelectedJunctionProfile();
  if (!profile) {
    alert("No created junction box is available for that type and environment. Use Add New Junction Box first.");
    return;
  }

  state.selectedJunctionProfile = profile;
  el.junctionStepChooser.classList.add("hidden");
  el.junctionStepConfig.classList.remove("hidden");
  el.junctionSelectedSummary.textContent = `${profile.name} | max circuits: ${profile.max_circuits}`;

  const plannerDims = profile.dimensions?.planner_inches || {};
  el.boxWidth.value = String(Number(plannerDims.width) || 12);
  el.boxHeight.value = String(Number(plannerDims.height) || 12);
  el.junctionCustomSize.classList.toggle("hidden", !profile.supports_custom_size);

  const knockoutCount = Array.isArray(profile.knockout_locations)
    ? profile.knockout_locations.length
    : 0;
  const autoCircuits = Math.max(1, knockoutCount);
  el.junctionSelectedSummary.textContent = `${profile.name} | knock-outs: ${knockoutCount} | auto circuits: ${autoCircuits}`;
}

function createItemAtPosition({ type, name, width, height, meta, x, y }) {
  const item = {
    id: `item-${state.nextId++}`,
    type,
    name,
    x: clamp(x, 0, Math.max(0, state.workspaceWidthIn - width)),
    y: clamp(y, 0, Math.max(0, state.workspaceHeightIn - height)),
    width,
    height,
    meta,
  };

  state.items.push(item);

  if ((type === "device" || type === "connector") && meta?.imagePath) {
    syncDeviceWidthToImage(item);
  }

  renderItems();
  syncSelectionOptions();
  debouncedSaveSession();
}

function beginItemPlacement(draft) {
  if (state.pendingWire) {
    cancelPendingWire();
  }
  closeWireSourcePopover();

  state.pendingPlacement = {
    ...draft,
    x: state.workspaceWidthIn / 2,
    y: state.workspaceHeightIn / 2,
  };
  updatePlacementPreviewPosition();
  renderItems();
}

function cancelPendingPlacement() {
  if (!state.pendingPlacement) {
    return;
  }
  state.pendingPlacement = null;
  renderItems();
}

function updatePlacementPreviewPosition(ev) {
  if (!state.pendingPlacement) {
    return;
  }

  let pointer;
  if (ev) {
    pointer = getPointerInches(ev);
  } else {
    const rect = el.workspaceViewport.getBoundingClientRect();
    pointer = {
      x: pixelsToInches(el.workspaceViewport.scrollLeft + rect.width / 2),
      y: pixelsToInches(el.workspaceViewport.scrollTop + rect.height / 2),
    };
  }

  const cursorOffsetXIn = pixelsToInches(14);
  state.pendingPlacement.x = clamp(
    pointer.x + cursorOffsetXIn,
    0,
    Math.max(0, state.workspaceWidthIn - state.pendingPlacement.width),
  );
  state.pendingPlacement.y = clamp(
    pointer.y - state.pendingPlacement.height / 2,
    0,
    Math.max(0, state.workspaceHeightIn - state.pendingPlacement.height),
  );
}

function syncPlacementPreviewNode() {
  if (!state.pendingPlacement) {
    return;
  }

  const preview = el.workspace.querySelector(".item.placement-preview");
  if (!preview) {
    return;
  }

  preview.style.left = `${inchesToPixels(state.pendingPlacement.x)}px`;
  preview.style.top = `${inchesToPixels(state.pendingPlacement.y)}px`;
  preview.style.width = `${inchesToPixels(state.pendingPlacement.width)}px`;
  preview.style.height = `${inchesToPixels(state.pendingPlacement.height)}px`;
}

function placePendingItem(ev) {
  if (!state.pendingPlacement) {
    return;
  }

  updatePlacementPreviewPosition(ev);
  const draft = state.pendingPlacement;
  state.pendingPlacement = null;
  createItemAtPosition({
    type: draft.type,
    name: draft.name,
    width: draft.width,
    height: draft.height,
    meta: draft.meta,
    x: draft.x,
    y: draft.y,
  });
}

function hasConnectedWires(itemId) {
  return state.wiringLinks.some((link) => link.sourceId === itemId || link.targetId === itemId);
}

function isItemMovementLocked(item) {
  if (!item) {
    return false;
  }
  if (item.type !== "device" && item.type !== "pvc") {
    return false;
  }
  return hasConnectedWires(item.id);
}

function syncDeviceWidthToImage(item, options = {}) {
  const preserveWidth = Boolean(options.preserveWidth);
  const probe = new Image();
  probe.addEventListener("load", () => {
    if (!probe.naturalWidth || !probe.naturalHeight) {
      return;
    }

    const aspectRatio = probe.naturalWidth / probe.naturalHeight;
    const targetWidthIn = Math.max(0.6, item.height * aspectRatio);
    const hasImageRefSize = Number(item.meta?.imageReferenceSize?.width) > 0
      && Number(item.meta?.imageReferenceSize?.height) > 0;
    const hasTerminalRefSize = Number(item.meta?.terminalReferenceSize?.width) > 0
      && Number(item.meta?.terminalReferenceSize?.height) > 0;

    if (!preserveWidth) {
      item.width = targetWidthIn;
    }
    item.meta = {
      ...item.meta,
      imageAspectRatio: aspectRatio,
      imageReferenceSize: hasImageRefSize
        ? item.meta.imageReferenceSize
        : { width: probe.naturalWidth, height: probe.naturalHeight },
      terminalReferenceSize: hasTerminalRefSize
        ? item.meta.terminalReferenceSize
        : { width: probe.naturalWidth, height: probe.naturalHeight },
    };

    if (item.meta?.mountedIn) {
      const host = state.items.find((entry) => entry.id === item.meta.mountedIn);
      if (host) {
        item.x = clamp(item.x, host.x, host.x + host.width - item.width);
        item.y = clamp(item.y, host.y, host.y + host.height - item.height);
      }
    } else if (!preserveWidth) {
      item.x = clamp(item.x, 0, state.workspaceWidthIn - item.width);
    }

    renderItems();
  }, { once: true });
  probe.src = item.meta.imagePath;
}

function hydrateImageReferenceSizesForSessionItems() {
  for (const item of state.items) {
    if (item.type !== "device" && item.type !== "connector") {
      continue;
    }
    if (!item.meta?.imagePath) {
      continue;
    }

    const hasImageRefSize = Number(item.meta?.imageReferenceSize?.width) > 0
      && Number(item.meta?.imageReferenceSize?.height) > 0;
    const hasTerminalRefSize = Number(item.meta?.terminalReferenceSize?.width) > 0
      && Number(item.meta?.terminalReferenceSize?.height) > 0;
    if (hasImageRefSize && hasTerminalRefSize) {
      continue;
    }

    syncDeviceWidthToImage(item, { preserveWidth: true });
  }
}

function terminalHasWire(itemId, terminalKey) {
  return state.wiringLinks.some((link) => {
    const src = link.sourceAnchor;
    const dst = link.targetAnchor;
    const srcHit = src?.kind === "device-terminal" && src.itemId === itemId && src.key === terminalKey;
    const dstHit = dst?.kind === "device-terminal" && dst.itemId === itemId && dst.key === terminalKey;
    return srcHit || dstHit;
  });
}

function connectorPortHasWire(itemId, portKey) {
  return state.wiringLinks.some((link) => {
    const src = link.sourceAnchor;
    const dst = link.targetAnchor;
    const srcHit = src?.kind === "connector-port" && src.itemId === itemId && src.key === portKey;
    const dstHit = dst?.kind === "connector-port" && dst.itemId === itemId && dst.key === portKey;
    return srcHit || dstHit;
  });
}

function knockoutHasWire(itemId, dotX, dotY) {
  return state.wiringLinks.some((link) => {
    const src = link.sourceAnchor;
    const dst = link.targetAnchor;
    const srcHit = src?.kind === "pvc-dot" && src.itemId === itemId && src.x === dotX && src.y === dotY;
    const dstHit = dst?.kind === "pvc-dot" && dst.itemId === itemId && dst.x === dotX && dst.y === dotY;
    return srcHit || dstHit;
  });
}

function isPvcDotAnchorMatch(anchor, itemId, dotX, dotY) {
  return anchor?.kind === "pvc-dot"
    && anchor.itemId === itemId
    && Number(anchor.x) === Number(dotX)
    && Number(anchor.y) === Number(dotY);
}

function getPvcNodeLinks(itemId, dotX, dotY) {
  return state.wiringLinks.filter((link) => (
    isPvcDotAnchorMatch(link.sourceAnchor, itemId, dotX, dotY)
    || isPvcDotAnchorMatch(link.targetAnchor, itemId, dotX, dotY)
  ));
}

function getNodeCircuitCapacity(item) {
  if (isStrictPvcBox(item)) {
    const knockoutCount = Array.isArray(item?.meta?.knockoutLocations)
      ? item.meta.knockoutLocations.length
      : 0;
    const configured = Math.max(
      knockoutCount,
      Number(item?.meta?.circuitsOut) || 0,
      Number(item?.meta?.circuits) || 0,
    );
    return Math.max(1, configured);
  }
  return 1;
}

function getFullCircuitCountAtPvcNode(itemId, dotX, dotY) {
  const byCircuit = new Map();

  for (const link of getPvcNodeLinks(itemId, dotX, dotY)) {
    const circuit = Number(link.circuitIndex) || 1;
    if (!byCircuit.has(circuit)) {
      byCircuit.set(circuit, new Set());
    }
    byCircuit.get(circuit).add(link.conductor);
  }

  let fullCount = 0;
  for (const conductors of byCircuit.values()) {
    // A complete US branch circuit at this node requires hot + neutral + ground.
    if (conductors.has("hot") && conductors.has("neutral") && conductors.has("ground")) {
      fullCount += 1;
    }
  }

  return fullCount;
}

function isPvcNodeAtCapacity(item, dotX, dotY) {
  const capacity = getNodeCircuitCapacity(item);
  const fullCircuits = getFullCircuitCountAtPvcNode(item.id, dotX, dotY);
  return fullCircuits >= capacity;
}

function deviceHasOpenTerminal(deviceItem) {
  const terminalKeys = Object.keys(deviceItem.meta?.terminalLocations || {});
  if (!terminalKeys.length) {
    return false;
  }

  return terminalKeys.some((key) => !terminalHasWire(deviceItem.id, key));
}

function isStrictPvcBox(item) {
  return item?.type === "pvc" && (item.meta?.boxType || "").toLowerCase() === "pvc";
}

function shouldShowDeviceTerminals(deviceItem) {
  return state.selectedItemId === deviceItem.id || Boolean(state.pendingWire);
}

function renderItems() {
  const existing = Array.from(el.workspace.querySelectorAll(".item"));
  existing.forEach((node) => node.remove());

  for (const item of state.items) {
    const node = document.createElement("div");
    node.className = `item ${item.type}`;
    if (state.selectedItemId === item.id) {
      node.classList.add("selected");
    }
    node.dataset.itemId = item.id;
    node.style.left = `${inchesToPixels(item.x)}px`;
    node.style.top = `${inchesToPixels(item.y)}px`;
    node.style.width = `${inchesToPixels(item.width)}px`;
    node.style.height = `${inchesToPixels(item.height)}px`;

    let details = "";
    if (item.type === "pvc") {
      details = `${item.meta.boxType} ${item.meta.environment} ${item.meta.gang} | ${item.meta.widthIn}x${item.meta.heightIn} in | in: ${item.meta.circuits} | out: ${item.meta.circuitsOut}`;
    } else if (item.type === "connector") {
      details = `${item.meta.connectorType} | ports: ${item.meta.ports}`;
    } else {
      details = `${item.meta.widthIn ?? item.width}x${item.meta.heightIn ?? item.height} in | ${item.meta.slug}`;
    }
    if (item.meta?.mountedIn) {
      details = `${details} | mounted: ${item.meta.mountedIn}`;
    }

    if (item.type === "device") {
      const isSelected = state.selectedItemId === item.id;
      const showInfo = state.altInfoItemId === item.id;
      const showTerminals = shouldShowDeviceTerminals(item);
      const boxWidth = inchesToPixels(item.width);
      const boxHeight = inchesToPixels(item.height);
      const canvasHeight = Math.max(1, boxHeight);
      const imageRefSize = getImageReferenceSize(item, boxWidth, canvasHeight);
      const terminalScale = getTerminalScale(item.meta.terminalLocations || {}, item.meta.terminalReferenceSize);
      const containFrame = getContainFrame(boxWidth, canvasHeight, imageRefSize.width, imageRefSize.height);
      const terminalEntries = Object.entries(item.meta.terminalLocations || {})
        .map(([key, pos]) => {
          const normalized = normalizeTerminalPosition(pos, terminalScale);
          if (!normalized) {
            return null;
          }
          const distances = {
            top: normalized.y,
            right: 1 - normalized.x,
            bottom: 1 - normalized.y,
            left: normalized.x,
          };
          const side = Object.entries(distances).reduce((closest, current) => {
            if (current[1] < closest[1]) {
              return current;
            }
            return closest;
          })[0];

          return { key, normalized, side };
        })
        .filter(Boolean);

      const buckets = {
        top: [],
        right: [],
        bottom: [],
        left: [],
      };

      for (const entry of terminalEntries) {
        buckets[entry.side].push(entry);
      }

      const bucketSlotByKey = new Map();
      const railPositionByKey = new Map();
      const minRailGap = Math.max(14, Math.min(24, Math.min(containFrame.width, containFrame.height) * 0.06));
      const sortTopBottom = (a, b) => a.normalized.x - b.normalized.x;
      const sortLeftRight = (a, b) => a.normalized.y - b.normalized.y;

      const assignRailPositions = (side, axisLength) => {
        const entries = buckets[side];
        const midpoint = axisLength / 2;
        entries.forEach((entry, slot) => {
          const rank = slot - (entries.length - 1) / 2;
          railPositionByKey.set(entry.key, midpoint + rank * minRailGap);
          bucketSlotByKey.set(entry.key, { side, slot, count: entries.length });
        });
      };

      ["top", "bottom"].forEach((side) => {
        buckets[side].sort(sortTopBottom);
        assignRailPositions(side, containFrame.width);
      });

      ["left", "right"].forEach((side) => {
        buckets[side].sort(sortLeftRight);
        assignRailPositions(side, containFrame.height);
      });

      const markers = terminalEntries
        .map((entry) => {
          const { key, normalized } = entry;
          const displayLabel = item.meta.terminalDisplayLabels?.[key] ?? key;
          const x = Math.max(0, Math.min(100, normalized.x * 100));
          const y = Math.max(0, Math.min(100, normalized.y * 100));
          const centerX = normalized.x * containFrame.width;
          const centerY = normalized.y * containFrame.height;
          const slotMeta = bucketSlotByKey.get(key) || { side: "right", slot: 0, count: 1 };
          const sideOffsetX = Math.max(42, Math.min(76, containFrame.width * 0.22));
          const sideOffsetY = Math.max(28, Math.min(56, containFrame.height * 0.12));

          let badgeX = centerX;
          let badgeY = centerY;
          if (slotMeta.side === "left" || slotMeta.side === "right") {
            badgeY = railPositionByKey.get(key) ?? centerY;
            badgeX = slotMeta.side === "right" ? containFrame.width + sideOffsetX : -sideOffsetX;
          } else {
            badgeX = railPositionByKey.get(key) ?? centerX;
            badgeY = slotMeta.side === "bottom" ? containFrame.height + sideOffsetY : -sideOffsetY;
          }

          badgeX = Math.max(-88, Math.min(containFrame.width + 88, badgeX));
          badgeY = Math.max(-88, Math.min(containFrame.height + 88, badgeY));

          const dx = badgeX - centerX;
          const dy = badgeY - centerY;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const used = terminalHasWire(item.id, key);
          const availability = used ? "unavailable" : "available";
          const anchorClass = `terminal-anchor ${availability}`;
          return `
            <button type="button" class="terminal-marker terminal-origin ${anchorClass}" data-terminal-key="${key}" data-terminal-available="${used ? "false" : "true"}" style="left:${x}%;top:${y}%;" title="${key} anchor" aria-label="${key} anchor"></button>
            <span class="terminal-leader ${availability}" style="left:${centerX}px;top:${centerY}px;width:${Math.hypot(dx, dy)}px;transform:rotate(${angle}deg);"></span>
            <button type="button" class="terminal-badge ${anchorClass}" data-terminal-key="${key}" data-terminal-available="${used ? "false" : "true"}" style="left:${badgeX}px;top:${badgeY}px;" title="${key}">${displayLabel}</button>
          `;
        })
        .join("");

      const image = item.meta.imagePath
        ? `<img class="device-image" src="${item.meta.imagePath}" alt="${item.name}" draggable="false" />`
        : "";

      node.innerHTML = `
        <div class="device-canvas">
          ${image}
          <div class="terminal-layer" style="left:${containFrame.x}px;top:${containFrame.y}px;width:${containFrame.width}px;height:${containFrame.height}px;">
            ${markers}
          </div>
        </div>
        <div class="item-caption device-info ${showInfo ? "" : "hidden"}">
          <strong>${item.name}</strong>
          <span>${details}</span>
        </div>
      `;
      if (showTerminals) {
        node.classList.add("show-terminals");
      }
    } else {
      const showNonDeviceInfo = state.altInfoItemId === item.id;
      const connectorBoxWidth = inchesToPixels(item.width);
      const connectorBoxHeight = inchesToPixels(item.height);
      const connectorRefSize = item.type === "connector"
        ? {
          width: Number(item.meta?.portReferenceSize?.width) || Math.max(1, connectorBoxWidth),
          height: Number(item.meta?.portReferenceSize?.height) || Math.max(1, connectorBoxHeight),
        }
        : null;
      const connectorFrame = item.type === "connector"
        ? getContainFrame(connectorBoxWidth, connectorBoxHeight, connectorRefSize.width, connectorRefSize.height)
        : null;
      node.innerHTML = `
        ${item.type === "pvc" && item.meta?.imagePath ? `<img class="pvc-image" src="${item.meta.imagePath}" alt="${item.name}" draggable="false" />` : ""}
        ${item.type === "connector" && item.meta?.imagePath ? `<img class="connector-image" src="${item.meta.imagePath}" alt="${item.name}" draggable="false" />` : ""}
        <div class="item-caption${showNonDeviceInfo ? "" : " hidden"}">
          <strong>${item.name}</strong>
          <span>${details}</span>
        </div>
      `;

      if (item.type === "connector") {
        const showConnectorPorts = state.selectedItemId === item.id || Boolean(state.pendingWire);
        const ports = item.meta.portPositions || [];
        const portScale = getConnectorPortScale(ports, item.meta.portReferenceSize);
        const portHtml = ports
          .map((port) => {
            const normalized = normalizeConnectorPortPosition(port, portScale);
            if (!normalized) {
              return "";
            }
            const used = connectorPortHasWire(item.id, port.key);
            const availability = used ? "unavailable" : "available";
            return `<button type="button" class="connector-port ${availability}" data-port-key="${port.key}" data-port-available="${used ? "false" : "true"}" style="left:${normalized.x * 100}%;top:${normalized.y * 100}%;" title="${port.key}"></button>`;
          })
          .join("");
        node.insertAdjacentHTML("beforeend", `<div class="connector-layer" style="left:${connectorFrame.x}px;top:${connectorFrame.y}px;width:${connectorFrame.width}px;height:${connectorFrame.height}px;">${portHtml}</div>`);
        const badgeHtml = ports
          .map((port) => {
            const used = connectorPortHasWire(item.id, port.key);
            const availability = used ? "unavailable" : "available";
            return `<button type="button" class="connector-badge connector-port-badge ${availability}" data-port-key="${port.key}" data-port-available="${used ? "false" : "true"}" title="${port.key}">${port.key}</button>`;
          })
          .join("");
        node.insertAdjacentHTML("beforeend", `<div class="connector-badge-row">${badgeHtml}</div>`);
        if (showConnectorPorts) {
          node.classList.add("show-connectors");
        }
      }

      if (item.type === "pvc") {
        const KO_OFFSET = 32;
        const showKoLabels = state.selectedItemId === item.id;
        const koHtml = getPvcPerimeterDots(item).map((dot) => {
          const cx = inchesToPixels(dot.x);
          const cy = inchesToPixels(dot.y);
          let bx = cx;
          let by = cy;
          if (dot.side === "top") by = cy - KO_OFFSET;
          else if (dot.side === "bottom") by = cy + KO_OFFSET;
          else if (dot.side === "left") bx = cx - KO_OFFSET;
          else bx = cx + KO_OFFSET;
          const dx = bx - cx;
          const dy = by - cy;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const len = Math.hypot(dx, dy);
          const full = isPvcNodeAtCapacity(item, dot.x, dot.y);
          const avail = full ? "unavailable" : "available";
          const badgeHtml = showKoLabels
            ? `<button type="button" class="ko-badge ${avail}" data-dot-x="${dot.x}" data-dot-y="${dot.y}" style="left:${bx}px;top:${by}px;">${dot.label}</button>`
            : "";
          return `
            <button type="button" class="ko-anchor ${avail}" data-dot-x="${dot.x}" data-dot-y="${dot.y}" title="${dot.label}" style="left:${cx}px;top:${cy}px;"></button>
            <span class="ko-leader ${avail}" style="left:${cx}px;top:${cy}px;width:${len}px;transform:rotate(${angle}deg);"></span>
            ${badgeHtml}
          `;
        }).join("");
        node.insertAdjacentHTML("beforeend", `<div class="ko-layer">${koHtml}</div>`);
      }
    }

    node.addEventListener("click", (ev) => {
      if (state.pendingPlacement) {
        ev.stopPropagation();
        return;
      }
      ev.stopPropagation();
      if (state.pendingWire) {
        addPendingWireWaypoint(getPointerInches(ev));
        return;
      }
      if (ev.altKey) {
        ev.preventDefault();
        state.altInfoItemId = state.altInfoItemId === item.id ? null : item.id;
        renderItems();
        return;
      }
      selectItem(item.id);
    });

    if (item.type === "pvc") {
      for (const dot of node.querySelectorAll(".ko-anchor, .ko-badge")) {
        dot.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const dotX = Number(dot.dataset.dotX);
          const dotY = Number(dot.dataset.dotY);
          if (isPvcNodeAtCapacity(item, dotX, dotY)) {
            return;
          }
          if (state.pendingWire) {
            completePendingWire({
              kind: "pvc-dot",
              itemId: item.id,
              x: dotX,
              y: dotY,
              terminal: `${dot.dataset.dotX},${dot.dataset.dotY}`,
            });
            return;
          }
          openWireSourcePopover(
            { kind: "pvc-dot", itemId: item.id, x: dotX, y: dotY },
            Math.max(1, item.meta.circuits || 1),
            ev.clientX,
            ev.clientY,
          );
        });
      }
    }

    if (item.type === "connector") {
      for (const port of node.querySelectorAll(".connector-port, .connector-badge")) {
        port.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (port.dataset.portAvailable !== "true") {
            return;
          }
          if (state.pendingWire) {
            completePendingWire({
              kind: "connector-port",
              itemId: item.id,
              key: port.dataset.portKey,
              xIn: getPointerInches(ev).x,
              yIn: getPointerInches(ev).y,
              terminal: port.dataset.portKey,
            });
            return;
          }
          openWireSourcePopover(
            { kind: "connector-port", itemId: item.id, key: port.dataset.portKey },
            1,
            ev.clientX,
            ev.clientY,
          );
        });
      }
    }

    if (item.type === "device") {
      for (const marker of node.querySelectorAll(".terminal-anchor, .terminal-badge")) {
        marker.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (marker.dataset.terminalAvailable !== "true") {
            return;
          }
          if (state.pendingWire) {
            completePendingWire({
              kind: "device-terminal",
              itemId: item.id,
              key: marker.dataset.terminalKey,
              xIn: getPointerInches(ev).x,
              yIn: getPointerInches(ev).y,
              terminal: marker.dataset.terminalKey,
            });
            return;
          }
          openWireSourcePopover({ kind: "device-terminal", itemId: item.id, key: marker.dataset.terminalKey }, 1, ev.clientX, ev.clientY);
        });
      }
    }

    makeDraggable(node, item.id);
    el.workspace.appendChild(node);
  }

  if (state.pendingPlacement) {
    const preview = document.createElement("div");
    preview.className = `item placement-preview ${state.pendingPlacement.type}`;
    preview.style.left = `${inchesToPixels(state.pendingPlacement.x)}px`;
    preview.style.top = `${inchesToPixels(state.pendingPlacement.y)}px`;
    preview.style.width = `${inchesToPixels(state.pendingPlacement.width)}px`;
    preview.style.height = `${inchesToPixels(state.pendingPlacement.height)}px`;

    if (state.pendingPlacement.type === "device" && state.pendingPlacement.meta?.imagePath) {
      preview.innerHTML = `<img class="device-image" src="${state.pendingPlacement.meta.imagePath}" alt="${state.pendingPlacement.name}" draggable="false" />`;
    } else if (state.pendingPlacement.type === "connector" && state.pendingPlacement.meta?.imagePath) {
      preview.innerHTML = `<img class="connector-image" src="${state.pendingPlacement.meta.imagePath}" alt="${state.pendingPlacement.name}" draggable="false" />`;
    } else if (state.pendingPlacement.type === "pvc" && state.pendingPlacement.meta?.imagePath) {
      preview.innerHTML = `<img class="pvc-image" src="${state.pendingPlacement.meta.imagePath}" alt="${state.pendingPlacement.name}" draggable="false" />`;
    } else {
      preview.textContent = state.pendingPlacement.name;
    }

    el.workspace.appendChild(preview);
  }

  updateDeleteButtonState();
  updateWireModeUi();
  renderWires();
}

function getPvcPerimeterDots(item) {
  if (Array.isArray(item.meta?.knockoutLocations) && item.meta.knockoutLocations.length) {
    const refW = Number(item.meta.imageReferenceSize?.width) || 1;
    const refH = Number(item.meta.imageReferenceSize?.height) || 1;
    return item.meta.knockoutLocations
      .map((dot) => {
        const rawX = Number(dot.x);
        const rawY = Number(dot.y);
        // Normalize: if coords are > 1 they are absolute pixels, divide by reference size.
        const nx = rawX > 1 ? rawX / refW : rawX;
        const ny = rawY > 1 ? rawY / refH : rawY;
        const cx = Math.max(0, Math.min(1, nx));
        const cy = Math.max(0, Math.min(1, ny));
        // Determine closest edge for badge placement.
        const dists = { top: cy, bottom: 1 - cy, left: cx, right: 1 - cx };
        const side = Object.entries(dists).reduce((a, b) => (b[1] < a[1] ? b : a))[0];
        return { x: cx * item.width, y: cy * item.height, label: dot.key || "KO", side };
      })
      .filter((dot) => Number.isFinite(dot.x) && Number.isFinite(dot.y));
  }

  const dots = [];
  const seen = new Set();

  const pushDot = (x, y, label, side) => {
    const key = `${x.toFixed(3)}-${y.toFixed(3)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    dots.push({ x, y, label, side });
  };

  for (let x = 0; x <= item.width + 0.001; x += 1) {
    const dotX = Math.min(item.width, Number(x.toFixed(3)));
    pushDot(dotX, 0, `Top ${dotX.toFixed(0)}in`, "top");
    pushDot(dotX, item.height, `Bottom ${dotX.toFixed(0)}in`, "bottom");
  }

  for (let y = 0; y <= item.height + 0.001; y += 1) {
    const dotY = Math.min(item.height, Number(y.toFixed(3)));
    pushDot(0, dotY, `Left ${dotY.toFixed(0)}in`, "left");
    pushDot(item.width, dotY, `Right ${dotY.toFixed(0)}in`, "right");
  }

  return dots;
}

function getConnectorPortScale(portPositions, configuredScale) {
  const hasConfigured = Number(configuredScale?.width) > 0 && Number(configuredScale?.height) > 0;
  if (hasConfigured) {
    return {
      width: Number(configuredScale.width),
      height: Number(configuredScale.height),
    };
  }

  let maxX = 0;
  let maxY = 0;
  for (const pos of portPositions || []) {
    const x = Number(pos?.x);
    const y = Number(pos?.y);
    if (Number.isFinite(x)) {
      maxX = Math.max(maxX, x);
    }
    if (Number.isFinite(y)) {
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX > 1 || maxY > 1) {
    return { width: Math.max(maxX, 1), height: Math.max(maxY, 1) };
  }

  return { width: 1, height: 1 };
}

function normalizeConnectorPortPosition(pos, scale) {
  const x = Number(pos?.x);
  const y = Number(pos?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  if (x <= 1 && y <= 1) {
    return { x, y };
  }

  if (!scale || scale.width <= 0 || scale.height <= 0) {
    return null;
  }

  return {
    x: x / scale.width,
    y: y / scale.height,
  };
}

function anchorsMatch(a, b) {
  if (!a || !b || a.kind !== b.kind || a.itemId !== b.itemId) {
    return false;
  }

  if (a.kind === "pvc-dot") {
    return Number(a.x) === Number(b.x) && Number(a.y) === Number(b.y);
  }

  return String(a.key || "") === String(b.key || "");
}

function getUsedConductorsAtAnchor(anchor, circuitIndex) {
  const used = new Set();
  for (const link of state.wiringLinks) {
    if ((Number(link.circuitIndex) || 1) !== circuitIndex) {
      continue;
    }
    if (anchorsMatch(link.sourceAnchor, anchor) || anchorsMatch(link.targetAnchor, anchor)) {
      used.add(link.conductor);
    }
  }
  return used;
}

function refreshWireColorOptions() {
  if (!state.pendingWireSource?.anchor) {
    return;
  }

  const circuitIndex = Number(el.wireCircuitSelect.value) || 1;
  const used = getUsedConductorsAtAnchor(state.pendingWireSource.anchor, circuitIndex);
  const allowed = BASE_WIRE_COLOR_OPTIONS.filter((option) => !used.has(option.value));

  el.wireColorSelect.innerHTML = "";
  if (!allowed.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No colors available for this circuit";
    el.wireColorSelect.appendChild(opt);
    el.wireColorSelect.disabled = true;
    el.wireStartBtn.disabled = true;
    return;
  }

  for (const option of allowed) {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    el.wireColorSelect.appendChild(opt);
  }

  el.wireColorSelect.disabled = false;
  el.wireStartBtn.disabled = false;
}

function openWireSourcePopover(anchor, maxCircuits, clientX, clientY) {
  state.pendingWireSource = { anchor };

  el.wireCircuitSelect.innerHTML = "";
  for (let i = 1; i <= maxCircuits; i += 1) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Circuit ${i}`;
    el.wireCircuitSelect.appendChild(opt);
  }

  const firstCircuitWithAvailableColor = Array.from(el.wireCircuitSelect.options).find((opt) => {
    const circuitIndex = Number(opt.value) || 1;
    const used = getUsedConductorsAtAnchor(anchor, circuitIndex);
    return BASE_WIRE_COLOR_OPTIONS.some((entry) => !used.has(entry.value));
  });
  if (firstCircuitWithAvailableColor) {
    el.wireCircuitSelect.value = firstCircuitWithAvailableColor.value;
  }

  refreshWireColorOptions();

  el.wireConfigPopover.style.left = `${clientX + 12}px`;
  el.wireConfigPopover.style.top = `${clientY + 12}px`;
  el.wireConfigPopover.classList.remove("hidden");
}

function closeWireSourcePopover() {
  el.wireConfigPopover.classList.add("hidden");
  state.pendingWireSource = null;
}

function startManualWireFromPopover() {
  if (!state.pendingWireSource) {
    return;
  }

  const colorKey = el.wireColorSelect.value;
  if (!colorKey || !COLORS[colorKey]) {
    return;
  }
  const circuitIndex = Number(el.wireCircuitSelect.value) || 1;
  state.pendingWire = {
    sourceAnchor: state.pendingWireSource.anchor,
    circuitIndex,
    conductor: colorKey,
    color: COLORS[colorKey],
    waypoints: [],
  };

  closeWireSourcePopover();
  updateWireModeUi();
  renderItems();
}

function cancelPendingWire() {
  state.pendingWire = null;
  state.cursorIn = null;
  updateWireModeUi();
  renderItems();
}

function undoPendingWireWaypoint() {
  if (!state.pendingWire?.waypoints?.length) {
    return;
  }

  state.pendingWire.waypoints = state.pendingWire.waypoints.slice(0, -1);
  renderWires();
}

function updateWireModeUi() {
  const active = Boolean(state.pendingWire);
  el.workspace.classList.toggle("wiring-mode", active);

  if (active) {
    const label = COLOR_LABELS[state.pendingWire.conductor] || state.pendingWire.conductor;
    el.wireModeHint.textContent = `${label} wire active. Click the workspace to add waypoints, then click a connector port, Shelly terminal, or junction box knock-out.`;
    el.wireModeHint.classList.add("active");
  } else {
    el.wireModeHint.textContent = "Click a junction box knock-out, connector port, or device terminal to start a wire.";
    el.wireModeHint.classList.remove("active");
  }
}

function getPointerInches(ev) {
  const viewportRect = el.workspaceViewport.getBoundingClientRect();
  const localX = ev.clientX - viewportRect.left + el.workspaceViewport.scrollLeft;
  const localY = ev.clientY - viewportRect.top + el.workspaceViewport.scrollTop;
  return { x: pixelsToInches(localX), y: pixelsToInches(localY) };
}

function resolveAnchorPoint(anchor) {
  const item = state.items.find((entry) => entry.id === anchor.itemId);
  if (!item) {
    return null;
  }

  if (anchor.kind === "pvc-dot") {
    return {
      x: item.x + anchor.x,
      y: item.y + anchor.y,
    };
  }

  if (anchor.kind === "connector-port") {
    const port = (item.meta.portPositions || []).find((entry) => entry.key === anchor.key);
    if (!port) {
      return null;
    }
    const scale = getConnectorPortScale(item.meta.portPositions || [], item.meta.portReferenceSize);
    const normalized = normalizeConnectorPortPosition(port, scale);
    if (!normalized) {
      return null;
    }
    const boxWidth = inchesToPixels(item.width);
    const boxHeight = inchesToPixels(item.height);
    const refWidth = Number(item.meta.portReferenceSize?.width) || Math.max(1, boxWidth);
    const refHeight = Number(item.meta.portReferenceSize?.height) || Math.max(1, boxHeight);
    const frame = getContainFrame(boxWidth, boxHeight, refWidth, refHeight);
    return {
      x: item.x + pixelsToInches(frame.x + frame.width * normalized.x),
      y: item.y + pixelsToInches(frame.y + frame.height * normalized.y),
    };
  }

  if (anchor.kind === "device-terminal") {
    const loc = item.meta.terminalLocations?.[anchor.key];
    const scale = getTerminalScale(item.meta.terminalLocations || {}, item.meta.terminalReferenceSize);
    const normalized = normalizeTerminalPosition(loc, scale);
    if (!normalized) {
      return null;
    }

    return {
      x: item.x + item.width * normalized.x,
      y: item.y + item.height * normalized.y,
    };
  }

  return null;
}

function completePendingWire(target) {
  if (!state.pendingWire) {
    return;
  }

  if (
    target.kind === "device-terminal" &&
    state.pendingWire.sourceAnchor?.kind === "device-terminal" &&
    state.pendingWire.sourceAnchor.itemId === target.itemId &&
    state.pendingWire.sourceAnchor.key === target.key
  ) {
    return;
  }

  if (target.kind === "device-terminal" && terminalHasWire(target.itemId, target.key)) {
    return;
  }

  if (target.kind === "connector-port" && connectorPortHasWire(target.itemId, target.key)) {
    return;
  }

  const targetAnchor = {
    kind: target.kind,
    itemId: target.itemId,
    key: target.key,
    ...(target.x !== undefined ? { x: target.x, y: target.y } : {}),
  };

  state.wiringLinks.push({
    id: `wire-${state.nextId++}`,
    sourceAnchor: state.pendingWire.sourceAnchor,
    targetAnchor,
    waypoints: [...(state.pendingWire.waypoints || [])],
    sourceId: state.pendingWire.sourceAnchor.itemId,
    targetId: target.itemId,
    circuitIndex: state.pendingWire.circuitIndex,
    conductor: state.pendingWire.conductor,
    color: state.pendingWire.color,
    terminal: target.terminal,
  });

  state.pendingWire = null;
  state.cursorIn = null;
  updateWireModeUi();
  renderItems();
  debouncedSaveSession();
}

function addPendingWireWaypoint(pointIn) {
  if (!state.pendingWire) {
    return;
  }

  state.pendingWire.waypoints = [
    ...(state.pendingWire.waypoints || []),
    {
      x: pointIn.x,
      y: pointIn.y,
    },
  ];
  renderWires();
}

function getWireStrokeWidth(conductor) {
  return conductor === "ground" ? BASE_GROUND_WIRE_WIDTH : BASE_BLACK_WIRE_WIDTH;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getItemSignature(item) {
  const type = String(item?.type || "").trim();
  const slug = String(item?.meta?.slug || "").trim().toLowerCase();
  if (slug) {
    return `${type}:${slug}`;
  }
  const fallbackName = String(item?.name || "").trim().toLowerCase();
  return `${type}:name:${fallbackName}`;
}

function getUsedProfileSnapshot() {
  const usedSlugs = {
    device: new Set(),
    wiring: new Set(),
    junction: new Set(),
    connector: new Set(),
  };

  for (const item of state.items) {
    const slug = String(item?.meta?.slug || "").trim();
    if (!slug) {
      continue;
    }
    if (item.type === "device") {
      const foundWiring = state.wiringDevices.some((entry) => entry.slug === slug);
      if (foundWiring) {
        usedSlugs.wiring.add(slug);
      } else {
        usedSlugs.device.add(slug);
      }
    } else if (item.type === "pvc") {
      usedSlugs.junction.add(slug);
    } else if (item.type === "connector") {
      usedSlugs.connector.add(slug);
    }
  }

  return {
    devices: state.devices.filter((entry) => usedSlugs.device.has(entry.slug)).map((entry) => deepClone(entry)),
    wiringDevices: state.wiringDevices.filter((entry) => usedSlugs.wiring.has(entry.slug)).map((entry) => deepClone(entry)),
    junctionBoxes: state.junctionBoxes.filter((entry) => usedSlugs.junction.has(entry.slug)).map((entry) => deepClone(entry)),
    connectors: state.connectors.filter((entry) => usedSlugs.connector.has(entry.slug)).map((entry) => deepClone(entry)),
  };
}

function collectProjectImagePaths() {
  const paths = new Set();
  for (const item of state.items) {
    const path = String(item?.meta?.imagePath || "").trim();
    if (!path || path.startsWith("data:")) {
      continue;
    }
    paths.add(path);
  }
  return Array.from(paths);
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function buildProjectAssets() {
  const assets = {};
  const imagePaths = collectProjectImagePaths();
  for (const path of imagePaths) {
    try {
      const res = await fetch(path);
      if (!res.ok) {
        continue;
      }
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) {
        assets[path] = dataUrl;
      }
    } catch (_err) {
      // Ignore missing or inaccessible image paths during export.
    }
  }
  return assets;
}

function downloadJsonFile(fileName, payload) {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function exportProject() {
  if (!state.items.length) {
    alert("There are no placed items to export.");
    return;
  }

  const assets = await buildProjectAssets();
  const payload = {
    schemaVersion: 1,
    app: "shelly-planner",
    exportedAt: new Date().toISOString(),
    workspace: {
      widthIn: state.workspaceWidthIn,
      heightIn: state.workspaceHeightIn,
    },
    project: {
      items: deepClone(state.items),
      wiringLinks: deepClone(state.wiringLinks),
      nextId: state.nextId,
    },
    profileSnapshot: getUsedProfileSnapshot(),
    assets,
  };

  const stamp = new Date().toISOString().replace(/[.:]/g, "-");
  downloadJsonFile(`shelly-project-${stamp}.json`, payload);
}

function makeItemBoundsPx(item) {
  return {
    minX: inchesToPixels(item.x),
    minY: inchesToPixels(item.y),
    maxX: inchesToPixels(item.x + item.width),
    maxY: inchesToPixels(item.y + item.height),
  };
}

function mergeBounds(a, b) {
  if (!a) {
    return { ...b };
  }
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function getProjectContentBoundsPx() {
  let bounds = null;
  for (const item of state.items) {
    bounds = mergeBounds(bounds, makeItemBoundsPx(item));
  }

  for (const link of state.wiringLinks) {
    const points = buildWirePoints(link);
    if (!points?.length) {
      continue;
    }
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    bounds = mergeBounds(bounds, { minX, minY, maxX, maxY });
  }

  return bounds;
}

async function screenshotGrid() {
  if (!window.html2canvas) {
    alert("Screenshot library failed to load.");
    return;
  }

  if (!state.items.length && !state.wiringLinks.length) {
    alert("Nothing to capture yet. Add devices or wires to the grid first.");
    return;
  }

  const bounds = getProjectContentBoundsPx();
  if (!bounds) {
    alert("Unable to calculate screenshot area.");
    return;
  }

  const padding = 18;
  const x = Math.max(0, Math.floor(bounds.minX - padding));
  const y = Math.max(0, Math.floor(bounds.minY - padding));
  const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX + padding * 2));
  const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY + padding * 2));

  try {
    const canvas = await window.html2canvas(el.workspace, {
      backgroundColor: "#ffffff",
      x,
      y,
      width,
      height,
      useCORS: true,
      scale: 2,
      logging: false,
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        alert("Failed to build screenshot image.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shelly-grid-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch (_err) {
    alert("Unable to capture screenshot. Try again after images finish loading.");
  }
}

function clearGrid() {
  const shouldClear = window.confirm("Are you sure you want to wipe the grid clear of all devices?");
  if (!shouldClear) {
    return;
  }

  state.items = [];
  state.wiringLinks = [];
  state.selectedItemId = null;
  state.selectedWireId = null;
  state.altInfoItemId = null;
  state.pendingWire = null;
  state.pendingWireSource = null;
  state.pendingPlacement = null;
  closeWireSourcePopover();
  syncSelectionOptions();
  renderItems();
  renderWires();
  debouncedSaveSession();
}

function remapAnchorItemId(anchor, idMap) {
  if (!anchor) {
    return null;
  }
  if (!idMap.has(anchor.itemId)) {
    return null;
  }
  return {
    ...deepClone(anchor),
    itemId: idMap.get(anchor.itemId),
  };
}

function mergeProfilesBySlug(existing, incoming) {
  const next = Array.isArray(existing) ? [...existing] : [];
  const known = new Set(next.map((entry) => String(entry?.slug || "").trim()).filter(Boolean));
  for (const profile of Array.isArray(incoming) ? incoming : []) {
    const slug = String(profile?.slug || "").trim();
    if (!slug || known.has(slug)) {
      continue;
    }
    next.push(deepClone(profile));
    known.add(slug);
  }
  return next;
}

function mergeProfileSnapshotIntoState(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return;
  }

  state.devices = mergeProfilesBySlug(state.devices, snapshot.devices);
  state.wiringDevices = mergeProfilesBySlug(state.wiringDevices, snapshot.wiringDevices);
  state.junctionBoxes = mergeProfilesBySlug(state.junctionBoxes, snapshot.junctionBoxes);
  state.connectors = mergeProfilesBySlug(state.connectors, snapshot.connectors);

  renderShellyDeviceList();
  renderWiringDeviceList();

  if (el.addonType) {
    const previous = el.addonType.value;
    el.addonType.innerHTML = "";
    for (const connector of state.connectors) {
      const option = document.createElement("option");
      option.value = connector.slug;
      option.textContent = connector.name;
      el.addonType.appendChild(option);
    }
    if (state.connectors.length) {
      const hasPrevious = state.connectors.some((entry) => entry.slug === previous);
      el.addonType.value = hasPrevious ? previous : state.connectors[0].slug;
    }
    el.addAddonBtn.disabled = state.connectors.length === 0;
  }

  populateGangOptions();
}

function mergeImportedProject(payload) {
  const importedItems = Array.isArray(payload?.project?.items) ? payload.project.items : [];
  const importedLinks = Array.isArray(payload?.project?.wiringLinks) ? payload.project.wiringLinks : [];
  const assets = payload?.assets && typeof payload.assets === "object" ? payload.assets : {};
  const profileSnapshot = payload?.profileSnapshot;

  if (!importedItems.length) {
    alert("Import file has no items.");
    return;
  }

  mergeProfileSnapshotIntoState(profileSnapshot);

  const idMap = new Map();
  let importedCount = 0;

  for (const rawItem of importedItems) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const item = deepClone(rawItem);
    const oldId = String(item.id || "");
    const newId = `item-${state.nextId++}`;
    item.id = newId;

    if (item.meta?.imagePath && assets[item.meta.imagePath]) {
      item.meta.imagePath = assets[item.meta.imagePath];
    }

    state.items.push(item);
    if (oldId) {
      idMap.set(oldId, newId);
    }
    importedCount += 1;
  }

  let importedWires = 0;
  for (const rawLink of importedLinks) {
    const sourceAnchor = remapAnchorItemId(rawLink.sourceAnchor, idMap);
    const targetAnchor = remapAnchorItemId(rawLink.targetAnchor, idMap);
    if (!sourceAnchor || !targetAnchor) {
      continue;
    }

    const newLink = {
      ...deepClone(rawLink),
      id: `wire-${state.nextId++}`,
      sourceAnchor,
      targetAnchor,
      sourceId: sourceAnchor.itemId,
      targetId: targetAnchor.itemId,
    };
    state.wiringLinks.push(newLink);
    importedWires += 1;
  }

  syncSelectionOptions();
  renderItems();
  renderWires();
  debouncedSaveSession();
  alert(`Import complete. Added ${importedCount} item(s) and ${importedWires} wire(s).`);
}

async function persistImportSnapshotToServer(payload) {
  if (!payload?.profileSnapshot) {
    return;
  }

  try {
    const res = await fetch("/api/projects/import-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileSnapshot: payload.profileSnapshot,
        assets: payload.assets || {},
      }),
    });
    if (!res.ok) {
      throw new Error("Snapshot import API failed");
    }
  } catch (_err) {
    // Keep importing into the active session even if persistence fails.
  }
}

async function onImportProjectFileChange(ev) {
  const file = ev.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);

    // Persist missing profiles/assets into import folders before placement.
    await persistImportSnapshotToServer(payload);

    // Refresh live registries so imported profile definitions appear in selectors.
    await loadDevices();
    await loadWiringDevices();
    await loadConnectors();
    await loadJunctionBoxes();

    mergeImportedProject(payload);
  } catch (_err) {
    alert("Unable to import project. Please choose a valid export JSON file.");
  } finally {
    ev.target.value = "";
  }
}

function isJunctionToJunctionLink(link) {
  return link?.sourceAnchor?.kind === "pvc-dot" && link?.targetAnchor?.kind === "pvc-dot";
}

function getEffectiveWireStrokeWidth(link) {
  if (isJunctionToJunctionLink(link)) {
    return BASE_BLACK_WIRE_WIDTH * JUNCTION_LINK_WIDTH_MULTIPLIER;
  }
  return getWireStrokeWidth(link.conductor);
}

function getAnchorGroupKey(anchor) {
  if (!anchor) {
    return "";
  }

  if (anchor.kind === "pvc-dot") {
    return `${anchor.kind}:${anchor.itemId}:${anchor.x}:${anchor.y}`;
  }

  return `${anchor.kind}:${anchor.itemId}:${anchor.key || ""}`;
}

function buildSourceBundleOffsets(links, pendingWire) {
  const groups = new Map();

  for (const link of links) {
    const key = getAnchorGroupKey(link.sourceAnchor);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push({
      type: "link",
      ref: link,
      width: getWireStrokeWidth(link.conductor),
    });
  }

  if (pendingWire?.sourceAnchor) {
    const key = getAnchorGroupKey(pendingWire.sourceAnchor);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push({
      type: "pending",
      ref: pendingWire,
      width: getWireStrokeWidth(pendingWire.conductor),
    });
  }

  const offsets = new Map();
  for (const entries of groups.values()) {
    const spacing = Math.max(...entries.map((entry) => entry.width));
    const midpoint = (entries.length - 1) / 2;
    entries.forEach((entry, index) => {
      offsets.set(entry.ref, (index - midpoint) * spacing);
    });
  }

  return offsets;
}

function applyBundleOffset(points, offsetPx) {
  if (!offsetPx) {
    return points;
  }

  const anchor = points[0];
  const next = points.find((point, index) => index > 0 && (Math.abs(point.x - anchor.x) > 0.1 || Math.abs(point.y - anchor.y) > 0.1));
  if (!next) {
    return points;
  }

  const dx = next.x - anchor.x;
  const dy = next.y - anchor.y;
  const offsetX = Math.abs(dx) >= Math.abs(dy) ? 0 : offsetPx;
  const offsetY = Math.abs(dx) >= Math.abs(dy) ? offsetPx : 0;

  return points.map((point) => ({
    x: point.x + offsetX,
    y: point.y + offsetY,
  }));
}

function buildWirePoints(link) {
  const srcAnchor = link.sourceAnchor || { kind: "pvc-dot", itemId: link.sourceId, x: 0, y: 0 };
  const dstAnchor = link.targetAnchor || { kind: "device-terminal", itemId: link.targetId, key: "L" };
  const srcIn = resolveAnchorPoint(srcAnchor);
  const dstIn = resolveAnchorPoint(dstAnchor);
  if (!srcIn || !dstIn) {
    return null;
  }

  const pointsIn = [
    srcIn,
    ...((link.waypoints || []).map((point) => ({ x: point.x, y: point.y }))),
    dstIn,
  ];

  return pointsIn.map((point) => ({
    x: inchesToPixels(point.x),
    y: inchesToPixels(point.y),
  }));
}

function getWireCenterInches(link) {
  const srcAnchor = link.sourceAnchor || { kind: "pvc-dot", itemId: link.sourceId, x: 0, y: 0 };
  const dstAnchor = link.targetAnchor || { kind: "device-terminal", itemId: link.targetId, key: "L" };
  const srcIn = resolveAnchorPoint(srcAnchor);
  const dstIn = resolveAnchorPoint(dstAnchor);
  if (!srcIn || !dstIn) {
    return null;
  }

  const pointsIn = [
    srcIn,
    ...((link.waypoints || []).map((point) => ({ x: point.x, y: point.y }))),
    dstIn,
  ];
  if (!pointsIn.length) {
    return null;
  }

  let minX = pointsIn[0].x;
  let maxX = pointsIn[0].x;
  let minY = pointsIn[0].y;
  let maxY = pointsIn[0].y;
  for (const point of pointsIn) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

function buildPreviewPoints() {
  if (!state.pendingWire || !state.cursorIn) {
    return null;
  }

  const srcIn = resolveAnchorPoint(state.pendingWire.sourceAnchor);
  if (!srcIn) {
    return null;
  }

  const pointsIn = [
    srcIn,
    ...((state.pendingWire.waypoints || []).map((point) => ({ x: point.x, y: point.y }))),
    state.cursorIn,
  ];

  return pointsIn.map((point) => ({
    x: inchesToPixels(point.x),
    y: inchesToPixels(point.y),
  }));
}

function buildStraightPath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function selectItem(itemId) {
  state.selectedItemId = itemId;
  state.selectedWireId = null;
  renderItems();
}

function selectWire(wireId) {
  state.selectedWireId = wireId;
  state.selectedItemId = null;
  updateDeleteButtonState();
  renderWires();
}

function clearSelection() {
  state.selectedItemId = null;
  state.selectedWireId = null;
  state.altInfoItemId = null;
  renderItems();
}

function updateDeleteButtonState() {
  el.deleteItemBtn.disabled = !state.selectedItemId && !state.selectedWireId;
}

function deleteSelectedItem() {
  if (state.selectedWireId) {
    state.wiringLinks = state.wiringLinks.filter((link) => link.id !== state.selectedWireId);
    state.selectedWireId = null;
    renderItems();
    debouncedSaveSession();
    return;
  }

  if (!state.selectedItemId) {
    return;
  }

  const removedId = state.selectedItemId;
  state.items = state.items.filter((entry) => entry.id !== removedId);
  state.wiringLinks = state.wiringLinks.filter((link) => {
    const srcId = link.sourceAnchor?.itemId || link.sourceId;
    const dstId = link.targetAnchor?.itemId || link.targetId;
    return srcId !== removedId && dstId !== removedId;
  });
  state.selectedItemId = null;
  state.selectedWireId = null;

  syncSelectionOptions();
  renderItems();
  debouncedSaveSession();
}

function getContainFrame(containerWidth, containerHeight, imageWidth, imageHeight) {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight,
    };
  }

  const ratio = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * ratio;
  const height = imageHeight * ratio;
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

function getImageReferenceSize(item, fallbackWidth, fallbackHeight) {
  const configured = item.meta.imageReferenceSize || item.meta.terminalReferenceSize;
  const hasConfigured = Number(configured?.width) > 0 && Number(configured?.height) > 0;
  if (hasConfigured) {
    return {
      width: Number(configured.width),
      height: Number(configured.height),
    };
  }

  const inferred = getTerminalScale(item.meta.terminalLocations || {}, item.meta.terminalReferenceSize);
  if (inferred.width > 1 || inferred.height > 1) {
    return inferred;
  }

  return {
    width: Math.max(1, fallbackWidth),
    height: Math.max(1, fallbackHeight),
  };
}

function getTerminalScale(terminalLocations, configuredScale) {
  const hasConfigured = Number(configuredScale?.width) > 0 && Number(configuredScale?.height) > 0;
  if (hasConfigured) {
    return {
      width: Number(configuredScale.width),
      height: Number(configuredScale.height),
    };
  }

  let maxX = 0;
  let maxY = 0;
  for (const pos of Object.values(terminalLocations)) {
    const x = Number(pos?.x);
    const y = Number(pos?.y);
    if (Number.isFinite(x)) {
      maxX = Math.max(maxX, x);
    }
    if (Number.isFinite(y)) {
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX > 1 || maxY > 1) {
    return { width: Math.max(maxX, 1), height: Math.max(maxY, 1) };
  }

  return { width: 1, height: 1 };
}

function normalizeTerminalPosition(pos, scale) {
  const x = Number(pos?.x);
  const y = Number(pos?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  if (x <= 1 && y <= 1) {
    return { x, y };
  }

  if (!scale || scale.width <= 0 || scale.height <= 0) {
    return null;
  }

  return {
    x: x / scale.width,
    y: y / scale.height,
  };
}

function beginViewportPan(ev) {
  if (ev.button !== 1) {
    return;
  }

  ev.preventDefault();
  state.viewportPan = {
    startClientX: ev.clientX,
    startClientY: ev.clientY,
    startScrollLeft: el.workspaceViewport.scrollLeft,
    startScrollTop: el.workspaceViewport.scrollTop,
  };
  el.workspaceViewport.classList.add("middle-panning");
}

function updateViewportPan(ev) {
  if (!state.viewportPan) {
    return;
  }

  const dx = ev.clientX - state.viewportPan.startClientX;
  const dy = ev.clientY - state.viewportPan.startClientY;
  el.workspaceViewport.scrollLeft = state.viewportPan.startScrollLeft - dx;
  el.workspaceViewport.scrollTop = state.viewportPan.startScrollTop - dy;
}

function endViewportPan() {
  if (!state.viewportPan) {
    return;
  }

  state.viewportPan = null;
  el.workspaceViewport.classList.remove("middle-panning");
  debouncedSaveSession();
}

function makeDraggable(node, itemId) {
  node.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) {
      return;
    }
    if (state.pendingPlacement) {
      return;
    }
    if (ev.target.closest(".ko-anchor") || ev.target.closest(".ko-badge") || ev.target.closest(".connector-port") || ev.target.closest(".connector-badge") || ev.target.closest(".terminal-anchor") || ev.target.closest(".terminal-badge")) {
      return;
    }
    if (state.pendingWire) {
      return;
    }
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    if (isItemMovementLocked(item)) {
      return;
    }

    node.setPointerCapture(ev.pointerId);

    const viewportRect = el.workspaceViewport.getBoundingClientRect();
    const pointerLocalX = ev.clientX - viewportRect.left + el.workspaceViewport.scrollLeft;
    const pointerLocalY = ev.clientY - viewportRect.top + el.workspaceViewport.scrollTop;

    state.drag = {
      item,
      prevX: item.x,
      prevY: item.y,
      offsetX: pointerLocalX - inchesToPixels(item.x),
      offsetY: pointerLocalY - inchesToPixels(item.y),
    };
  });

  node.addEventListener("pointermove", (ev) => {
    if (!state.drag || state.drag.item.id !== itemId) {
      return;
    }

    const viewportRect = el.workspaceViewport.getBoundingClientRect();
    const pointerLocalX = ev.clientX - viewportRect.left + el.workspaceViewport.scrollLeft;
    const pointerLocalY = ev.clientY - viewportRect.top + el.workspaceViewport.scrollTop;

    const host = state.drag.item.meta?.mountedIn
      ? state.items.find((entry) => entry.id === state.drag.item.meta.mountedIn)
      : null;

    const minXIn = host ? host.x : 0;
    const minYIn = host ? host.y : 0;
    const maxXIn = host ? host.x + host.width - state.drag.item.width : state.workspaceWidthIn - state.drag.item.width;
    const maxYIn = host ? host.y + host.height - state.drag.item.height : state.workspaceHeightIn - state.drag.item.height;

    state.drag.item.x = clamp(pixelsToInches(pointerLocalX - state.drag.offsetX), minXIn, maxXIn);
    state.drag.item.y = clamp(pixelsToInches(pointerLocalY - state.drag.offsetY), minYIn, maxYIn);

    const deltaX = state.drag.item.x - state.drag.prevX;
    const deltaY = state.drag.item.y - state.drag.prevY;
    if (state.drag.item.type === "pvc" && (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0)) {
      moveMountedChildrenWithHost(state.drag.item.id, deltaX, deltaY);
    }
    state.drag.prevX = state.drag.item.x;
    state.drag.prevY = state.drag.item.y;

    node.style.left = `${inchesToPixels(state.drag.item.x)}px`;
    node.style.top = `${inchesToPixels(state.drag.item.y)}px`;

    if (state.drag.item.type === "pvc") {
      for (const child of state.items) {
        if (child.meta?.mountedIn !== state.drag.item.id) {
          continue;
        }
        const childNode = el.workspace.querySelector(`.item[data-item-id="${child.id}"]`);
        if (!childNode) {
          continue;
        }
        childNode.style.left = `${inchesToPixels(child.x)}px`;
        childNode.style.top = `${inchesToPixels(child.y)}px`;
      }
    }

    renderWires();
  });

  node.addEventListener("pointerup", () => {
    maybeMountDraggedItem(itemId);
    state.drag = null;
    debouncedSaveSession();
  });

  node.addEventListener("pointercancel", () => {
    state.drag = null;
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function moveMountedChildrenWithHost(hostId, deltaX, deltaY) {
  const host = state.items.find((entry) => entry.id === hostId);
  if (!host) {
    return;
  }
  for (const item of state.items) {
    if (item.meta?.mountedIn !== hostId) {
      continue;
    }
    item.x = clamp(item.x + deltaX, host.x, host.x + host.width - item.width);
    item.y = clamp(item.y + deltaY, host.y, host.y + host.height - item.height);
  }
}

function syncSelectionOptions() {
  el.sourceBox.innerHTML = "";
  el.targetDevice.innerHTML = "";

  const boxes = state.items.filter((entry) => entry.type === "pvc");
  const devices = state.items.filter((entry) => entry.type === "device");

  for (const box of boxes) {
    const option = document.createElement("option");
    option.value = box.id;
    option.textContent = `${box.name} (${box.id})`;
    el.sourceBox.appendChild(option);
  }

  for (const device of devices) {
    const option = document.createElement("option");
    option.value = device.id;
    option.textContent = `${device.name} (${device.id})`;
    el.targetDevice.appendChild(option);
  }
}

function drawCircuits() {
  const sourceId = el.sourceBox.value;
  const targetId = el.targetDevice.value;

  if (!sourceId || !targetId) {
    alert("Please add and select both a junction box and a device.");
    return;
  }

  const source = state.items.find((entry) => entry.id === sourceId);
  const target = state.items.find((entry) => entry.id === targetId);
  if (!source || !target) {
    return;
  }

  state.wiringLinks = [];
  const outCircuits = source.meta.circuitsOut ?? source.meta.circuits;
  for (let i = 0; i < outCircuits; i += 1) {
    state.wiringLinks.push({
      id: `wire-${state.nextId++}`,
      sourceId,
      targetId,
      sourceAnchor: {
        kind: "pvc-dot",
        itemId: sourceId,
        x: source.width,
        y: Math.min(source.height, 0.5 + i),
      },
      targetAnchor: {
        kind: "device-terminal",
        itemId: targetId,
        key: "L",
      },
      circuitIndex: i + 1,
      conductor: "hot",
      color: COLORS.hot,
      terminal: "L",
    });

    state.wiringLinks.push({
      id: `wire-${state.nextId++}`,
      sourceId,
      targetId,
      sourceAnchor: {
        kind: "pvc-dot",
        itemId: sourceId,
        x: source.width,
        y: Math.min(source.height, 0.5 + i),
      },
      targetAnchor: {
        kind: "device-terminal",
        itemId: targetId,
        key: "N",
      },
      circuitIndex: i + 1,
      conductor: "neutral",
      color: COLORS.neutral,
      terminal: "N",
    });

    state.wiringLinks.push({
      id: `wire-${state.nextId++}`,
      sourceId,
      targetId,
      sourceAnchor: {
        kind: "pvc-dot",
        itemId: sourceId,
        x: source.width,
        y: Math.min(source.height, 0.5 + i),
      },
      targetAnchor: {
        kind: "device-terminal",
        itemId: targetId,
        key: "PE",
      },
      circuitIndex: i + 1,
      conductor: "ground",
      color: COLORS.ground,
      terminal: "PE",
    });
  }

  renderWires();
}

function renderWires() {
  const width = el.workspace.clientWidth;
  const height = el.workspace.clientHeight;
  el.wireLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
  el.wireLayer.setAttribute("width", `${width}`);
  el.wireLayer.setAttribute("height", `${height}`);
  el.wireLayer.innerHTML = "";
  const bundleOffsets = buildSourceBundleOffsets(state.wiringLinks, state.pendingWire);

  for (const link of state.wiringLinks) {
    const basePoints = buildWirePoints(link);
    if (!basePoints) {
      continue;
    }
    const offsetPoints = applyBundleOffset(basePoints, bundleOffsets.get(link) || 0);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", buildStraightPath(offsetPoints));
    path.setAttribute("fill", "none");
    const isJunctionLink = isJunctionToJunctionLink(link);
    path.setAttribute("stroke", isJunctionLink ? JUNCTION_LINK_COLOR : link.color);
    path.setAttribute("stroke-width", `${getEffectiveWireStrokeWidth(link)}`);
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.dataset.wireId = link.id;
    path.style.pointerEvents = "visibleStroke";

    if (state.selectedWireId === link.id) {
      path.setAttribute("filter", "drop-shadow(0 0 3px rgba(239, 68, 68, 0.9))");
    }

    if (!isJunctionLink && link.conductor === "neutral") {
      path.setAttribute("stroke", "#f8fafc");
      if (!path.getAttribute("filter")) {
        path.setAttribute("filter", "drop-shadow(0 0 1px rgba(0,0,0,0.45))");
      }
    }
    if (isJunctionLink && !path.getAttribute("filter")) {
      path.setAttribute("filter", "drop-shadow(0 0 1px rgba(15, 23, 42, 0.45))");
    }

    path.addEventListener("click", (ev) => {
      ev.stopPropagation();
      selectWire(link.id);
    });

    el.wireLayer.appendChild(path);
  }

  if (state.pendingWire && state.cursorIn) {
    const previewPoints = buildPreviewPoints();
    if (previewPoints) {
      const offsetPreview = applyBundleOffset(previewPoints, bundleOffsets.get(state.pendingWire) || 0);
      const preview = document.createElementNS("http://www.w3.org/2000/svg", "path");
      preview.setAttribute("d", buildStraightPath(offsetPreview));
      preview.setAttribute("fill", "none");
      const previewColor = state.pendingWire.conductor === "neutral"
        ? NEUTRAL_PREVIEW_COLOR
        : state.pendingWire.color;
      preview.setAttribute("stroke", previewColor);
      preview.setAttribute("stroke-width", `${getWireStrokeWidth(state.pendingWire.conductor)}`);
      preview.setAttribute("stroke-dasharray", "5 5");
      preview.setAttribute("stroke-linecap", "round");
      preview.setAttribute("stroke-linejoin", "round");
      preview.setAttribute("opacity", "0.9");
      el.wireLayer.appendChild(preview);
    }
  }
}

function maybeMountDraggedItem(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item || item.type === "pvc") {
    return;
  }

  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;
  const host = state.items.find((entry) => {
    if (entry.type !== "pvc") {
      return false;
    }
    if ((entry.meta?.boxType || "").toLowerCase() !== "pvc") {
      return false;
    }
    return centerX >= entry.x && centerX <= entry.x + entry.width
      && centerY >= entry.y && centerY <= entry.y + entry.height;
  });

  if (!host || item.meta?.mountedIn === host.id) {
    return;
  }

  const shouldMount = window.confirm(`Mount ${item.name} inside ${host.name} (${host.id})?`);
  if (!shouldMount) {
    return;
  }

  item.meta = {
    ...item.meta,
    mountedIn: host.id,
  };

  item.x = clamp(item.x, host.x, host.x + host.width - item.width);
  item.y = clamp(item.y, host.y, host.y + host.height - item.height);
  renderItems();
}

function addAddon() {
  const slug = el.addonType.value;
  const profile = state.connectors.find((entry) => entry.slug === slug);
  if (!profile) {
    return;
  }

  const plannerDims = profile.dimensions?.planner_inches || {};
  const width = Number(plannerDims.width) || 1;
  const height = Number(plannerDims.height) || 1;

  beginItemPlacement({
    type: "connector",
    name: profile.name,
    width,
    height,
    meta: {
      slug: profile.slug,
      connectorType: profile.connector_type,
      imagePath: profile.images?.connector,
      portReferenceSize: profile.images?.image_reference_size || null,
      ports: Number(profile.ports) || 1,
      portPositions: Array.isArray(profile.port_positions) ? profile.port_positions : [],
    },
  });
}

function updateWorkspaceScale() {
  const pixelsPerInch = getPixelsPerInch();
  const width = state.workspaceWidthIn * pixelsPerInch;
  const height = state.workspaceHeightIn * pixelsPerInch;

  el.workspace.style.width = `${Math.max(width, el.workspaceViewport.clientWidth)}px`;
  el.workspace.style.height = `${Math.max(height, el.workspaceViewport.clientHeight)}px`;

  const quarter = Math.max(4, pixelsPerInch / 4);
  el.workspace.style.backgroundSize = `${quarter}px ${quarter}px, ${quarter}px ${quarter}px, 100% 100%`;

  el.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  renderItems();
  renderRulers();
}

function setInitialViewportOriginToGridCenter() {
  const centerX = inchesToPixels(state.workspaceWidthIn / 2);
  const centerY = inchesToPixels(state.workspaceHeightIn / 2);
  const maxLeft = Math.max(0, el.workspace.scrollWidth - el.workspaceViewport.clientWidth);
  const maxTop = Math.max(0, el.workspace.scrollHeight - el.workspaceViewport.clientHeight);
  el.workspaceViewport.scrollLeft = clamp(centerX, 0, maxLeft);
  el.workspaceViewport.scrollTop = clamp(centerY, 0, maxTop);
}

function renderRulers() {
  const ppi = getPixelsPerInch();
  renderHorizontalRuler(ppi);
  renderVerticalRuler(ppi);
}

function setupCanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function renderHorizontalRuler(ppi) {
  const width = el.workspaceViewport.clientWidth;
  const height = 34;
  const ctx = setupCanvas(el.rulerTop, width, height);
  const startIn = 0;
  const endIn = width / ppi;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
  ctx.fillStyle = "#0f172a";
  ctx.font = "10px IBM Plex Mono";
  ctx.textBaseline = "top";

  const firstTick = Math.floor(startIn);
  const lastTick = Math.ceil(endIn);

  for (let tick = firstTick; tick <= lastTick; tick += 1) {
    const x = Math.round((tick - startIn) * ppi) + 0.5;
    const major = tick % 12 === 0;
    const mid = tick % 6 === 0;
    const tickHeight = major ? 18 : mid ? 13 : 9;

    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x, height - tickHeight);
    ctx.stroke();

    if (major && tick >= 0) {
      ctx.fillText(`${tick}\"`, x + 3, 3);
    }
  }
}

function renderVerticalRuler(ppi) {
  const width = 34;
  const height = el.workspaceViewport.clientHeight;
  const ctx = setupCanvas(el.rulerLeft, width, height);
  const startIn = 0;
  const endIn = height / ppi;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
  ctx.fillStyle = "#0f172a";
  ctx.font = "10px IBM Plex Mono";

  const firstTick = Math.floor(startIn);
  const lastTick = Math.ceil(endIn);

  for (let tick = firstTick; tick <= lastTick; tick += 1) {
    const y = Math.round((tick - startIn) * ppi) + 0.5;
    const major = tick % 12 === 0;
    const mid = tick % 6 === 0;
    const tickWidth = major ? 18 : mid ? 13 : 9;

    ctx.beginPath();
    ctx.moveTo(width, y);
    ctx.lineTo(width - tickWidth, y);
    ctx.stroke();

    if (major && tick >= 0) {
      ctx.save();
      ctx.translate(3, y + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "top";
      ctx.fillText(`${tick}\"`, 0, 0);
      ctx.restore();
    }
  }
}

function addPvcBox() {
  const profile = state.selectedJunctionProfile;
  if (!profile) {
    return;
  }

  const plannerDims = profile.dimensions?.planner_inches || {};
  const fixedWidth = Number(plannerDims.width) || 12;
  const fixedHeight = Number(plannerDims.height) || 12;
  const widthIn = profile.supports_custom_size ? (Number(el.boxWidth.value) || fixedWidth) : fixedWidth;
  const heightIn = profile.supports_custom_size ? (Number(el.boxHeight.value) || fixedHeight) : fixedHeight;
  const normalizedKnockouts = Array.isArray(profile.knockout_locations) ? profile.knockout_locations : [];
  const autoCircuits = Math.max(1, normalizedKnockouts.length);

  beginItemPlacement({
    type: "pvc",
    name: profile.name,
    width: widthIn,
    height: heightIn,
    meta: {
      slug: profile.slug,
      boxType: profile.box_type,
      environment: profile.environment,
      gang: profile.gang,
      imagePath: profile.images?.box,
      imageReferenceSize: profile.images?.image_reference_size || null,
      widthIn,
      heightIn,
      circuits: autoCircuits,
      circuitsOut: autoCircuits,
      maxCircuits: autoCircuits,
      supportsCustomSize: Boolean(profile.supports_custom_size),
      knockoutLocations: normalizedKnockouts,
    },
  });

  resetJunctionChooser();
}

function addDevice(slugOverride) {
  const slug = slugOverride || el.deviceSelect?.value;
  const profile = state.devices.find((entry) => entry.slug === slug);
  if (!profile) {
    return;
  }

  const plannerDims = profile.dimensions?.planner_inches;
  const widthIn = Number(plannerDims?.width) || Number(profile.width_cells || 2);
  const heightIn = Number(plannerDims?.height) || Number(profile.height_cells || 2);

  const terminalDisplayLabels = {};
  for (const t of profile.terminals || []) {
    terminalDisplayLabels[t.key] = t.display_label ?? t.label ?? t.key;
  }

  beginItemPlacement({
    type: "device",
    name: profile.name,
    width: widthIn,
    height: heightIn,
    meta: {
      slug: profile.slug,
      widthIn,
      heightIn,
      imagePath: profile.images?.device,
      imageReferenceSize: profile.images?.image_reference_size || null,
      terminalLocations: profile.terminal_locations || {},
      terminalReferenceSize: profile.images?.terminal_reference_size || null,
      terminalDisplayLabels,
    },
  });
}

function addWiringDevice(slugOverride) {
  const slug = slugOverride;
  const profile = state.wiringDevices.find((entry) => entry.slug === slug);
  if (!profile) {
    return;
  }

  const plannerDims = profile.dimensions?.planner_inches;
  const widthIn = Number(plannerDims?.width) || 2;
  const heightIn = Number(plannerDims?.height) || 2;
  const terminalLocations = wiringLocationsToMap(profile);
  const terminalDisplayLabels = {};
  for (const key of Object.keys(terminalLocations)) {
    terminalDisplayLabels[key] = key;
  }

  beginItemPlacement({
    type: "device",
    name: profile.name,
    width: widthIn,
    height: heightIn,
    meta: {
      slug: profile.slug,
      widthIn,
      heightIn,
      imagePath: profile.images?.device,
      imageReferenceSize: profile.images?.image_reference_size || null,
      terminalLocations,
      terminalReferenceSize: profile.images?.terminal_reference_size || null,
      terminalDisplayLabels,
    },
  });
}

function clearWires() {
  state.wiringLinks = [];
  cancelPendingWire();
  renderItems();
  debouncedSaveSession();
}

function focusViewportOnInches(xIn, yIn) {
  const centerX = inchesToPixels(xIn);
  const centerY = inchesToPixels(yIn);
  const targetLeft = centerX - el.workspaceViewport.clientWidth / 2;
  const targetTop = centerY - el.workspaceViewport.clientHeight / 2;
  const maxLeft = Math.max(0, el.workspace.scrollWidth - el.workspaceViewport.clientWidth);
  const maxTop = Math.max(0, el.workspace.scrollHeight - el.workspaceViewport.clientHeight);
  el.workspaceViewport.scrollLeft = clamp(targetLeft, 0, maxLeft);
  el.workspaceViewport.scrollTop = clamp(targetTop, 0, maxTop);
}

function onZoomChange() {
  const selectedItem = state.items.find((item) => item.id === state.selectedItemId);
  const selectedItemCenter = selectedItem
    ? {
      x: selectedItem.x + selectedItem.width / 2,
      y: selectedItem.y + selectedItem.height / 2,
    }
    : null;
  const selectedWire = state.wiringLinks.find((link) => link.id === state.selectedWireId);
  const selectedWireCenter = selectedWire ? getWireCenterInches(selectedWire) : null;
  const zoomFocus = selectedItemCenter || selectedWireCenter;

  state.zoom = Number(el.zoomRange.value);
  updateWorkspaceScale();

  if (zoomFocus) {
    focusViewportOnInches(zoomFocus.x, zoomFocus.y);
  }
  
  debouncedSaveSession();
}

window.addEventListener("resize", () => {
  updateWorkspaceScale();
  renderRulers();
  renderWires();
});
el.workspaceViewport.addEventListener("mousedown", beginViewportPan);
el.workspaceViewport.addEventListener("auxclick", (ev) => {
  if (ev.button === 1) {
    ev.preventDefault();
  }
});
window.addEventListener("mousemove", updateViewportPan);
window.addEventListener("mouseup", endViewportPan);
window.addEventListener("blur", endViewportPan);
el.zoomRange.addEventListener("input", onZoomChange);
el.addAddonBtn.addEventListener("click", addAddon);
el.clearGridBtn?.addEventListener("click", clearGrid);
el.screenshotGridBtn?.addEventListener("click", screenshotGrid);
el.exportProjectBtn?.addEventListener("click", exportProject);
el.importProjectBtn?.addEventListener("click", () => el.importProjectInput?.click());
el.importProjectInput?.addEventListener("change", onImportProjectFileChange);
el.deleteItemBtn.addEventListener("click", deleteSelectedItem);
el.workspace.addEventListener("click", (ev) => {
  if (state.pendingPlacement) {
    placePendingItem(ev);
    return;
  }
  if (state.pendingWire) {
    addPendingWireWaypoint(getPointerInches(ev));
    closeWireSourcePopover();
    return;
  }
  clearSelection();
  if (!el.wireConfigPopover.contains(ev.target)) {
    closeWireSourcePopover();
  }
});
el.workspace.addEventListener("mousemove", (ev) => {
  if (state.pendingPlacement) {
    updatePlacementPreviewPosition(ev);
    syncPlacementPreviewNode();
  }
  if (!state.pendingWire) {
    return;
  }
  state.cursorIn = getPointerInches(ev);
  renderWires();
});
el.workspace.addEventListener("contextmenu", (ev) => {
  if (!state.pendingWire) {
    return;
  }
  ev.preventDefault();
  undoPendingWireWaypoint();
});

el.junctionClearBtn.addEventListener("click", resetJunctionChooser);
el.junctionNextBtn.addEventListener("click", goToJunctionConfigStep);
el.junctionType.addEventListener("change", populateGangOptions);
el.junctionEnvironment.addEventListener("change", populateGangOptions);
el.junctionBackBtn.addEventListener("click", () => {
  state.selectedJunctionProfile = null;
  el.junctionStepChooser.classList.remove("hidden");
  el.junctionStepConfig.classList.add("hidden");
});

el.addBoxBtn.addEventListener("click", addPvcBox);
if (el.addDeviceBtn) {
  el.addDeviceBtn.addEventListener("click", () => addDevice());
}
for (const tab of el.plannerTabs) {
  tab.addEventListener("click", () => activatePlannerTab(tab.dataset.tab));
}
el.drawWiresBtn.addEventListener("click", drawCircuits);
el.clearWiresBtn.addEventListener("click", clearWires);
el.wireCircuitSelect.addEventListener("change", refreshWireColorOptions);
el.wireStartBtn.addEventListener("click", startManualWireFromPopover);
el.wireCancelBtn.addEventListener("click", () => {
  closeWireSourcePopover();
  cancelPendingWire();
});
window.addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape") {
    return;
  }
  if (state.pendingPlacement) {
    cancelPendingPlacement();
    return;
  }
  if (!state.pendingWire && el.wireConfigPopover.classList.contains("hidden")) {
    return;
  }
  closeWireSourcePopover();
  cancelPendingWire();
});

(async function init() {
  await loadDevices();
  await loadWiringDevices();
  await loadConnectors();
  await loadJunctionBoxes();
  
  // Load persisted session if available
  const sessionLoaded = loadSession();
  if (sessionLoaded) {
    hydrateImageReferenceSizesForSessionItems();
  }
  
  // Update zoom and activate tab after session load
  el.zoomRange.value = state.zoom;
  activatePlannerTab(state.activePlannerTab);
  
  updateWorkspaceScale();
  
  // Only center viewport if no session was loaded
  if (!sessionLoaded) {
    setInitialViewportOriginToGridCenter();
  }
  
  resetJunctionChooser();
  syncSelectionOptions();
  renderRulers();
  renderItems();
  renderWires();
  updateDeleteButtonState();
})();
