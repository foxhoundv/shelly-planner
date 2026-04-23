"""Plastic Indoor 2G junction box profile."""

from app.junction_boxes.profile import JunctionBoxProfile


PLASTIC_INDOOR_2G = JunctionBoxProfile(
    slug="plastic-indoor-2g",
    name="Plastic Indoor 2G",
    box_type="Plastic",
    environment="Indoor",
    gang="Two Gang",
    dimensions={
        "planner_inches": {"width": 4.0, "height": 3.75, "depth": 2.0},
    },
    images={
        "box": "/user-images/junction-boxes/plastic_indoor_2g/box.png",
        "image_reference_size": {"width": 1552, "height": 1444},
    },
    knockout_locations=[
    {
        "key": "KO1",
        "x": 336,
        "y": 306
    },
    {
        "key": "KO2",
        "x": 635,
        "y": 304
    },
    {
        "key": "KO3",
        "x": 833,
        "y": 302
    },
    {
        "key": "KO4",
        "x": 1135,
        "y": 300
    },
    {
        "key": "KO5",
        "x": 338,
        "y": 1150
    },
    {
        "key": "KO6",
        "x": 631,
        "y": 1149
    },
    {
        "key": "KO7",
        "x": 835,
        "y": 1149
    },
    {
        "key": "KO8",
        "x": 1135,
        "y": 1143
    },
    {
        "key": "KO9",
        "x": 479,
        "y": 520
    },
    {
        "key": "KO10",
        "x": 979,
        "y": 916
    }
],
    max_circuits=10,
    supports_custom_size=False,
    notes='Plastic 2 gang box, 44 cu. in.',
)
