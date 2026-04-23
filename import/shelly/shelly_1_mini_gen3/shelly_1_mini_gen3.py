"""Shelly 1 Mini Gen3 device profile."""

from app.devices.profile import DeviceProfile
from app.devices.terminals import terminal_counts, terminals_from_keys


SHELLY_1_MINI_GEN3_TERMINALS = terminals_from_keys([
    "SW",
    "O",
    "I",
    "L",
    "N"
])


SHELLY_1_MINI_GEN3 = DeviceProfile(
    slug="shelly-1-mini-gen3",
    name="Shelly 1 Mini Gen3",
    dimensions={
        "planner_inches": {"width": 1.34, "height": 1.12, "depth": 0.0},
        "grid_cells": {"width": 1, "height": 1},
    },
    images={
        "device": "/user-images/devices/shelly_1_mini_gen3/device.png",
        "terminal_map": "/user-images/devices/shelly_1_mini_gen3/device.png",
    },
    width_cells=1,
    height_cells=1,
    terminals=SHELLY_1_MINI_GEN3_TERMINALS,
    terminal_locations={
    "SW": {
        "x": 192,
        "y": 99
    },
    "O": {
        "x": 339,
        "y": 98
    },
    "I": {
        "x": 482,
        "y": 95
    },
    "L": {
        "x": 626,
        "y": 98
    },
    "N": {
        "x": 771,
        "y": 97
    }
},
    terminal_counts=terminal_counts(SHELLY_1_MINI_GEN3_TERMINALS),
    notes='Shelly 1 for 1 circuit. Dry Contacts',
)
