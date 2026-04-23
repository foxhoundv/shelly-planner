const WIRING_TERMINAL_TYPES = [
  { type: "L", label: "Live" },
  { type: "N", label: "Neutral" },
  { type: "G", label: "Ground" },
];

let nextMappingId = 1;

const state = {
  mappings: [],   // [{ id, type, x, y }]
  pendingPoint: null,
  imageFile: null,
  imageUrl: null,
  imageNaturalSize: null,
  imageLocked: false,
  zoom: 1,
};

let dropDragDepth = 0;

const el = {
  form: document.getElementById("wiring-builder-form"),
  name: document.getElementById("wiring-name"),
  deviceType: document.getElementById("wiring-device-type"),
  description: document.getElementById("wiring-description"),
  width: document.getElementById("wiring-width"),
  height: document.getElementById("wiring-height"),
  imageInput: document.getElementById("wiring-image"),
  slugPreview: document.getElementById("slug-preview"),
  imageSizePreview: document.getElementById("image-size-preview"),
  mappingCount: document.getElementById("mapping-count"),
  mappingList: document.getElementById("mapping-list"),
  clearMappingsBtn: document.getElementById("clear-mappings-btn"),
  status: document.getElementById("builder-status"),
  stage: document.getElementById("builder-stage"),
  stageShell: document.querySelector(".builder-stage-shell"),
  emptyState: document.getElementById("builder-empty-state"),
  imageFrame: document.getElementById("builder-image-frame"),
  image: document.getElementById("builder-image"),
  markers: document.getElementById("builder-markers"),
  picker: document.getElementById("terminal-picker"),
  pickerCoords: document.getElementById("terminal-picker-coords"),
  terminalSelect: document.getElementById("terminal-select"),
  saveTerminalBtn: document.getElementById("save-terminal-btn"),
  cancelTerminalBtn: document.getElementById("cancel-terminal-btn"),
  zoomRange: document.getElementById("image-zoom-range"),
  zoomValue: document.getElementById("image-zoom-value"),
  submitBtn: document.getElementById("submit-wiring-btn"),
};

/**
 * Compute the backend key for a mapping given the full mappings array.
 * - Single of its type → bare letter ("L", "N", "G")
 * - Multiple of same type → numbered ("L1", "L2", "N1", …)
 */
function effectiveKey(mapping, allMappings) {
  const sameType = allMappings.filter((m) => m.type === mapping.type);
  if (sameType.length === 1) return mapping.type;
  return mapping.type + (sameType.findIndex((m) => m.id === mapping.id) + 1);
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function setStatus(message, tone = "") {
  el.status.textContent = message;
  el.status.dataset.tone = tone;
}

function updateSlugPreview() {
  el.slugPreview.textContent = slugify(el.name.value) || "-";
}

function updateZoomLabel() {
  el.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
}

function syncImageFrameSize() {
  if (!state.imageNaturalSize || !el.stage.clientWidth || !el.stage.clientHeight) {
    return;
  }

  const maxWidth = Math.max(120, el.stage.clientWidth - 48);
  const maxHeight = Math.max(120, el.stage.clientHeight - 48);
  const widthRatio = maxWidth / state.imageNaturalSize.width;
  const heightRatio = maxHeight / state.imageNaturalSize.height;
  const fitRatio = Math.min(widthRatio, heightRatio);
  const frameWidth = Math.max(80, Math.round(state.imageNaturalSize.width * fitRatio));
  const frameHeight = Math.max(80, Math.round(state.imageNaturalSize.height * fitRatio));

  el.imageFrame.style.width = `${frameWidth}px`;
  el.imageFrame.style.height = `${frameHeight}px`;
  el.imageFrame.style.transform = `scale(${state.zoom})`;
}

function closePicker() {
  state.pendingPoint = null;
  el.picker.classList.add("hidden");
}

function openPicker(point, clientX, clientY) {
  state.pendingPoint = point;

  // Always show all 3 types — user can place as many as needed
  el.terminalSelect.innerHTML = "";
  for (const { type, label } of WIRING_TERMINAL_TYPES) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = label;
    el.terminalSelect.appendChild(option);
  }

  const shellRect = el.stageShell.getBoundingClientRect();
  const pickerWidth = 220;
  const pickerHeight = 150;
  const left = Math.min(Math.max(clientX - shellRect.left + 12, 12), shellRect.width - pickerWidth - 12);
  const top = Math.min(Math.max(clientY - shellRect.top + 12, 12), shellRect.height - pickerHeight - 12);

  el.picker.style.left = `${left}px`;
  el.picker.style.top = `${top}px`;
  el.pickerCoords.textContent = `Pixel: ${point.x}, ${point.y}`;
  el.picker.classList.remove("hidden");
  el.terminalSelect.focus();
}

