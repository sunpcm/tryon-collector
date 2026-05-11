"""Brand catalogue service — reads/writes storage/brands.json.

Mirrors the tags.py pattern but for the showcase-ingestion flow. The list is
shared across all designers (no per-user state) and survives server restarts.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))
_BRANDS_FILE = STORAGE_ROOT / "brands.json"

_DEFAULT_BRANDS: list[str] = []


def get_brands() -> list[str]:
    if _BRANDS_FILE.is_file():
        try:
            data = json.loads(_BRANDS_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list) and all(isinstance(x, str) for x in data):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return list(_DEFAULT_BRANDS)


def save_brands(brands: list[str]) -> None:
    _BRANDS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _BRANDS_FILE.write_text(
        json.dumps(brands, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def add_brand(brand: str) -> list[str]:
    """Add *brand* to the catalogue if absent, preserving insertion order."""
    brands = get_brands()
    if brand and brand not in brands:
        brands.append(brand)
        save_brands(brands)
    return brands
