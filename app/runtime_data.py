"""Runtime inventory for generated data stored under import folders."""

from __future__ import annotations

from importlib import util
from pathlib import Path

from app.devices.profile import DeviceProfile
from app.junction_boxes.profile import JunctionBoxProfile
from app.storage import (
    IMPORT_ROOT,
    GENERATED_DEVICES_DIR,
    GENERATED_IMAGE_ROOT,
    GENERATED_JUNCTION_BOXES_DIR,
    GENERATED_JUNCTION_IMAGE_ROOT,
    ensure_generated_storage,
)


def _sorted_relative_files(root: Path, pattern: str) -> list[str]:
    if not root.exists():
        return []

    return sorted(
        str(path.relative_to(root)).replace("\\", "/")
        for path in root.glob(pattern)
        if path.is_file()
    )


def _sorted_relative_directories(root: Path) -> list[str]:
    if not root.exists():
        return []

    return sorted(
        str(path.relative_to(root)).replace("\\", "/")
        for path in root.iterdir()
        if path.is_dir()
    )


def collect_runtime_data_inventory() -> dict:
    ensure_generated_storage()

    return {
        "data_root": str(IMPORT_ROOT),
        "devices": {
            "profile_files": _sorted_relative_files(GENERATED_DEVICES_DIR, "**/*.py"),
            "image_directories": _sorted_relative_directories(GENERATED_IMAGE_ROOT),
            "image_files": _sorted_relative_files(GENERATED_IMAGE_ROOT, "**/*"),
        },
        "junction_boxes": {
            "profile_files": _sorted_relative_files(GENERATED_JUNCTION_BOXES_DIR, "**/*.py"),
            "image_directories": _sorted_relative_directories(GENERATED_JUNCTION_IMAGE_ROOT),
            "image_files": _sorted_relative_files(GENERATED_JUNCTION_IMAGE_ROOT, "**/*"),
        },
        "counts": {
            "device_profiles": len(_sorted_relative_files(GENERATED_DEVICES_DIR, "**/*.py")),
            "device_images": len(_sorted_relative_files(GENERATED_IMAGE_ROOT, "**/*")),
            "junction_box_profiles": len(_sorted_relative_files(GENERATED_JUNCTION_BOXES_DIR, "**/*.py")),
            "junction_box_images": len(_sorted_relative_files(GENERATED_JUNCTION_IMAGE_ROOT, "**/*")),
        },
    }


def _load_generated_module(module_path: Path):
    relative_stem = "_".join(module_path.with_suffix("").parts)
    spec = util.spec_from_file_location(f"runtime_data_check.{relative_stem}", module_path)
    if spec is None or spec.loader is None:
        return None

    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _iter_profiles(module, profile_type):
    return [value for value in vars(module).values() if isinstance(value, profile_type)]


def _module_name_from_slug(slug: str) -> str:
    return slug.replace("-", "_")


def _relative_image_dir_from_url(url: str, prefix: str) -> str | None:
    if not isinstance(url, str) or not url.startswith(prefix):
        return None

    remainder = url[len(prefix) :].lstrip("/")
    if not remainder:
        return None

    parts = remainder.split("/")
    return parts[0] if parts else None


def _check_generated_junction_boxes() -> list[dict]:
    issues: list[dict] = []
    slug_sources: dict[str, list[str]] = {}

    for profile_file in GENERATED_JUNCTION_BOXES_DIR.glob("**/*.py"):
        if profile_file.name == "__init__.py":
            continue

        file_id = str(profile_file.relative_to(GENERATED_JUNCTION_BOXES_DIR)).replace("\\", "/")
        try:
            module = _load_generated_module(profile_file)
            if module is None:
                issues.append(
                    {
                        "severity": "error",
                        "category": "junction_boxes",
                        "code": "module_load_failed",
                        "file": file_id,
                        "message": "Unable to load generated profile module.",
                    }
                )
                continue

            profiles = _iter_profiles(module, JunctionBoxProfile)
            if not profiles:
                issues.append(
                    {
                        "severity": "warning",
                        "category": "junction_boxes",
                        "code": "no_profile_in_module",
                        "file": file_id,
                        "message": "No JunctionBoxProfile found in generated module.",
                    }
                )
                continue

            for profile in profiles:
                slug_sources.setdefault(profile.slug, []).append(file_id)

                expected_module = _module_name_from_slug(profile.slug)
                if profile_file.stem != expected_module:
                    issues.append(
                        {
                            "severity": "warning",
                            "category": "junction_boxes",
                            "code": "filename_slug_mismatch",
                            "file": file_id,
                            "slug": profile.slug,
                            "expected_module": expected_module,
                            "message": (
                                f"Profile slug '{profile.slug}' expects file '{expected_module}.py' "
                                f"but found '{profile_file.name}'."
                            ),
                        }
                    )

                box_url = profile.images.get("box", "") if isinstance(profile.images, dict) else ""
                image_dir = _relative_image_dir_from_url(box_url, "/user-images/junction-boxes/")
                if image_dir is None:
                    issues.append(
                        {
                            "severity": "warning",
                            "category": "junction_boxes",
                            "code": "invalid_image_url",
                            "file": file_id,
                            "slug": profile.slug,
                            "message": "Image URL does not use '/user-images/junction-boxes/<folder>/...'.",
                        }
                    )
                elif image_dir != expected_module:
                    issues.append(
                        {
                            "severity": "warning",
                            "category": "junction_boxes",
                            "code": "image_dir_slug_mismatch",
                            "file": file_id,
                            "slug": profile.slug,
                            "image_dir": image_dir,
                            "expected_image_dir": expected_module,
                            "message": (
                                f"Image folder '{image_dir}' should be '{expected_module}' for slug '{profile.slug}'."
                            ),
                        }
                    )

        except Exception as exc:
            issues.append(
                {
                    "severity": "error",
                    "category": "junction_boxes",
                    "code": "module_exception",
                    "file": file_id,
                    "message": f"Error while loading module: {exc}",
                }
            )

    for slug, files in slug_sources.items():
        if len(files) > 1:
            issues.append(
                {
                    "severity": "error",
                    "category": "junction_boxes",
                    "code": "duplicate_slug",
                    "slug": slug,
                    "files": sorted(files),
                    "message": f"Slug '{slug}' is declared in multiple generated files.",
                }
            )

    return issues


