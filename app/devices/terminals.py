"""Master terminal definitions and helpers for Shelly planner devices."""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Terminal:
    key: str
    label: str
    display_label: str
    role: str
    family: str


# Allowed base terminal sets for Shelly authoring by selected type.
STANDARD_SHELLY_TERMINAL_BASES = ["L", "N", "O", "I", "SW", "┴", "+"]
PRO_EXTRA_SHELLY_TERMINAL_BASES = ["LAN", "IA", "IB", "IC", "IN", "A", "B", "C", "▲", "▼"]
ADDON_SHELLY_TERMINAL_BASES = ["VCC", "DATA", "GND", "ANALOG IN", "DIGITAL IN", "VREF OUT", "VREF + R1 OUT", "O", "I"]


# Master catalog of supported terminal families.
TERMINAL_MASTER = {
    "L": {"label": "L", "role": "line", "family": "L"},
    "N": {"label": "N", "role": "neutral", "family": "N"},
    "O": {"label": "O", "role": "output", "family": "O"},
    "I": {"label": "I", "role": "input", "family": "I"},
    "SW": {"label": "SW", "role": "switch", "family": "S"},
    "┴": {"label": "┴", "role": "common", "family": "C"},
    "+": {"label": "+", "role": "positive", "family": "P"},
    "LAN": {"label": "LAN", "role": "ethernet", "family": "LAN"},
    "IA": {"label": "IA", "role": "input-a", "family": "I"},
    "IB": {"label": "IB", "role": "input-b", "family": "I"},
    "IC": {"label": "IC", "role": "input-c", "family": "I"},
    "IN": {"label": "IN", "role": "input-neutral", "family": "N"},
    "VCC": {"label": "VCC", "role": "supply", "family": "PWR"},
    "DATA": {"label": "DATA", "role": "data", "family": "BUS"},
    "GND": {"label": "GND", "role": "ground", "family": "G"},
    "ANALOG IN": {"label": "ANALOG IN", "role": "analog-input", "family": "AIN"},
    "DIGITAL IN": {"label": "DIGITAL IN", "role": "digital-input", "family": "DIN"},
    "VREF OUT": {"label": "VREF OUT", "role": "reference-output", "family": "REF"},
    "VREF + R1 OUT": {"label": "VREF + R1 OUT", "role": "reference-r1-output", "family": "REF"},
    "A": {"label": "A", "role": "phase-a", "family": "PH"},
    "B": {"label": "B", "role": "phase-b", "family": "PH"},
    "C": {"label": "C", "role": "phase-c", "family": "PH"},
    "▲": {"label": "▲", "role": "up", "family": "DIR"},
    "▼": {"label": "▼", "role": "down", "family": "DIR"},
}

_TERMINAL_BASES_DESC = sorted(TERMINAL_MASTER.keys(), key=len, reverse=True)


def allowed_terminal_bases(device_type: str) -> list[str]:
    normalized = (device_type or "").strip().upper()
    if normalized == "PRO":
        return STANDARD_SHELLY_TERMINAL_BASES + PRO_EXTRA_SHELLY_TERMINAL_BASES
    if normalized == "ADD-ON":
        return ADDON_SHELLY_TERMINAL_BASES
    if normalized == "STANDARD":
        return STANDARD_SHELLY_TERMINAL_BASES
    raise ValueError("Device type must be Standard, PRO, or Add-On.")


def _split_terminal_key(key: str) -> tuple[str, str]:
    for base in _TERMINAL_BASES_DESC:
        if key.startswith(base):
            suffix = key[len(base):]
            if suffix.isdigit() or suffix == "":
                return base, suffix
    raise ValueError(f"Unsupported terminal key '{key}'. Add it to TERMINAL_MASTER first.")


def _terminal_from_key(key: str) -> Terminal:
    normalized = key.strip().upper()
    base_key, suffix = _split_terminal_key(normalized)
    master = TERMINAL_MASTER[base_key]
    label = f"{master['label']}{suffix}" if suffix else master["label"]
    return Terminal(
        key=normalized,
        label=label,
        display_label=label,
        role=master["role"],
        family=master["family"],
    )


def terminals_from_keys(keys: list[str]) -> list[Terminal]:
    return [_terminal_from_key(key) for key in keys]


def terminal_counts(terminals: list[Terminal]) -> dict[str, int]:
    counts = {"L": 0, "O": 0, "S": 0, "LAN": 0, "I": 0}
    for terminal in terminals:
        if terminal.family in counts:
            counts[terminal.family] += 1
    return counts


def terminals_to_dict(terminals: list[Terminal]) -> list[dict]:
    return [asdict(terminal) for terminal in terminals]


def terminal_picker_options(device_type: str = "Standard") -> list[dict]:
    return [asdict(_terminal_from_key(base)) for base in allowed_terminal_bases(device_type)]
