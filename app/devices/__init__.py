"""Device registry for Shelly planner."""

from importlib import import_module, util
from pathlib import Path

from app.devices.profile import DeviceProfile
from app.storage import BUILTIN_DEVICES_DIR, GENERATED_DEVICES_DIR, ensure_generated_storage

_EXCLUDED_MODULES = {"__init__", "profile", "terminals"}


def _profiles_from_module(module) -> dict[str, DeviceProfile]:
    profiles: dict[str, DeviceProfile] = {}
    for value in vars(module).values():
        if isinstance(value, DeviceProfile):
            profiles[value.slug] = value
    return profiles


def _load_generated_module(path: Path):
    relative_stem = "_".join(path.with_suffix("").parts)
    spec = util.spec_from_file_location(f"generated_devices.{relative_stem}", path)
    if spec is None or spec.loader is None:
        return None

    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _discover_device_profiles() -> dict[str, DeviceProfile]:
    ensure_generated_storage()
    registry: dict[str, DeviceProfile] = {}

    for path in BUILTIN_DEVICES_DIR.glob("*.py"):
        if path.stem in _EXCLUDED_MODULES:
            continue

        module = import_module(f"app.devices.{path.stem}")
        registry.update(_profiles_from_module(module))

    for path in GENERATED_DEVICES_DIR.glob("**/*.py"):
        if path.name == "__init__.py":
            continue
        module = _load_generated_module(path)
        if module is None:
            continue
        registry.update(_profiles_from_module(module))

    return dict(sorted(registry.items(), key=lambda entry: entry[0]))


def list_device_profiles() -> list[dict]:
    return [profile.to_dict() for profile in _discover_device_profiles().values()]
