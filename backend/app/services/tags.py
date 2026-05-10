"""Tags configuration service — reads/writes storage/tags.json."""

from __future__ import annotations

import json
import os
from pathlib import Path

STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", "storage"))
_TAGS_FILE = STORAGE_ROOT / "tags.json"

_DEFAULT_TAGS = {
    "business_lines": ["春季女装", "秋季女装", "春季男装", "秋季男装", "童装", "配饰"],
    "categories": ["连衣裙", "上衣", "裤子", "外套", "裙子", "鞋履", "包袋", "其他"],
}


def get_tags() -> dict[str, list[str]]:
    """Read tags from storage/tags.json, falling back to defaults."""
    if _TAGS_FILE.is_file():
        try:
            data = json.loads(_TAGS_FILE.read_text(encoding="utf-8"))
            if (
                isinstance(data.get("business_lines"), list)
                and isinstance(data.get("categories"), list)
            ):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return dict(_DEFAULT_TAGS)


def save_tags(tags: dict[str, list[str]]) -> None:
    """Write tags to storage/tags.json."""
    _TAGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _TAGS_FILE.write_text(json.dumps(tags, ensure_ascii=False, indent=2), encoding="utf-8")
