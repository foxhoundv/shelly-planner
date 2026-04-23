"""Shelly Pro 1PM device profile."""

from app.devices.profile import DeviceProfile
from app.devices.terminals import terminal_counts, terminals_from_keys


PRO_1PM_TERMINALS = terminals_from_keys([
    "O1",
    "I1",
    "SW1",
    "SW2",
    "LAN",
    "L1",
    "N",
])


SHELLY_PRO_1PM = DeviceProfile(
    slug="shelly-pro-1pm",
    name="Shelly Pro 1PM",
    dimensions={
        "planner_inches": {"width": 0.75, "height": 3.70, "depth": 2.71},
        "grid_cells": {"width": 2, "height": 2},
    },
    images={
        "device": "/user-images/devices/shelly_pro_1pm/device.png",
        "terminal_map": "/user-images/devices/shelly_pro_1pm/device.png",
    },
    width_cells=2,
    height_cells=2,
    terminals=PRO_1PM_TERMINALS,
    terminal_locations={
        "O1": {"x": 25, "y": 12},
        "I1": {"x": 52, "y": 12},
        "SW1": {"x": 39, "y": 270},
        "SW2": {"x": 57, "y": 270},
        "L1": {"x": 42, "y": 286},
        "N": {"x": 59, "y": 286},
        "LAN": {"x": 48, "y": 280},
    },
    terminal_counts=terminal_counts(PRO_1PM_TERMINALS),
    notes="US wiring helper assumes black hot, white neutral, green ground.",
)
