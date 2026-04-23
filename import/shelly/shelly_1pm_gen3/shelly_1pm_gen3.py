"""Shelly 1PM Gen3 device profile."""

from app.devices.profile import DeviceProfile
from app.devices.terminals import terminal_counts, terminals_from_keys


SHELLY_1PM_GEN3_TERMINALS = terminals_from_keys([
    "O",
    "SW",
    "L1",
    "L2",
    "L3",
    "N1",
    "N2"
])


SHELLY_1PM_GEN3 = DeviceProfile(
    slug="shelly-1pm-gen3",
    name="Shelly 1PM Gen3",
    dimensions={
        "planner_inches": {"width": 1.65, "height": 1.46, "depth": 0.0},
        "grid_cells": {"width": 2, "height": 1},
    },
    images={
        "device": "/user-images/devices/shelly_1pm_gen3/device.png",
        "terminal_map": "/user-images/devices/shelly_1pm_gen3/device.png",
    },
    width_cells=2,
    height_cells=1,
    terminals=SHELLY_1PM_GEN3_TERMINALS,
    terminal_locations={
    "O": {
        "x": 155,
        "y": 69
    },
    "SW": {
        "x": 277,
        "y": 73
    },
    "L1": {
        "x": 394,
        "y": 71
    },
    "L2": {
        "x": 517,
        "y": 68
    },
    "L3": {
        "x": 640,
        "y": 71
    },
    "N1": {
        "x": 763,
        "y": 72
    },
    "N2": {
        "x": 881,
        "y": 68
    }
},
    terminal_counts=terminal_counts(SHELLY_1PM_GEN3_TERMINALS),
    notes='Shelly 1PM for 1 circuit',
)
