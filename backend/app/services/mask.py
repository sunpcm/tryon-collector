"""Mask generation — retouched minus tryon difference mask.

Uses OpenCV to compute absolute pixel difference, convert to grayscale,
and apply binary threshold. Produces a mask highlighting regions where
the retouched image differs from the tryon output.
"""

from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np

MASK_THRESHOLD = int(os.getenv("MASK_THRESHOLD", "30"))


class MaskError(Exception):
    pass


def generate_mask(
    retouched_path: Path,
    tryon_path: Path,
    output_path: Path,
    threshold: int = MASK_THRESHOLD,
) -> Path:
    """Generate a binary difference mask from retouched − tryon.

    Args:
        retouched_path: Path to the retouched image.
        tryon_path: Path to the tryon image.
        output_path: Where to write the mask (PNG).
        threshold: Pixel difference threshold (0-255). Differences below
                   this value are suppressed to black.

    Returns:
        output_path on success.

    Raises:
        MaskError: If images can't be read or have mismatched dimensions.
    """
    img_ret = cv2.imread(str(retouched_path), cv2.IMREAD_COLOR)
    if img_ret is None:
        raise MaskError(f"cannot read retouched image: {retouched_path}")

    img_try = cv2.imread(str(tryon_path), cv2.IMREAD_COLOR)
    if img_try is None:
        raise MaskError(f"cannot read tryon image: {tryon_path}")

    if img_ret.shape != img_try.shape:
        raise MaskError(
            f"dimension mismatch: retouched {img_ret.shape} vs tryon {img_try.shape}"
        )

    diff = cv2.absdiff(img_ret, img_try)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), mask)
    return output_path