function renderMappings() {
  el.mappingCount.textContent = String(state.mappings.length);
  el.markers.innerHTML = "";

  if (!state.imageNaturalSize || !state.mappings.length) {
    el.mappingList.className = "mapping-list empty";
    el.mappingList.innerHTML = "<p>No terminals mapped yet.</p>";
  } else {
    el.mappingList.className = "mapping-list";
    el.mappingList.innerHTML = state.mappings
      .map(
        (mapping) => {
          const key = effectiveKey(mapping, state.mappings);
          return `
          <div class="mapping-row">
            <div>
              <strong>${key}</strong>
              <span>${mapping.x}, ${mapping.y}</span>
            </div>
            <button type="button" class="ghost compact-btn mapping-remove-btn" data-id="${mapping.id}">Remove</button>
          </div>
        `;
        },
      )
      .join("");
  }

  if (!state.imageNaturalSize) {
    return;
  }

  for (const mapping of state.mappings) {
    const key = effectiveKey(mapping, state.mappings);
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "image-terminal-marker";
    marker.style.left = `${(mapping.x / state.imageNaturalSize.width) * 100}%`;
    marker.style.top = `${(mapping.y / state.imageNaturalSize.height) * 100}%`;
    marker.title = `${key} @ ${mapping.x}, ${mapping.y}`;
    marker.innerHTML = `<span>${key}</span>`;
    el.markers.appendChild(marker);
  }
}

function applyImageFile(file, { lockAfterDrop = false } = {}) {
  closePicker();
  state.mappings = [];
  renderMappings();
  setStatus("");

  if (state.imageUrl) {
    URL.revokeObjectURL(state.imageUrl);
    state.imageUrl = null;
  }

  if (!file) {
    state.imageFile = null;
    state.imageNaturalSize = null;
    el.image.removeAttribute("src");
    el.stage.classList.add("hidden");
    el.emptyState.classList.remove("hidden");
    el.imageSizePreview.textContent = "-";
    return;
  }

  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
  if (!isPng) {
    state.imageFile = null;
    el.imageInput.value = "";
    setStatus("Only .png files are accepted.", "error");
    return;
  }

  state.imageFile = file;
  state.imageUrl = URL.createObjectURL(file);
  el.image.src = state.imageUrl;

  if (lockAfterDrop) {
    state.imageLocked = true;
    el.imageInput.disabled = true;
    setStatus("Image dropped and locked for this wiring device. Submit to start another.", "success");
  }
}

function handleImageFileChange() {
  if (state.imageLocked) {
    el.imageInput.value = "";
    setStatus("Image is locked after drop. Submit to create this wiring device first.", "error");
    return;
  }

  const file = el.imageInput.files?.[0];
  applyImageFile(file);
}

function onStageDragEnter(event) {
  event.preventDefault();
  if (state.imageLocked) {
    return;
  }
  dropDragDepth += 1;
  el.stageShell.classList.add("drop-active");
}

function onStageDragOver(event) {
  event.preventDefault();
  if (state.imageLocked) {
    return;
  }
  event.dataTransfer.dropEffect = "copy";
}

function onStageDragLeave(event) {
  event.preventDefault();
  if (state.imageLocked) {
    return;
  }
  dropDragDepth = Math.max(0, dropDragDepth - 1);
  if (!dropDragDepth) {
    el.stageShell.classList.remove("drop-active");
  }
}

function onStageDrop(event) {
  event.preventDefault();
  dropDragDepth = 0;
  el.stageShell.classList.remove("drop-active");

  if (state.imageLocked) {
    setStatus("Image is already locked after drop. Submit to start another wiring device.", "error");
    return;
  }

  const file = event.dataTransfer?.files?.[0];
  if (!file) {
    return;
  }

  applyImageFile(file, { lockAfterDrop: true });
}

function assignPendingTerminal() {
  if (!state.pendingPoint) {
    return;
  }

  const type = el.terminalSelect.value;
  if (!type) {
    return;
  }

  state.mappings.push({ id: nextMappingId++, type, x: state.pendingPoint.x, y: state.pendingPoint.y });
  const key = effectiveKey(state.mappings[state.mappings.length - 1], state.mappings);
  renderMappings();
  setStatus(`Assigned ${key} to ${state.pendingPoint.x}, ${state.pendingPoint.y}.`, "success");
  closePicker();
}

