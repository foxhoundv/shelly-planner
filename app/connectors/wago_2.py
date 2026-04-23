"""2-port Wago connector profile."""

from app.connectors.profile import ConnectorProfile

WAGO_2 = ConnectorProfile(
    slug="wago-2",
    name="Wago 2-Port",
    connector_type="wago-2",
    dimensions={"planner_inches": {"width": 1.3, "height": 1}},
    images={"connector": "/static/images/connectors/wago_2/wago2.png"},
    ports=2,
    port_positions=[
        {"key": "P1", "x": 136, "y": 404},
        {"key": "P2", "x": 250, "y": 404},
    ],
)
