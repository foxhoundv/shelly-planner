"""Receptacle Decora Standard wiring device profile."""

from app.wiring_devices.profile import WiringDeviceProfile


RECEPTACLE_DECORA_STANDARD = WiringDeviceProfile(
    slug="receptacle-decora-standard",
    name="Receptacle Decora Standard",
    device_type="Receptacle",
    description='Decora Standard Receptacle, 120V, 15A rated.',
    dimensions={
        "planner_inches": {"width": 1.63, "height": 4.13, "depth": 0.0},
        "grid_cells": {"width": 2, "height": 4},
    },
    images={
        "device": "/user-images/wiring-devices/receptacle_decora_standard/device.png",
    },
    terminal_locations=[
    {
        "key": "N1",
        "x": 43,
        "y": 986
    },
    {
        "key": "N2",
        "x": 43,
        "y": 1264
    },
    {
        "key": "L1",
        "x": 827,
        "y": 983
    },
    {
        "key": "L2",
        "x": 827,
        "y": 1261
    },
    {
        "key": "G",
        "x": 46,
        "y": 1775
    }
],
    notes="",
)
