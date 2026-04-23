"""Switch Single Toggle wiring device profile."""

from app.wiring_devices.profile import WiringDeviceProfile


SWITCH_SINGLE_TOGGLE = WiringDeviceProfile(
    slug="switch-single-toggle",
    name="Switch Single Toggle",
    device_type="Switch",
    description='Standard 120V 15A rated Toggle switch',
    dimensions={
        "planner_inches": {"width": 1.25, "height": 4.19, "depth": 0.0},
        "grid_cells": {"width": 1, "height": 4},
    },
    images={
        "device": "/user-images/wiring-devices/switch_single_toggle/device.png",
    },
    terminal_locations=[
    {
        "key": "G",
        "x": 250,
        "y": 616
    },
    {
        "key": "L1",
        "x": 730,
        "y": 899
    },
    {
        "key": "L2",
        "x": 739,
        "y": 1452
    }
],
    notes="",
)
