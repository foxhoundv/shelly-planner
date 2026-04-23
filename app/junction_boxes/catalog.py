"""Built-in junction box profiles."""

from app.junction_boxes.profile import JunctionBoxProfile

BOX_TYPES = ("Metal", "Plastic", "Fiber", "PVC")
ENVIRONMENTS = ("Indoor", "Outdoor")
GANGS = (
    ("Round", 1),
    ("Single Gang", 1),
    ("Two Gang", 2),
    ("Three Gang", 3),
    ("Four Gang", 4),
)


def _slugify(value: str) -> str:
    return value.lower().replace(" ", "-")


def _fixed_knockouts(gang_count: int) -> list[dict]:
    # Evenly spread knock-outs around edges for fixed-size non-PVC boxes.
    positions = []
    x_step = 1 / (gang_count + 1)
    for index in range(1, gang_count + 1):
        x = round(x_step * index, 4)
        positions.append({"key": f"TOP{index}", "x": x, "y": 0.02, "side": "top"})
        positions.append({"key": f"BOTTOM{index}", "x": x, "y": 0.98, "side": "bottom"})

    positions.extend([
        {"key": "LEFT1", "x": 0.02, "y": 0.28, "side": "left"},
        {"key": "LEFT2", "x": 0.02, "y": 0.72, "side": "left"},
        {"key": "RIGHT1", "x": 0.98, "y": 0.28, "side": "right"},
        {"key": "RIGHT2", "x": 0.98, "y": 0.72, "side": "right"},
    ])
    return positions


def built_in_junction_boxes() -> list[JunctionBoxProfile]:
    profiles: list[JunctionBoxProfile] = []

    for box_type in BOX_TYPES:
        for environment in ENVIRONMENTS:
            for gang_label, gang_count in GANGS:
                slug = f"{_slugify(box_type)}-{_slugify(environment)}-{_slugify(gang_label)}"
                width = float(gang_count + 1)
                height = 4.0
                supports_custom_size = box_type == "PVC"
                profiles.append(
                    JunctionBoxProfile(
                        slug=slug,
                        name=f"{box_type} {environment} {gang_label}",
                        box_type=box_type,
                        environment=environment,
                        gang=gang_label,
                        dimensions={
                            "planner_inches": {"width": width, "height": height, "depth": 2.0},
                        },
                        images={
                            "box": f"/static/images/junction_boxes/{slug}.png",
                        },
                        knockout_locations=[] if supports_custom_size else _fixed_knockouts(gang_count),
                        max_circuits=4 + (gang_count * 2),
                        supports_custom_size=supports_custom_size,
                    )
                )

    return profiles
