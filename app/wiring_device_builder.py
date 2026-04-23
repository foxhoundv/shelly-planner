"""Helpers for creating new wiring device profiles from uploaded images."""

from __future__ import annotations

import json
import re

from werkzeug.datastructures import FileStorage

from app.storage import GENERATED_WIRING_DEVICES_DIR, GENERATED_WIRING_IMAGE_ROOT, ensure_generated_storage, generated_wiring_image_url

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

VALID_DEVICE_TYPES = {"Switch", "Receptacle", "Light Fixture", "Other"}
# Matches L, N, G (bare) or L1, L2, N1, N2, G1, G2 … (numbered)
_TERMINAL_KEY_RE = re.compile(r'^[LNG]\d*$')


def _base_type(key: str) -> str:
    """Return the base letter of a terminal key, e.g. 'L1' → 'L'."""
    return key[0]


def slugify_name(name: str) -> str:
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


def parse_terminal_locations(raw_value: str | None) -> list[dict]:
    if not raw_value:
        raise ValueError("Map at least one terminal location before submitting.")

    payload = json.loads(raw_value)
    if not isinstance(payload, list) or not payload:
        raise ValueError("Map at least one terminal location before submitting.")

    locations: list[dict] = []
    seen_keys: set[str] = set()
    for entry in payload:
        key = str(entry.get("key", "")).strip().upper()
        x = entry.get("x")
        y = entry.get("y")
        if not _TERMINAL_KEY_RE.match(key):
            raise ValueError(f"Invalid terminal key '{key}'. Must be L, N, or G (optionally followed by a number).")
        if key in seen_keys:
            raise ValueError(f"Terminal '{key}' appears more than once.")
        if not isinstance(x, int) or not isinstance(y, int):
            raise ValueError("Terminal coordinates must be integer pixels.")
        seen_keys.add(key)
        locations.append({"key": key, "x": x, "y": y})

    return locations


def render_wiring_device_module(
    name: str,
    slug: str,
    device_type: str,
    description: str,
    width_in: float,
    height_in: float,
    module_name: str,
    terminal_locations: list[dict],
) -> str:
    constant_name = slug.upper().replace("-", "_")
    locations_literal = json.dumps(terminal_locations, indent=4)
    image_url = generated_wiring_image_url(module_name)
    width_cells = max(1, round(width_in))
    height_cells = max(1, round(height_in))

    return f'''\
"""{name} wiring device profile."""

from app.wiring_devices.profile import WiringDeviceProfile


{constant_name} = WiringDeviceProfile(
    slug="{slug}",
    name="{name}",
    device_type="{device_type}",
    description={description!r},
    dimensions={{
        "planner_inches": {{"width": {width_in}, "height": {height_in}, "depth": 0.0}},
        "grid_cells": {{"width": {width_cells}, "height": {height_cells}}},
    }},
    images={{
        "device": "{image_url}",
    }},
    terminal_locations={locations_literal},
    notes="",
)
'''


def create_wiring_device_files(
    name: str,
    device_type: str,
    description: str,
    width_in: float,
    height_in: float,
    image_upload: FileStorage,
    raw_terminal_locations: str | None,
) -> dict:
    if device_type not in VALID_DEVICE_TYPES:
        raise ValueError(f"Invalid device type '{device_type}'.")

    slug = slugify_name(name)
    module_name = module_name_from_slug(slug)
    ensure_generated_storage()

    device_folder = GENERATED_WIRING_DEVICES_DIR / module_name
    device_file = device_folder / f"{module_name}.py"

    if device_folder.exists() or device_file.exists():
        raise ValueError(f"A wiring device named '{slug}' already exists.")

    terminal_locations = parse_terminal_locations(raw_terminal_locations)
    device_folder.mkdir(parents=True, exist_ok=False)
    image_path = device_folder / "device.png"

    try:
        image_upload.save(image_path)
        device_file.write_text(
            render_wiring_device_module(
                name=name,
                slug=slug,
                device_type=device_type,
                description=description,
                width_in=width_in,
                height_in=height_in,
                module_name=module_name,
                terminal_locations=terminal_locations,
            ),
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

    return {"slug": slug, "module": module_name, "image": generated_wiring_image_url(module_name)}
