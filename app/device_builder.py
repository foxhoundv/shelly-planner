"""Helpers for creating new device definitions from uploaded images."""

from __future__ import annotations

import json
import re

from werkzeug.datastructures import FileStorage

from app.storage import GENERATED_DEVICES_DIR, GENERATED_IMAGE_ROOT, ensure_generated_storage, generated_image_url
from app.devices.terminals import allowed_terminal_bases, terminal_counts, terminals_from_keys

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def slugify_device_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise ValueError("Device name must contain letters or numbers.")
    return slug


def module_name_from_slug(slug: str) -> str:
    return slug.replace("-", "_")


def validate_png_upload(upload: FileStorage | None) -> FileStorage:
    if upload is None or not upload.filename:
        raise ValueError("A PNG device image is required.")
    if not upload.filename.lower().endswith(".png"):
        raise ValueError("Only .png files are accepted.")

    head = upload.stream.read(len(PNG_SIGNATURE))
    upload.stream.seek(0)
    if head != PNG_SIGNATURE:
        raise ValueError("Uploaded file is not a valid PNG image.")

    return upload


def parse_terminal_locations(raw_value: str | None, device_type: str) -> tuple[list[str], dict[str, dict[str, int]]]:
    if not raw_value:
        raise ValueError("Select at least one terminal location before submitting.")

    valid_bases = sorted(allowed_terminal_bases(device_type), key=len, reverse=True)
    key_pattern = re.compile(rf"^(?:{'|'.join(re.escape(base) for base in valid_bases)})(?:\d*)$")

    payload = json.loads(raw_value)
    if not isinstance(payload, list) or not payload:
        raise ValueError("Select at least one terminal location before submitting.")

    locations: dict[str, dict[str, int]] = {}
    for entry in payload:
        key = str(entry.get("key", "")).strip().upper()
        x = entry.get("x")
        y = entry.get("y")
        if not key:
            raise ValueError("Each mapped point must include a terminal key.")
        if not key_pattern.match(key):
            raise ValueError(f"Terminal '{key}' is not allowed for {device_type} devices.")
        if key in locations:
            raise ValueError(f"Terminal '{key}' can only be assigned once.")
        if not isinstance(x, int) or not isinstance(y, int):
            raise ValueError("Terminal coordinates must be integer pixels.")
        locations[key] = {"x": x, "y": y}

    terminals_from_keys(list(locations.keys()))
    return list(locations.keys()), locations


def render_device_module(
    name: str,
    slug: str,
    width_in: float,
    height_in: float,
    module_name: str,
    terminal_keys: list[str],
    terminal_locations: dict[str, dict[str, int]],
    description: str = "",
) -> str:
    constant_name = slug.upper().replace("-", "_")
    terminal_keys_literal = json.dumps(terminal_keys, indent=4)
    locations_literal = json.dumps(terminal_locations, indent=4)
    device_image_path = generated_image_url(module_name)
    width_cells = max(1, round(width_in))
    height_cells = max(1, round(height_in))

    return f'''"""{name} device profile."""

from app.devices.profile import DeviceProfile
from app.devices.terminals import terminal_counts, terminals_from_keys


{constant_name}_TERMINALS = terminals_from_keys({terminal_keys_literal})


{constant_name} = DeviceProfile(
    slug="{slug}",
    name="{name}",
    dimensions={{
        "planner_inches": {{"width": {width_in}, "height": {height_in}, "depth": 0.0}},
        "grid_cells": {{"width": {width_cells}, "height": {height_cells}}},
    }},
    images={{
        "device": "{device_image_path}",
        "terminal_map": "{device_image_path}",
    }},
    width_cells={width_cells},
    height_cells={height_cells},
    terminals={constant_name}_TERMINALS,
    terminal_locations={locations_literal},
    terminal_counts=terminal_counts({constant_name}_TERMINALS),
    notes={description!r},
)
'''


def create_device_files(
    name: str,
    width_in: float,
    height_in: float,
    image_upload: FileStorage,
    raw_terminal_locations: str | None,
    description: str = "",
    device_type: str = "Standard",
) -> dict:
    slug = slugify_device_name(name)
    module_name = module_name_from_slug(slug)
    ensure_generated_storage()
    device_folder = GENERATED_DEVICES_DIR / module_name
    device_file = device_folder / f"{module_name}.py"

    if device_folder.exists() or device_file.exists():
        raise ValueError(f"A device named '{slug}' already exists.")

    terminal_keys, terminal_locations = parse_terminal_locations(raw_terminal_locations, device_type)
    device_folder.mkdir(parents=True, exist_ok=False)
    image_path = device_folder / "device.png"

    try:
        image_upload.save(image_path)
        device_file.write_text(
            render_device_module(name, slug, width_in, height_in, module_name, terminal_keys, terminal_locations, description),
            encoding="utf-8",
        )
    except Exception:
        if image_path.exists():
            image_path.unlink()
        if device_file.exists():
            device_file.unlink()
        if device_folder.exists():
            device_folder.rmdir()
        raise

    return {"slug": slug, "module": module_name, "image": generated_image_url(module_name)}