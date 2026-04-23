"""Helpers for creating new junction box profiles from uploaded images."""

from __future__ import annotations

import json
import re
import struct
from pathlib import Path

from werkzeug.datastructures import FileStorage

from app.storage import (
    GENERATED_JUNCTION_BOXES_DIR,
    GENERATED_JUNCTION_IMAGE_ROOT,
    ensure_generated_storage,
    generated_junction_image_url,
)

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def read_png_dimensions(path: Path) -> tuple[int, int]:
    """Read width and height from a saved PNG via its IHDR chunk."""
    with open(path, "rb") as fh:
        fh.read(8)   # PNG signature
        fh.read(4)   # IHDR chunk length
        fh.read(4)   # b"IHDR"
        width = struct.unpack(">I", fh.read(4))[0]
        height = struct.unpack(">I", fh.read(4))[0]
    return width, height


def slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise ValueError("Junction box name must contain letters or numbers.")
    return slug


def module_name_from_slug(slug: str) -> str:
    return slug.replace("-", "_")


def validate_png_upload(upload: FileStorage | None) -> FileStorage:
    if upload is None or not upload.filename:
        raise ValueError("A PNG junction box image is required.")
    if not upload.filename.lower().endswith(".png"):
        raise ValueError("Only .png files are accepted.")

    head = upload.stream.read(len(PNG_SIGNATURE))
    upload.stream.seek(0)
    if head != PNG_SIGNATURE:
        raise ValueError("Uploaded file is not a valid PNG image.")

    return upload


def parse_knockout_locations(raw_value: str | None) -> list[dict]:
    if not raw_value:
        raise ValueError("Select at least one knock-out location before submitting.")

    payload = json.loads(raw_value)
    if not isinstance(payload, list) or not payload:
        raise ValueError("Select at least one knock-out location before submitting.")

    locations: list[dict] = []
    for index, entry in enumerate(payload, start=1):
        x = entry.get("x")
        y = entry.get("y")
        key = str(entry.get("key", "")).strip() or f"KO{index}"
        if not isinstance(x, int) or not isinstance(y, int):
            raise ValueError("Knock-out coordinates must be integer pixels.")
        locations.append({"key": key, "x": x, "y": y})

    return locations


def render_junction_box_module(
    name: str,
    slug: str,
    box_type: str,
    environment: str,
    gang: str,
    width_in: float,
    height_in: float,
    module_name: str,
    knockout_locations: list[dict],
    img_width: int = 0,
    img_height: int = 0,
    description: str = "",
) -> str:
    const_name = slug.upper().replace("-", "_")
    locations_literal = json.dumps(knockout_locations, indent=4)
    image_url = generated_junction_image_url(module_name)
    max_circuits = max(1, len(knockout_locations))
    ref_size_entry = f'        "image_reference_size": {{"width": {img_width}, "height": {img_height}}},\n' if img_width and img_height else ""

    return f'''\
"""{name} junction box profile."""

from app.junction_boxes.profile import JunctionBoxProfile


{const_name} = JunctionBoxProfile(
    slug="{slug}",
    name="{name}",
    box_type="{box_type}",
    environment="{environment}",
    gang="{gang}",
    dimensions={{
        "planner_inches": {{"width": {width_in}, "height": {height_in}, "depth": 2.0}},
    }},
    images={{
        "box": "{image_url}",
{ref_size_entry}    }},
    knockout_locations={locations_literal},
    max_circuits={max_circuits},
    supports_custom_size=False,
    notes={description!r},
)
'''


def create_junction_box_files(
    name: str,
    box_type: str,
    environment: str,
    gang: str,
    width_in: float,
    height_in: float,
    image_upload: FileStorage,
    raw_knockout_locations: str | None,
    description: str = "",
) -> dict:
    slug = slugify_name(name)
    module_name = module_name_from_slug(slug)
    ensure_generated_storage()

    folder = GENERATED_JUNCTION_BOXES_DIR / module_name
    module_path = folder / f"{module_name}.py"
    if folder.exists() or module_path.exists():
        raise ValueError(f"A junction box named '{slug}' already exists.")

    knockouts = parse_knockout_locations(raw_knockout_locations)
    folder.mkdir(parents=True, exist_ok=False)
    image_path = folder / "box.png"

    try:
        image_upload.save(image_path)
        img_width, img_height = read_png_dimensions(image_path)
        module_path.write_text(
            render_junction_box_module(
                name=name,
                slug=slug,
                box_type=box_type,
                environment=environment,
                gang=gang,
                width_in=width_in,
                height_in=height_in,
                module_name=module_name,
                knockout_locations=knockouts,
                img_width=img_width,
                img_height=img_height,
                description=description,
            ),
            encoding="utf-8",
        )
    except Exception:
        if image_path.exists():
            image_path.unlink()
        if module_path.exists():
            module_path.unlink()
        if folder.exists():
            folder.rmdir()
        raise

    return {
        "slug": slug,
        "module": module_name,
        "image": generated_junction_image_url(module_name),
    }
