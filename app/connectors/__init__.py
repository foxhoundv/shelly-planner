"""Connector registry for Shelly planner."""

from importlib import import_module, util
from pathlib import Path

from app.connectors.profile import ConnectorProfile
from app.storage import GENERATED_CONNECTORS_DIR, ensure_generated_storage

_EXCLUDED_MODULES = {"__init__", "profile"}
_BUILTIN_DIR = Path(__file__).resolve().parent


def _profiles_from_module(module) -> dict[str, ConnectorProfile]:
    profiles: dict[str, ConnectorProfile] = {}
    for value in vars(module).values():
        if isinstance(value, ConnectorProfile):
            profiles[value.slug] = value
    return profiles


def _load_generated_module(path: Path):
    relative_stem = "_".join(path.with_suffix("").parts)
    spec = util.spec_from_file_location(f"generated_connectors.{relative_stem}", path)
    if spec is None or spec.loader is None:
        return None

    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _discover_connector_profiles() -> dict[str, ConnectorProfile]:
    ensure_generated_storage()
    registry: dict[str, ConnectorProfile] = {}

    for path in _BUILTIN_DIR.glob("*.py"):
        if path.stem in _EXCLUDED_MODULES:
            continue

        module = import_module(f"app.connectors.{path.stem}")
        registry.update(_profiles_from_module(module))

    for path in GENERATED_CONNECTORS_DIR.glob("**/*.py"):
        if path.name == "__init__.py":
            continue
        module = _load_generated_module(path)
        if module is None:
            continue
        registry.update(_profiles_from_module(module))

    return dict(sorted(registry.items(), key=lambda entry: entry[0]))


def list_connector_profiles() -> list[dict]:
    return [profile.to_dict() for profile in _discover_connector_profiles().values()]
