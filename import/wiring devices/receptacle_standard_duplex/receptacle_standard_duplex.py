"""Receptacle Standard Duplex wiring device profile."""

from app.wiring_devices.profile import WiringDeviceProfile


RECEPTACLE_STANDARD_DUPLEX = WiringDeviceProfile(
    slug="receptacle-standard-duplex",
    name="Receptacle Standard Duplex",
    device_type="Receptacle",
    description='Standard Duplex Receptacle, 120V, 15A rated',
    dimensions={
        "planner_inches": {"width": 1.63, "height": 4.13, "depth": 0.0},
        "grid_cells": {"width": 2, "height": 4},
    },
    images={
        "device": "/user-images/wiring-devices/receptacle_standard_duplex/device.png",
    },
    terminal_locations=[
    {
        "key": "N1",
        "x": 69,
        "y": 1022
    },
    {
        "key": "N2",
        "x": 69,
        "y": 1307
    },
    {
        "key": "L1",
        "x": 827,
        "y": 1022
    },
    {
        "key": "L2",
        "x": 827,
        "y": 1301
    },
    {
        "key": "G",
        "x": 53,
        "y": 1834
    }
],
    notes="",
)
