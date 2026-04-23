"""5-port Wago connector profile."""

from app.connectors.profile import ConnectorProfile

WAGO_5 = ConnectorProfile(
    slug="wago-5",
    name="Wago 5-Port",
    connector_type="wago-5",
    dimensions={"planner_inches": {"width": 3.25, "height": 1}},
    images={"connector": "/static/images/connectors/wago_5/wago5.png"},
    ports=5,
    port_positions=[
        {"key": "P1", "x": 133, "y": 450},
        {"key": "P2", "x": 256, "y": 450},
        {"key": "P3", "x": 376, "y": 450},
        {"key": "P4", "x": 501, "y": 450},
        {"key": "P5", "x": 623, "y": 450},
    ],
)
