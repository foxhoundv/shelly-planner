"""Junction box registry."""

from importlib import util
from pathlib import Path

from app.junction_boxes.catalog import built_in_junction_boxes
from app.junction_boxes.profile import JunctionBoxProfile
from app.storage import GENERATED_JUNCTION_BOXES_DIR, ensure_generated_storage


def _profiles_from_module(module) -> dict[str, JunctionBoxProfile]:
    profiles: dict[str, JunctionBoxProfile] = {}
    for value in vars(module).values():
        if isinstance(value, JunctionBoxProfile):
            profiles[value.slug] = value
    return profiles


def _load_generated_module(path: Path):
    relative_stem = "_".join(path.with_suffix("").parts)
    spec = util.spec_from_file_location(f"generated_junction_boxes.{relative_stem}", path)
    if spec is None or spec.loader is None:
        return None

    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def list_junction_box_profiles() -> list[dict]:
    ensure_generated_storage()
    built_in_registry: dict[str, JunctionBoxProfile] = {profile.slug: profile for profile in built_in_junction_boxes()}
    generated_registry: dict[str, JunctionBoxProfile] = {}

    for path in GENERATED_JUNCTION_BOXES_DIR.glob("**/*.py"):
        if path.name == "__init__.py":
            continue
        module = _load_generated_module(path)
        if module is None:
            continue
        generated_registry.update(_profiles_from_module(module))

    entries = []
    for profile in sorted(built_in_registry.values(), key=lambda profile: profile.slug):
        payload = profile.to_dict()
        payload["is_generated"] = False
        entries.append(payload)

    for profile in sorted(generated_registry.values(), key=lambda profile: profile.slug):
        payload = profile.to_dict()
        payload["is_generated"] = True
        entries.append(payload)

    return entries
