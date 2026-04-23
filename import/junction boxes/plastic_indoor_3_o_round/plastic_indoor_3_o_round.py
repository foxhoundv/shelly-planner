"""Plastic Indoor 3-O Round junction box profile."""

from app.junction_boxes.profile import JunctionBoxProfile


PLASTIC_INDOOR_3_O_ROUND = JunctionBoxProfile(
    slug="plastic-indoor-3-o-round",
    name="Plastic Indoor 3-O Round",
    box_type="Plastic",
    environment="Indoor",
    gang="Round",
    dimensions={
        "planner_inches": {"width": 3.0, "height": 3.0, "depth": 2.0},
    },
    images={
        "box": "/user-images/junction-boxes/plastic_indoor_3_o_round/box.png",
        "image_reference_size": {"width": 1422, "height": 1418},
    },
    knockout_locations=[
    {
        "key": "KO1",
        "x": 425,
        "y": 430
    },
    {
        "key": "KO2",
        "x": 616,
        "y": 313
    },
    {
        "key": "KO3",
        "x": 409,
        "y": 989
    },
    {
        "key": "KO4",
        "x": 605,
        "y": 1106
    },
    {
        "key": "KO5",
        "x": 932,
        "y": 493
    }
],
    max_circuits=5,
    supports_custom_size=False,
    notes='Plastic Round box, 21 cu. in.',
)
