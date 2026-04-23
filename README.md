# Shelly Planner

Version: 1.0

Dockerized Flask web app for planning physical wiring layouts using Shelly PRO devices.

## Current Features

- Draggable planning grid with moveable elements.
- Add junction boxes via type/environment/gang selector with step-by-step configuration.
- PVC junction boxes support custom width/height; other types use fixed dimensions and fixed knock-out maps.
- US wiring bundles per live circuit:
  - Black = hot
  - White = neutral
  - Green = ground
- Device registry in Python with one file per product.
- Junction box registry in Python with built-in profiles and generated profiles.
- First supported product: Shelly Pro 2PM.
- Draw and clear circuit bundles from a selected junction box to a selected device.

## Project Structure

- `app/devices/shelly_pro_2pm.py`: Shelly Pro 2PM device profile.
- `app/devices/__init__.py`: Device registry.
- `app/junction_boxes/`: Junction box profiles and registry.
- `app/junction_box_builder.py`: Junction box generation helpers.
- `app/main.py`: Flask app and API routes.
- `app/templates/index.html`: Main UI.
- `app/templates/add_junction_box.html`: Junction box authoring UI.
- `app/static/js/app.js`: Planner behavior and wire drawing.
- `app/static/js/add-junction-box.js`: Junction box knock-out mapping UI.
- `app/static/css/styles.css`: Visual styling.

## Run With Docker

```bash
docker compose up --build
```

Generated devices and uploaded PNG assets are stored in the host-side `data/` directory, which is bind-mounted into the container at `/data`. That keeps custom devices after container restarts, rebuilds, or replacement.

The app can also report exactly what generated content it currently sees under `/data`:

- `GET /api/runtime-data`
- `GET /api/runtime-data/consistency`

That endpoint lists generated device and junction box profile files plus generated image files/directories. It is useful for verifying that rebuilt containers are still seeing persisted user-created content.

The consistency endpoint validates generated files and reports problems such as:

- Profile filename does not match the profile slug.
- Image folder path does not match the profile slug.
- Duplicate generated slugs in multiple files.
- Generated modules that cannot be loaded.

If users see "already exists" errors after renaming items, call `GET /api/runtime-data/consistency` first to find stale or mismatched generated references.

For Docker deployments, make sure generated data is read from `/data` (the mounted volume path). In Compose, set:

```yaml
environment:
  SHELLY_PLANNER_DATA_DIR: /data
```

If this value points somewhere else (for example `/app/data`), generated profiles/images can exist on disk but not appear in the app.

Then open:

- http://localhost:8000

## Run Locally (Without Docker)

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
python -m app.main
```

## Adding More Shelly PRO Products

1. Create a new device file in `app/devices/` (one product per `.py` file).
2. Export a profile object from that file.
3. Register it in `app/devices/__init__.py`.

## Generated Device Persistence

- Devices created from the Add New Device page are written to `data/devices/`.
- Uploaded images for generated devices are written to `data/images/devices/`.
- With Docker Compose, `./data` is mounted into the container, so generated devices persist after container shutdown or rebuild.
