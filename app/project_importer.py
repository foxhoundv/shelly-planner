"""Persist imported project profile snapshots into generated import folders."""

from __future__ import annotations

import base64
import binascii
import json
from pathlib import Path
from pprint import pformat

from app.device_builder import module_name_from_slug as device_module_name_from_slug
from app.device_builder import render_device_module
from app.junction_box_builder import module_name_from_slug as junction_module_name_from_slug
from app.junction_box_builder import read_png_dimensions, render_junction_box_module
from app.storage import (
    GENERATED_CONNECTORS_DIR,
    GENERATED_CONNECTOR_IMAGE_ROOT,
    GENERATED_DEVICES_DIR,
    GENERATED_JUNCTION_BOXES_DIR,
    GENERATED_WIRING_DEVICES_DIR,
    ensure_generated_storage,
    generated_connector_image_url,
    generated_image_url,
    generated_junction_image_url,
    generated_wiring_image_url,
    resolve_asset_url_to_path,
)
from app.wiring_device_builder import module_name_from_slug as wiring_module_name_from_slug
from app.wiring_device_builder import render_wiring_device_module


def _parse_data_url_png(data_url: str) -> bytes | None:
    if not isinstance(data_url, str):
        return None
    marker = "data:image/png;base64,"
    if not data_url.startswith(marker):
        return None

    encoded = data_url[len(marker) :]
    try:
        return base64.b64decode(encoded)
    except (ValueError, binascii.Error):
        return None


def _write_png_from_assets(image_path: Path, candidate_paths: list[str], assets: dict) -> bool:
    for candidate in candidate_paths:
        if not candidate:
            continue

        data_url = assets.get(candidate)
        data = _parse_data_url_png(data_url) if data_url else None
        if data:
            image_path.write_bytes(data)
            return True

        resolved = resolve_asset_url_to_path(candidate)
        if resolved and resolved.exists() and resolved.suffix.lower() == ".png":
            image_path.write_bytes(resolved.read_bytes())
            return True

    return False


def _connector_module_name_from_slug(slug: str) -> str:
    return str(slug).replace("-", "_")


def _render_connector_module(
    *,
    name: str,
    slug: str,
    connector_type: str,
    dimensions: dict,
    ports: int,
    port_positions: list[dict],
    module_name: str,
) -> str:
    constant_name = slug.upper().replace("-", "_")
    return f'''"""{name} connector profile."""

from app.connectors.profile import ConnectorProfile

{constant_name} = ConnectorProfile(
    slug={slug!r},
    name={name!r},
    connector_type={connector_type!r},
    dimensions={pformat(dimensions, width=100, sort_dicts=False)},
    images={{"connector": {generated_connector_image_url(module_name)!r}}},
    ports={int(ports)},
    port_positions={pformat(port_positions, width=100, sort_dicts=False)},
)
'''


