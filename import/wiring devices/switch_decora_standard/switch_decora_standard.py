"""Switch Decora Standard wiring device profile."""

from app.wiring_devices.profile import WiringDeviceProfile


SWITCH_DECORA_STANDARD = WiringDeviceProfile(
    slug="switch-decora-standard",
    name="Switch Decora Standard",
    device_type="Switch",
    description='Decora Standard Switch, 120V, 15A, rated, single pole.',
    dimensions={
        "planner_inches": {"width": 1.38, "height": 4.13, "depth": 0.0},
        "grid_cells": {"width": 1, "height": 4},
    },
    images={
        "device": "/user-images/wiring-devices/switch_decora_standard/device.png",
    },
    terminal_locations=[
    {
        "key": "G",
        "x": 69,
        "y": 473
    },
    {
        "key": "L1",
        "x": 670,
        "y": 866
    },
    {
        "key": "L2",
        "x": 664,
        "y": 1398
    }
],
    notes="",
)
