"""3-port Wago connector profile."""

from app.connectors.profile import ConnectorProfile

WAGO_3 = ConnectorProfile(
    slug="wago-3",
    name="Wago 3-Port",
    connector_type="wago-3",
    dimensions={"planner_inches": {"width": 1.95, "height": 1}},
    images={"connector": "/static/images/connectors/wago_3/wago3.png"},
    ports=3,
    port_positions=[
        {"key": "P1", "x": 146, "y": 413},
        {"key": "P2", "x": 259, "y": 413},
        {"key": "P3", "x": 373, "y": 413},
    ],
)