def persist_imported_profile_snapshot(profile_snapshot: dict | None, assets: dict | None) -> dict:
    ensure_generated_storage()
    snapshot = profile_snapshot if isinstance(profile_snapshot, dict) else {}
    asset_map = assets if isinstance(assets, dict) else {}

    result = {
        "devices": 0,
        "wiringDevices": 0,
        "junctionBoxes": 0,
        "connectors": 0,
    }

    for profile in snapshot.get("devices") or []:
        slug = str(profile.get("slug", "")).strip()
        name = str(profile.get("name", "")).strip()
        if not slug or not name:
            continue

        module_name = device_module_name_from_slug(slug)
        folder = GENERATED_DEVICES_DIR / module_name
        module_path = folder / f"{module_name}.py"
        image_path = folder / "device.png"
        if folder.exists() or module_path.exists():
            continue

        dimensions = profile.get("dimensions") or {}
        planner_inches = dimensions.get("planner_inches") or {}
        width_in = float(planner_inches.get("width") or 1)
        height_in = float(planner_inches.get("height") or 1)

        locations = profile.get("terminal_locations") or {}
        if not isinstance(locations, dict) or not locations:
            continue

        terminal_keys = []
        for terminal in profile.get("terminals") or []:
            key = str((terminal or {}).get("key", "")).strip().upper()
            if key and key not in terminal_keys:
                terminal_keys.append(key)

        if not terminal_keys:
            terminal_keys = [str(key).strip().upper() for key in locations.keys() if str(key).strip()]

        notes = str(profile.get("notes") or "")
        images = profile.get("images") or {}
        candidates = [str(images.get("device") or ""), str(images.get("terminal_map") or "")]

        folder.mkdir(parents=True, exist_ok=False)
        try:
            if not _write_png_from_assets(image_path, candidates, asset_map):
                folder.rmdir()
                continue

            module_path.write_text(
                render_device_module(
                    name=name,
                    slug=slug,
                    width_in=width_in,
                    height_in=height_in,
                    module_name=module_name,
                    terminal_keys=terminal_keys,
                    terminal_locations=locations,
                    description=notes,
                ),
                encoding="utf-8",
            )
            result["devices"] += 1
        except Exception:
            if image_path.exists():
                image_path.unlink()
            if module_path.exists():
                module_path.unlink()
            if folder.exists():
                folder.rmdir()
            raise

    for profile in snapshot.get("wiringDevices") or []:
        slug = str(profile.get("slug", "")).strip()
        name = str(profile.get("name", "")).strip()
        if not slug or not name:
            continue

        module_name = wiring_module_name_from_slug(slug)
        folder = GENERATED_WIRING_DEVICES_DIR / module_name
        module_path = folder / f"{module_name}.py"
        image_path = folder / "device.png"
        if folder.exists() or module_path.exists():
            continue

        dimensions = profile.get("dimensions") or {}
        planner_inches = dimensions.get("planner_inches") or {}
        width_in = float(planner_inches.get("width") or 1)
        height_in = float(planner_inches.get("height") or 1)
        device_type = str(profile.get("device_type") or "Other")
        description = str(profile.get("description") or "")
        terminal_locations = profile.get("terminal_locations") or []
        if not isinstance(terminal_locations, list) or not terminal_locations:
            continue

        images = profile.get("images") or {}
        candidates = [str(images.get("device") or "")]

        folder.mkdir(parents=True, exist_ok=False)
        try:
            if not _write_png_from_assets(image_path, candidates, asset_map):
                folder.rmdir()
                continue

            module_path.write_text(
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
            result["wiringDevices"] += 1
        except Exception:
            if image_path.exists():
                image_path.unlink()
            if module_path.exists():
                module_path.unlink()
            if folder.exists():
                folder.rmdir()
            raise

    for profile in snapshot.get("junctionBoxes") or []:
        slug = str(profile.get("slug", "")).strip()
        name = str(profile.get("name", "")).strip()
        if not slug or not name:
            continue

        module_name = junction_module_name_from_slug(slug)
        folder = GENERATED_JUNCTION_BOXES_DIR / module_name
        module_path = folder / f"{module_name}.py"
        image_path = folder / "box.png"
        if folder.exists() or module_path.exists():
            continue

        dimensions = profile.get("dimensions") or {}
        planner_inches = dimensions.get("planner_inches") or {}
        width_in = float(planner_inches.get("width") or 1)
        height_in = float(planner_inches.get("height") or 1)

        box_type = str(profile.get("box_type") or "PVC")
        environment = str(profile.get("environment") or "Indoor")
        gang = str(profile.get("gang") or "Single Gang")
        notes = str(profile.get("notes") or "")
        knockout_locations = profile.get("knockout_locations") or []
        if not isinstance(knockout_locations, list) or not knockout_locations:
            continue

        images = profile.get("images") or {}
        candidates = [str(images.get("box") or "")]

        folder.mkdir(parents=True, exist_ok=False)
        try:
            if not _write_png_from_assets(image_path, candidates, asset_map):
                folder.rmdir()
                continue

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
                    knockout_locations=knockout_locations,
                    img_width=img_width,
                    img_height=img_height,
                    description=notes,
                ),
                encoding="utf-8",
            )
            result["junctionBoxes"] += 1
        except Exception:
            if image_path.exists():
                image_path.unlink()
            if module_path.exists():
                module_path.unlink()
            if folder.exists():
                folder.rmdir()
            raise

    for profile in snapshot.get("connectors") or []:
        slug = str(profile.get("slug", "")).strip()
        name = str(profile.get("name", "")).strip()
        if not slug or not name:
            continue

        module_name = _connector_module_name_from_slug(slug)
        folder = GENERATED_CONNECTORS_DIR / module_name
        module_path = folder / f"{module_name}.py"
        image_path = folder / "connector.png"
        if folder.exists() or module_path.exists():
            continue

        connector_type = str(profile.get("connector_type") or slug)
        dimensions = profile.get("dimensions") or {"planner_inches": {"width": 1, "height": 1}}
        ports = int(profile.get("ports") or 1)
        port_positions = profile.get("port_positions") or []
        if not isinstance(port_positions, list) or not port_positions:
            continue

        images = profile.get("images") or {}
        candidates = [str(images.get("connector") or "")]

        folder.mkdir(parents=True, exist_ok=False)
        try:
            if not _write_png_from_assets(image_path, candidates, asset_map):
                folder.rmdir()
                continue

            module_path.write_text(
                _render_connector_module(
                    name=name,
                    slug=slug,
                    connector_type=connector_type,
                    dimensions=dimensions,
                    ports=ports,
                    port_positions=port_positions,
                    module_name=module_name,
                ),
                encoding="utf-8",
            )
            result["connectors"] += 1
        except Exception:
            if image_path.exists():
                image_path.unlink()
            if module_path.exists():
                module_path.unlink()
            if folder.exists():
                folder.rmdir()
            raise

    return result
