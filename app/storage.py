"""Storage locations for built-in and generated device assets."""

from __future__ import annotations

import os
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = APP_ROOT.parent
IMPORT_ROOT = PROJECT_ROOT / "import"


def _resolve_data_root() -> Path:
    configured = os.getenv("SHELLY_PLANNER_DATA_DIR")
    if configured:
        return Path(configured)

    # In containers we mount the persisted runtime volume at /data.
    mounted_data_root = Path("/data")
    if mounted_data_root.exists():
        return mounted_data_root

    return PROJECT_ROOT / "data"

BUILTIN_DEVICES_DIR = APP_ROOT / "devices"
BUILTIN_IMAGE_ROOT = APP_ROOT / "static" / "images" / "devices"
BUILTIN_JUNCTION_IMAGE_ROOT = APP_ROOT / "static" / "images" / "junction_boxes"

DATA_ROOT = _resolve_data_root()
GENERATED_DEVICES_DIR = IMPORT_ROOT / "shelly"
GENERATED_IMAGE_ROOT = GENERATED_DEVICES_DIR
GENERATED_IMAGE_URL_PREFIX = "/user-images/devices"
GENERATED_JUNCTION_BOXES_DIR = IMPORT_ROOT / "junction boxes"
GENERATED_JUNCTION_IMAGE_ROOT = GENERATED_JUNCTION_BOXES_DIR
GENERATED_JUNCTION_IMAGE_URL_PREFIX = "/user-images/junction-boxes"
GENERATED_WIRING_DEVICES_DIR = IMPORT_ROOT / "wiring devices"
GENERATED_WIRING_IMAGE_ROOT = GENERATED_WIRING_DEVICES_DIR
GENERATED_WIRING_IMAGE_URL_PREFIX = "/user-images/wiring-devices"
GENERATED_CONNECTORS_DIR = IMPORT_ROOT / "connectors"
GENERATED_CONNECTOR_IMAGE_ROOT = GENERATED_CONNECTORS_DIR
GENERATED_CONNECTOR_IMAGE_URL_PREFIX = "/user-images/connectors"


def ensure_generated_storage() -> None:
    GENERATED_DEVICES_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_JUNCTION_BOXES_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_WIRING_DEVICES_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_CONNECTORS_DIR.mkdir(parents=True, exist_ok=True)


def generated_image_url(module_name: str) -> str:
    return f"{GENERATED_IMAGE_URL_PREFIX}/{module_name}/device.png"


def generated_junction_image_url(module_name: str) -> str:
    return f"{GENERATED_JUNCTION_IMAGE_URL_PREFIX}/{module_name}/box.png"


def generated_wiring_image_url(module_name: str) -> str:
    return f"{GENERATED_WIRING_IMAGE_URL_PREFIX}/{module_name}/device.png"


def generated_connector_image_url(module_name: str) -> str:
    return f"{GENERATED_CONNECTOR_IMAGE_URL_PREFIX}/{module_name}/connector.png"


def resolve_asset_url_to_path(asset_url: str) -> Path | None:
    if not asset_url:
        return None

    if asset_url.startswith("/static/"):
        relative_parts = asset_url.removeprefix("/static/").split("/")
        return APP_ROOT / "static" / Path(*relative_parts)

    if asset_url.startswith(f"{GENERATED_IMAGE_URL_PREFIX}/"):
        relative_parts = asset_url.removeprefix(f"{GENERATED_IMAGE_URL_PREFIX}/").split("/")
        return GENERATED_IMAGE_ROOT / Path(*relative_parts)

    if asset_url.startswith(f"{GENERATED_JUNCTION_IMAGE_URL_PREFIX}/"):
        relative_parts = asset_url.removeprefix(f"{GENERATED_JUNCTION_IMAGE_URL_PREFIX}/").split("/")
        return GENERATED_JUNCTION_IMAGE_ROOT / Path(*relative_parts)

    if asset_url.startswith(f"{GENERATED_WIRING_IMAGE_URL_PREFIX}/"):
        relative_parts = asset_url.removeprefix(f"{GENERATED_WIRING_IMAGE_URL_PREFIX}/").split("/")
        return GENERATED_WIRING_IMAGE_ROOT / Path(*relative_parts)

    if asset_url.startswith(f"{GENERATED_CONNECTOR_IMAGE_URL_PREFIX}/"):
        relative_parts = asset_url.removeprefix(f"{GENERATED_CONNECTOR_IMAGE_URL_PREFIX}/").split("/")
        return GENERATED_CONNECTOR_IMAGE_ROOT / Path(*relative_parts)

    return None