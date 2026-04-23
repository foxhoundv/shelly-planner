"""Wiring device profile discovery."""

from __future__ import annotations

import importlib.util
import sys

from app.storage import GENERATED_WIRING_DEVICES_DIR
from app.wiring_devices.profile import WiringDeviceProfile


def _discover_wiring_device_profiles() -> list[WiringDeviceProfile]:
    profiles: list[WiringDeviceProfile] = []
    if not GENERATED_WIRING_DEVICES_DIR.exists():
        return profiles

    for path in GENERATED_WIRING_DEVICES_DIR.glob("**/*.py"):
        if path.name == "__init__.py":
            continue

        relative = path.relative_to(GENERATED_WIRING_DEVICES_DIR)
        module_name = "wiring_device_generated_" + "_".join(relative.with_suffix("").parts)

        if module_name in sys.modules:
            module = sys.modules[module_name]
        else:
            spec = importlib.util.spec_from_file_location(module_name, path)
            if spec is None or spec.loader is None:
                continue
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            try:
                spec.loader.exec_module(module)
            except Exception:
                del sys.modules[module_name]
                continue

        for attr in vars(module).values():
            if isinstance(attr, WiringDeviceProfile):
                profiles.append(attr)

    return profiles


def list_wiring_device_profiles() -> list[dict]:
    return [p.to_dict() for p in _discover_wiring_device_profiles()]
