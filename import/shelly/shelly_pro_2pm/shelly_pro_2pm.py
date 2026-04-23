"""Shelly Pro 2PM device profile."""

from app.devices.profile import DeviceProfile
from app.devices.terminals import terminal_counts, terminals_from_keys


PRO_2PM_TERMINALS = terminals_from_keys([
    "O1",
    "O2",
    "I1",
    "I2",
    "SW1",
    "SW2",
    "LAN",
    "L1",
    "N",
])


SHELLY_PRO_2PM = DeviceProfile(
    slug="shelly-pro-2pm",
    name="Shelly Pro 2PM",
    dimensions={
        "planner_inches": {"width": 0.75, "height": 3.70, "depth": 2.71},
        "grid_cells": {"width": 3, "height": 2},
    },
    images={
        "device": "/user-images/devices/shelly_pro_2pm/device.png",
        "terminal_map": "/user-images/devices/shelly_pro_2pm/device.png",
    },
    width_cells=3,
    height_cells=2,
    terminals=PRO_2PM_TERMINALS,
    terminal_locations={
        "O1": {"x": 43, "y": 29},
        "O2": {"x": 43, "y": 66},
        "I1": {"x": 101, "y": 29},
        "I2": {"x": 107, "y": 66},
        "SW1": {"x": 82, "y": 628},
        "SW2": {"x": 120, "y": 628},
        "L1": {"x": 82, "y": 662},
        "N": {"x": 109, "y": 662},
        "LAN": {"x": 99, "y": 652},
    },
    terminal_counts=terminal_counts(PRO_2PM_TERMINALS),
    notes="US wiring helper assumes black hot, white neutral, green ground.",
)
