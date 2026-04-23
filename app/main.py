from flask import Flask, jsonify, render_template, request, send_from_directory

from app.connectors import list_connector_profiles
from app.device_builder import create_device_files, validate_png_upload
from app.devices import list_device_profiles
from app.junction_box_builder import create_junction_box_files, validate_png_upload as validate_junction_png_upload
from app.junction_boxes import list_junction_box_profiles
from app.runtime_data import collect_runtime_data_consistency_report, collect_runtime_data_inventory
from app.storage import (
    GENERATED_CONNECTOR_IMAGE_ROOT,
    GENERATED_IMAGE_ROOT,
    GENERATED_JUNCTION_IMAGE_ROOT,
    GENERATED_WIRING_IMAGE_ROOT,
    ensure_generated_storage,
)
from app.devices.terminals import terminal_picker_options
from app.wiring_device_builder import create_wiring_device_files, validate_png_upload as validate_wiring_png_upload
from app.wiring_devices import list_wiring_device_profiles
from app.project_importer import persist_imported_profile_snapshot

app = Flask(__name__)
ensure_generated_storage()


@app.get("/")
def index() -> str:
    return render_template("landing.html")


@app.get("/planner")
def planner() -> str:
    return render_template("index.html")


@app.get("/tutorial")
def tutorial() -> str:
    return render_template("tutorial.html")


@app.get("/devices/new")
def add_device_page() -> str:
    return render_template("add_device.html")


@app.get("/junction-boxes/new")
def add_junction_box_page() -> str:
    return render_template("add_junction_box.html")


@app.get("/wiring-devices/new")
def add_wiring_device_page() -> str:
    return render_template("add_wiring_device.html")


@app.get("/api/devices")
def devices() -> tuple:
    return jsonify({"devices": list_device_profiles()})


@app.get("/api/connectors")
def connectors() -> tuple:
    return jsonify({"connectors": list_connector_profiles()})


@app.get("/api/junction-boxes")
def junction_boxes() -> tuple:
    return jsonify({"junction_boxes": list_junction_box_profiles()})


@app.get("/api/wiring-devices")
def wiring_devices() -> tuple:
    return jsonify({"wiring_devices": list_wiring_device_profiles()})


@app.get("/api/terminals")
def terminal_options() -> tuple:
    device_type = str(request.args.get("device_type", "Standard")).strip()
    return jsonify({"terminals": terminal_picker_options(device_type)})


@app.get("/api/runtime-data")
def runtime_data() -> tuple:
    return jsonify(collect_runtime_data_inventory())


@app.get("/api/runtime-data/consistency")
def runtime_data_consistency() -> tuple:
    return jsonify(collect_runtime_data_consistency_report())


@app.get("/user-images/devices/<path:filename>")
def generated_device_image(filename: str):
    return send_from_directory(GENERATED_IMAGE_ROOT, filename)


@app.get("/user-images/junction-boxes/<path:filename>")
def generated_junction_box_image(filename: str):
    return send_from_directory(GENERATED_JUNCTION_IMAGE_ROOT, filename)


@app.get("/user-images/wiring-devices/<path:filename>")
def generated_wiring_device_image(filename: str):
    return send_from_directory(GENERATED_WIRING_IMAGE_ROOT, filename)


@app.get("/user-images/connectors/<path:filename>")
def generated_connector_image(filename: str):
    return send_from_directory(GENERATED_CONNECTOR_IMAGE_ROOT, filename)


@app.post("/api/projects/import-snapshot")
def import_project_snapshot() -> tuple:
    try:
        payload = request.get_json(silent=True) or {}
        profile_snapshot = payload.get("profileSnapshot")
        assets = payload.get("assets")
        imported = persist_imported_profile_snapshot(profile_snapshot, assets)
        return jsonify({"ok": True, "imported": imported}), 200
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/devices")
def create_device() -> tuple:
    try:
        name = str(request.form.get("name", "")).strip()
        device_type = str(request.form.get("device_type", "Standard")).strip()
        if not name:
            raise ValueError("Device name is required.")

        width_in = float(request.form.get("width_in", "0"))
        height_in = float(request.form.get("height_in", "0"))
        if width_in <= 0 or height_in <= 0:
            raise ValueError("Width and height must be greater than zero.")

        image_upload = validate_png_upload(request.files.get("image"))
        result = create_device_files(
            name=name,
            width_in=width_in,
            height_in=height_in,
            image_upload=image_upload,
            raw_terminal_locations=request.form.get("terminal_locations"),
            description=str(request.form.get("description", "")).strip(),
            device_type=device_type,
        )
        return jsonify({"ok": True, **result}), 201
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/junction-boxes")
def create_junction_box() -> tuple:
    try:
        name = str(request.form.get("name", "")).strip()
        box_type = str(request.form.get("box_type", "")).strip()
        environment = str(request.form.get("environment", "")).strip()
        gang = str(request.form.get("gang", "")).strip()
        if not name or not box_type or not environment or not gang:
            raise ValueError("Name, box type, environment, and gang are required.")

        width_in = float(request.form.get("width_in", "0"))
        height_in = float(request.form.get("height_in", "0"))
        if width_in <= 0 or height_in <= 0:
            raise ValueError("Width and height must be greater than zero.")

        image_upload = validate_junction_png_upload(request.files.get("image"))
        result = create_junction_box_files(
            name=name,
            box_type=box_type,
            environment=environment,
            gang=gang,
            width_in=width_in,
            height_in=height_in,
            image_upload=image_upload,
            raw_knockout_locations=request.form.get("knockout_locations"),
            description=str(request.form.get("description", "")).strip(),
        )
        return jsonify({"ok": True, **result}), 201
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/wiring-devices")
def create_wiring_device() -> tuple:
    try:
        name = str(request.form.get("name", "")).strip()
        device_type = str(request.form.get("device_type", "")).strip()
        if not name or not device_type:
            raise ValueError("Name and device type are required.")

        width_in = float(request.form.get("width_in", "0"))
        height_in = float(request.form.get("height_in", "0"))
        if width_in <= 0 or height_in <= 0:
            raise ValueError("Width and height must be greater than zero.")

        image_upload = validate_wiring_png_upload(request.files.get("image"))
        result = create_wiring_device_files(
            name=name,
            device_type=device_type,
            description=str(request.form.get("description", "")).strip(),
            width_in=width_in,
            height_in=height_in,
            image_upload=image_upload,
            raw_terminal_locations=request.form.get("terminal_locations"),
        )
        return jsonify({"ok": True, **result}), 201
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
