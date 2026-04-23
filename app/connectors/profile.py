"""Connector profile models."""

import struct
from dataclasses import asdict, dataclass
from pathlib import Path

from app.storage import resolve_asset_url_to_path


def _static_asset_path(asset_url: str) -> Path | None:
    return resolve_asset_url_to_path(asset_url)


def _has_reference_size(size: dict | None) -> bool:
    return (
        isinstance(size, dict)
        and isinstance(size.get("width"), (int, float))
        and isinstance(size.get("height"), (int, float))
        and size["width"] > 0
        and size["height"] > 0
    )


def _read_png_size(asset_path: Path) -> dict | None:
    if not asset_path.exists() or asset_path.suffix.lower() != ".png":
        return None

    with asset_path.open("rb") as handle:
        header = handle.read(24)

    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        return None

    width, height = struct.unpack(">II", header[16:24])
    if width <= 0 or height <= 0:
        return None

    return {"width": width, "height": height}


def _uses_pixel_port_positions(port_positions: list[dict]) -> bool:
    for pos in port_positions:
        x = pos.get("x") if isinstance(pos, dict) else None
        y = pos.get("y") if isinstance(pos, dict) else None
        if isinstance(x, (int, float)) and x > 1:
            return True
        if isinstance(y, (int, float)) and y > 1:
            return True
    return False


@dataclass(frozen=True)
class ConnectorProfile:
    slug: str
    name: str
    connector_type: str
    dimensions: dict
    images: dict
    ports: int
    port_positions: list[dict]

    def _resolved_port_reference_size(self) -> dict | None:
        configured = self.images.get("image_reference_size")
        if _has_reference_size(configured):
            return configured

        if not _uses_pixel_port_positions(self.port_positions):
            return None

        asset_path = _static_asset_path(self.images.get("connector", ""))
        if not asset_path:
            return None

        return _read_png_size(asset_path)

    def to_dict(self) -> dict:
        payload = asdict(self)
        payload["images"]["image_reference_size"] = self._resolved_port_reference_size()
        return payload
