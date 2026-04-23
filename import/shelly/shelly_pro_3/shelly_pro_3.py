"""Shelly Pro 3 device profile."""

from app.devices.profile import DeviceProfile
from app.devices.terminals import terminal_counts, terminals_from_keys


SHELLY_PRO_3_TERMINALS = terminals_from_keys([
    "N",
    "L1",
    "SW1",
    "SW2",
    "SW3",
    "I1",
    "O1",
    "I2",
    "O2",
    "I3",
    "O3",
    "LAN",
])


SHELLY_PRO_3 = DeviceProfile(
    slug="shelly-pro-3",
    name="Shelly Pro 3",
    dimensions={
        "planner_inches": {"width": 2.01, "height": 3.78, "depth": 0.0},
        "grid_cells": {"width": 2, "height": 4},
    },
    images={
        "device": "/user-images/devices/shelly_pro_3/device.png",
        "terminal_map": "/user-images/devices/shelly_pro_3/device.png",
    },
    width_cells=2,
    height_cells=4,
    terminals=SHELLY_PRO_3_TERMINALS,
    terminal_locations={
        "N": {"x": 448, "y": 785},
        "L1": {"x": 398, "y": 783},
        "SW1": {"x": 347, "y": 782},
        "SW2": {"x": 293, "y": 783},
        "SW3": {"x": 243, "y": 781},
        "I1": {"x": 431, "y": 74},
        "O1": {"x": 379, "y": 74},
        "I2": {"x": 269, "y": 73},
        "O2": {"x": 219, "y": 74},
        "I3": {"x": 102, "y": 73},
        "O3": {"x": 56, "y": 70},
        "LAN": {"x": 110, "y": 815},
    },
    terminal_counts=terminal_counts(SHELLY_PRO_3_TERMINALS),
    notes="",
)
