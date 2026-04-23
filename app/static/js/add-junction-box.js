const state = {
  mappings: [],
  pendingPoint: null,
  imageFile: null,
  imageUrl: null,
  imageNaturalSize: null,
  imageLocked: false,
  zoom: 1,
};

let dropDragDepth = 0;

const el = {
  form: document.getElementById("junction-builder-form"),
  name: document.getElementById("junction-name"),
  boxType: document.getElementById("junction-type"),
  environment: document.getElementById("junction-environment"),
  gang: document.getElementById("junction-gang"),
  width: document.getElementById("junction-width"),
  height: document.getElementById("junction-height"),
  imageInput: document.getElementById("junction-image"),
  description: document.getElementById("junction-description"),
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
  picker: document.getElementById("ko-picker"),
  pickerCoords: document.getElementById("ko-picker-coords"),
  koKeyInput: document.getElementById("ko-key-input"),
  saveKoBtn: document.getElementById("save-ko-btn"),
  cancelKoBtn: document.getElementById("cancel-ko-btn"),
  zoomRange: document.getElementById("image-zoom-range"),
  zoomValue: document.getElementById("image-zoom-value"),
  submitBtn: document.getElementById("submit-junction-btn"),
};

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
  const shellRect = el.stageShell.getBoundingClientRect();
  const pickerWidth = 220;
  const pickerHeight = 170;
  const left = Math.min(Math.max(clientX - shellRect.left + 12, 12), shellRect.width - pickerWidth - 12);
  const top = Math.min(Math.max(clientY - shellRect.top + 12, 12), shellRect.height - pickerHeight - 12);

  el.picker.style.left = `${left}px`;
  el.picker.style.top = `${top}px`;
  el.pickerCoords.textContent = `Pixel: ${point.x}, ${point.y}`;
  el.koKeyInput.value = `KO${state.mappings.length + 1}`;
  el.picker.classList.remove("hidden");
  el.koKeyInput.focus();
}

function renderMappings() {
  el.mappingCount.textContent = String(state.mappings.length);
  el.markers.innerHTML = "";

  if (!state.imageNaturalSize || !state.mappings.length) {
    el.mappingList.className = "mapping-list empty";
    el.mappingList.innerHTML = "<p>No knock-outs mapped yet.</p>";
  } else {
    el.mappingList.className = "mapping-list";
    el.mappingList.innerHTML = state.mappings
      .map(
        (mapping) => `
          <div class="mapping-row">
            <div>
              <strong>${mapping.key}</strong>
              <span>${mapping.x}, ${mapping.y}</span>
            </div>
            <button type="button" class="ghost compact-btn mapping-remove-btn" data-key="${mapping.key}">Remove</button>
          </div>
        `,
      )
      .join("");
  }

  if (!state.imageNaturalSize) {
    return;
  }

  for (const mapping of state.mappings) {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "image-terminal-marker";
    marker.style.left = `${(mapping.x / state.imageNaturalSize.width) * 100}%`;
    marker.style.top = `${(mapping.y / state.imageNaturalSize.height) * 100}%`;
    marker.title = `${mapping.key} @ ${mapping.x}, ${mapping.y}`;
    marker.innerHTML = `<span>${mapping.key}</span>`;
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
    setStatus("Image dropped and locked for this junction box. Submit to start another.", "success");
  }
}

function handleImageFileChange() {
  if (state.imageLocked) {
    el.imageInput.value = "";
    setStatus("Image is locked after drop. Submit to create this junction box first.", "error");
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
    setStatus("Image is already locked after drop. Submit to start another junction box.", "error");
    return;
  }

  const file = event.dataTransfer?.files?.[0];
  if (!file) {
    return;
  }

  applyImageFile(file, { lockAfterDrop: true });
}

function assignPendingKnockout() {
  if (!state.pendingPoint) {
    return;
  }

  const key = el.koKeyInput.value.trim() || `KO${state.mappings.length + 1}`;
  state.mappings = state.mappings.filter((mapping) => mapping.key !== key);
  state.mappings.push({ key, x: state.pendingPoint.x, y: state.pendingPoint.y });
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

async function submitJunctionBox(event) {
  event.preventDefault();
  closePicker();

  const file = state.imageFile || el.imageInput.files?.[0];
  if (!file) {
    setStatus("Upload a PNG image before submitting.", "error");
    return;
  }

  if (!state.mappings.length) {
    setStatus("Map at least one knock-out before submitting.", "error");
    return;
  }

  const formData = new FormData();
  formData.set("name", el.name.value.trim());
  formData.set("description", el.description.value.trim());
  formData.set("box_type", el.boxType.value);
  formData.set("environment", el.environment.value);
  formData.set("gang", el.gang.value);
  formData.set("width_in", el.width.value);
  formData.set("height_in", el.height.value);
  formData.set("image", file);
  formData.set("knockout_locations", JSON.stringify(state.mappings));

  el.submitBtn.disabled = true;
  setStatus("Creating junction box files...", "pending");

  try {
    const response = await fetch("/api/junction-boxes", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Junction box creation failed.");
    }

    setStatus(`Created ${payload.slug}. Refresh the planner to load the new junction box.`, "success");
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
  el.form.addEventListener("submit", submitJunctionBox);
  el.saveKoBtn.addEventListener("click", assignPendingKnockout);
  el.cancelKoBtn.addEventListener("click", closePicker);
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
    state.mappings = state.mappings.filter((mapping) => mapping.key !== button.dataset.key);
    renderMappings();
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
