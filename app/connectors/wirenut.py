"""Wirenut connector profile."""

from app.connectors.profile import ConnectorProfile

WIRENUT = ConnectorProfile(
    slug="wirenut",
    name="Wirenut",
    connector_type="wirenut",
    dimensions={"planner_inches": {"width": 1, "height": 1}},
    images={"connector": "/static/images/connectors/wirenut/connector.png"},
    ports=1,
    port_positions=[{"key": "WN", "x": 0.5, "y": 0.5}],
)
