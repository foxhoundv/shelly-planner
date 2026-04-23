"""Wiring device profile model."""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class WiringDeviceProfile:
    slug: str
    name: str
    device_type: str
    description: str
    dimensions: dict
    images: dict
    terminal_locations: list[dict]
    notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)
