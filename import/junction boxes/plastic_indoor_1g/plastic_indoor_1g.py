"""Plastic Indoor 1G junction box profile."""

from app.junction_boxes.profile import JunctionBoxProfile


PLASTIC_INDOOR_1G = JunctionBoxProfile(
    slug="plastic-indoor-1g",
    name="Plastic Indoor 1G",
    box_type="Plastic",
    environment="Indoor",
    gang="Single Gang",
    dimensions={
        "planner_inches": {"width": 2.38, "height": 3.75, "depth": 2.0},
    },
    images={
        "box": "/user-images/junction-boxes/plastic_indoor_1g/box.png",
        "image_reference_size": {"width": 1270, "height": 1978},
    },
    knockout_locations=[
    {
        "key": "KO1",
        "x": 424,
        "y": 389
    },
    {
        "key": "KO2",
        "x": 856,
        "y": 394
    },
    {
        "key": "KO3",
        "x": 429,
        "y": 1516
    },
    {
        "key": "KO4",
        "x": 856,
        "y": 1516
    }
],
    max_circuits=4,
    supports_custom_size=False,
    notes='Single Gang Plastic box, 24 cu. in.',
)
