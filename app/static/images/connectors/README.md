# Connector Images

Place connector PNG images in the folders below using the exact filename `connector.png`.

Folders:
- `wirenut/connector.png`
- `wago_2/connector.png`
- `wago_3/connector.png`
- `wago_5/connector.png`

These paths are referenced by the built-in connector profile files in `app/connectors/`.

Port coordinates:
- In each connector `.py` file, `port_positions` may use normalized values (`0..1`) or pixel coordinates from the PNG.
- If you use pixel coordinates, the app will normalize them against `images.image_reference_size`.
- You can set `image_reference_size` manually in the profile, or let the app derive it automatically from the PNG dimensions.

Recommended:
- Use transparent PNGs.
- Keep the artwork tightly cropped around the connector body.
- Preserve a horizontal layout for Wago connectors so port markers line up with the existing positions.
