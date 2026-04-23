"""Junction box profile models."""

from dataclasses import asdict, dataclass, field


@dataclass(frozen=True)
class JunctionBoxProfile:
    slug: str
    name: str
    box_type: str
    environment: str
    gang: str
    dimensions: dict
    images: dict
    knockout_locations: list[dict]
    max_circuits: int
    supports_custom_size: bool
    notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)