function onImageClick(event) {
  if (!state.imageNaturalSize) {
    return;
  }

  const rect = el.image.getBoundingClientRect();
  const relativeX = (event.clientX - rect.left) / rect.width;
  const relativeY = (event.clientY - rect.top) / rect.height;
  if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
    return;
  }

  const point = {
    x: Math.min(state.imageNaturalSize.width - 1, Math.max(0, Math.round(relativeX * state.imageNaturalSize.width))),
    y: Math.min(state.imageNaturalSize.height - 1, Math.max(0, Math.round(relativeY * state.imageNaturalSize.height))),
  };
  openPicker(point, event.clientX, event.clientY);
}

function removeMapping(id) {
  state.mappings = state.mappings.filter((m) => m.id !== id);
  renderMappings();
}

async function submitWiringDevice(event) {
  event.preventDefault();
  closePicker();

  const file = state.imageFile || el.imageInput.files?.[0];
  if (!file) {
    setStatus("Upload a PNG image before submitting.", "error");
    return;
  }

  if (!state.mappings.length) {
    setStatus("Map at least one terminal before submitting.", "error");
    return;
  }

  const formData = new FormData();
  formData.set("name", el.name.value.trim());
  formData.set("device_type", el.deviceType.value);
  formData.set("description", el.description.value.trim());
  formData.set("width_in", el.width.value);
  formData.set("height_in", el.height.value);
  formData.set("image", file);
  formData.set("terminal_locations", JSON.stringify(
    state.mappings.map((m) => ({ key: effectiveKey(m, state.mappings), x: m.x, y: m.y }))
  ));

  el.submitBtn.disabled = true;
  setStatus("Creating wiring device files…", "pending");

  try {
    const response = await fetch("/api/wiring-devices", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Wiring device creation failed.");
    }

    setStatus(`Created ${payload.slug}. Refresh the planner to load the new device.`, "success");
    el.form.reset();
    state.imageLocked = false;
    el.imageInput.disabled = false;
    state.imageFile = null;
    state.mappings = [];
    state.imageNaturalSize = null;
    renderMappings();
    el.stage.classList.add("hidden");
    el.emptyState.classList.remove("hidden");
    el.image.removeAttribute("src");
    el.imageSizePreview.textContent = "-";
    el.slugPreview.textContent = "-";
    state.zoom = 1;
    el.zoomRange.value = "1";
    updateZoomLabel();
  } catch (error) {
    const message = error instanceof TypeError
      ? "Unable to reach the Shelly Planner server. Make sure the Flask app is running, then try again."
      : error.message;
    setStatus(message, "error");
  } finally {
    el.submitBtn.disabled = false;
  }
}

function onImageLoad() {
  state.imageNaturalSize = {
    width: el.image.naturalWidth,
    height: el.image.naturalHeight,
  };
  el.imageSizePreview.textContent = `${state.imageNaturalSize.width} x ${state.imageNaturalSize.height}`;
  el.emptyState.classList.add("hidden");
  el.stage.classList.remove("hidden");
  syncImageFrameSize();
  renderMappings();
}

function onZoomChange() {
  state.zoom = Number(el.zoomRange.value);
  updateZoomLabel();
  syncImageFrameSize();
}

function bindEvents() {
  el.name.addEventListener("input", updateSlugPreview);
  el.imageInput.addEventListener("change", handleImageFileChange);
  el.image.addEventListener("load", onImageLoad);
  el.image.addEventListener("click", onImageClick);
  el.form.addEventListener("submit", submitWiringDevice);
  el.saveTerminalBtn.addEventListener("click", assignPendingTerminal);
  el.cancelTerminalBtn.addEventListener("click", closePicker);
  el.clearMappingsBtn.addEventListener("click", () => {
    state.mappings = [];
    renderMappings();
    closePicker();
  });
  el.zoomRange.addEventListener("input", onZoomChange);
  window.addEventListener("resize", syncImageFrameSize);
  el.stageShell.addEventListener("dragenter", onStageDragEnter);
  el.stageShell.addEventListener("dragover", onStageDragOver);
  el.stageShell.addEventListener("dragleave", onStageDragLeave);
  el.stageShell.addEventListener("drop", onStageDrop);

  el.mappingList.addEventListener("click", (event) => {
    const button = event.target.closest(".mapping-remove-btn");
    if (!button) {
      return;
    }
    removeMapping(Number(button.dataset.id));
  });

  document.addEventListener("click", (event) => {
    if (el.picker.classList.contains("hidden")) {
      return;
    }
    if (el.picker.contains(event.target) || event.target === el.image) {
      return;
    }
    closePicker();
  });
}

(function init() {
  updateSlugPreview();
  updateZoomLabel();
  bindEvents();
})();