def _check_generated_devices() -> list[dict]:
    issues: list[dict] = []
    slug_sources: dict[str, list[str]] = {}

    for profile_file in GENERATED_DEVICES_DIR.glob("**/*.py"):
        if profile_file.name == "__init__.py":
            continue

        file_id = str(profile_file.relative_to(GENERATED_DEVICES_DIR)).replace("\\", "/")
        try:
            module = _load_generated_module(profile_file)
            if module is None:
                issues.append(
                    {
                        "severity": "error",
                        "category": "devices",
                        "code": "module_load_failed",
                        "file": file_id,
                        "message": "Unable to load generated profile module.",
                    }
                )
                continue

            profiles = _iter_profiles(module, DeviceProfile)
            if not profiles:
                issues.append(
                    {
                        "severity": "warning",
                        "category": "devices",
                        "code": "no_profile_in_module",
                        "file": file_id,
                        "message": "No DeviceProfile found in generated module.",
                    }
                )
                continue

            for profile in profiles:
                slug_sources.setdefault(profile.slug, []).append(file_id)

                expected_module = _module_name_from_slug(profile.slug)
                if profile_file.stem != expected_module:
                    issues.append(
                        {
                            "severity": "warning",
                            "category": "devices",
                            "code": "filename_slug_mismatch",
                            "file": file_id,
                            "slug": profile.slug,
                            "expected_module": expected_module,
                            "message": (
                                f"Profile slug '{profile.slug}' expects file '{expected_module}.py' "
                                f"but found '{profile_file.name}'."
                            ),
                        }
                    )

                device_url = profile.images.get("device", "") if isinstance(profile.images, dict) else ""
                image_dir = _relative_image_dir_from_url(device_url, "/user-images/devices/")
                if image_dir is None:
                    issues.append(
                        {
                            "severity": "warning",
                            "category": "devices",
                            "code": "invalid_image_url",
                            "file": file_id,
                            "slug": profile.slug,
                            "message": "Image URL does not use '/user-images/devices/<folder>/...'.",
                        }
                    )
                elif image_dir != expected_module:
                    issues.append(
                        {
                            "severity": "warning",
                            "category": "devices",
                            "code": "image_dir_slug_mismatch",
                            "file": file_id,
                            "slug": profile.slug,
                            "image_dir": image_dir,
                            "expected_image_dir": expected_module,
                            "message": (
                                f"Image folder '{image_dir}' should be '{expected_module}' for slug '{profile.slug}'."
                            ),
                        }
                    )

        except Exception as exc:
            issues.append(
                {
                    "severity": "error",
                    "category": "devices",
                    "code": "module_exception",
                    "file": file_id,
                    "message": f"Error while loading module: {exc}",
                }
            )

    for slug, files in slug_sources.items():
        if len(files) > 1:
            issues.append(
                {
                    "severity": "error",
                    "category": "devices",
                    "code": "duplicate_slug",
                    "slug": slug,
                    "files": sorted(files),
                    "message": f"Slug '{slug}' is declared in multiple generated files.",
                }
            )

    return issues


def collect_runtime_data_consistency_report() -> dict:
    ensure_generated_storage()
    device_issues = _check_generated_devices()
    junction_box_issues = _check_generated_junction_boxes()
    issues = sorted(
        [*device_issues, *junction_box_issues],
        key=lambda issue: (issue.get("severity") != "error", issue.get("category", ""), issue.get("code", "")),
    )

    return {
        "data_root": str(DATA_ROOT),
        "ok": len(issues) == 0,
        "issue_count": len(issues),
        "issues": issues,
    }
