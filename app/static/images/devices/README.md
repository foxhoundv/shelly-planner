# Device Images And Terminal Maps

Create one folder per Shelly device slug under this directory.

Example:

- `app/static/images/devices/shelly_pro_2pm/device.png`
- `app/static/images/devices/shelly_pro_2pm/terminals.png`

- `app/static/images/devices/shelly_pro_1pm/device.png`
- `app/static/images/devices/shelly_pro_1pm/terminals.png`

## Expected Files

- `device.png`: front image used on the planner block.
- `terminals.png`: optional terminal-position reference image.

## Terminal Locations

Terminal positions are configured per device in Python with normalized values:

- `x`: `0.0` (left) to `1.0` (right)
- `y`: `0.0` (top) to `1.0` (bottom)

When you update a device image, adjust `terminal_locations` in the matching device `.py` file so markers line up.
