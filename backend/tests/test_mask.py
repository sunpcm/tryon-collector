"""Tests for mask.py — OpenCV difference mask generation."""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
import pytest

from app.services.mask import MaskError, generate_mask


def _write_image(path: Path, color: tuple[int, int, int], size: tuple[int, int] = (100, 100)):
    """Write a solid-color JPEG image."""
    img = np.full((*size, 3), color, dtype=np.uint8)
    cv2.imwrite(str(path), img)


@pytest.fixture()
def images(tmp_path):
    """Create two test images and an output path."""
    ret_path = tmp_path / "retouched.jpg"
    try_path = tmp_path / "tryon.jpg"
    out_path = tmp_path / "mask.png"
    return ret_path, try_path, out_path


def test_identical_images_produce_black_mask(images):
    ret_path, try_path, out_path = images
    _write_image(ret_path, (128, 128, 128))
    _write_image(try_path, (128, 128, 128))

    generate_mask(ret_path, try_path, out_path)

    mask = cv2.imread(str(out_path), cv2.IMREAD_GRAYSCALE)
    assert mask is not None
    assert np.all(mask == 0)  # all black


def test_different_images_produce_white_mask(images):
    ret_path, try_path, out_path = images
    _write_image(ret_path, (255, 255, 255))
    _write_image(try_path, (0, 0, 0))

    generate_mask(ret_path, try_path, out_path, threshold=10)

    mask = cv2.imread(str(out_path), cv2.IMREAD_GRAYSCALE)
    assert mask is not None
    assert np.all(mask == 255)  # all white


def test_partial_difference(images):
    ret_path, try_path, out_path = images
    # retouched: left half white, right half black
    img_ret = np.zeros((100, 100, 3), dtype=np.uint8)
    img_ret[:, :50] = 255
    cv2.imwrite(str(ret_path), img_ret)

    # tryon: all black
    _write_image(try_path, (0, 0, 0))

    generate_mask(ret_path, try_path, out_path, threshold=10)

    mask = cv2.imread(str(out_path), cv2.IMREAD_GRAYSCALE)
    assert mask is not None
    # left half should be white, right half black
    assert np.all(mask[:, :50] == 255)
    assert np.all(mask[:, 50:] == 0)


def test_threshold_suppresses_small_differences(images):
    ret_path, try_path, out_path = images
    _write_image(ret_path, (128, 128, 128))
    _write_image(try_path, (130, 130, 130))  # diff = 2

    generate_mask(ret_path, try_path, out_path, threshold=10)

    mask = cv2.imread(str(out_path), cv2.IMREAD_GRAYSCALE)
    assert mask is not None
    assert np.all(mask == 0)  # diff below threshold → suppressed


def test_dimension_mismatch_raises(images):
    ret_path, try_path, out_path = images
    _write_image(ret_path, (128, 128, 128), size=(100, 100))
    _write_image(try_path, (128, 128, 128), size=(80, 80))

    with pytest.raises(MaskError, match="dimension mismatch"):
        generate_mask(ret_path, try_path, out_path)


def test_unreadable_retouched_raises(images):
    ret_path, try_path, out_path = images
    # don't create retouched file
    _write_image(try_path, (128, 128, 128))

    with pytest.raises(MaskError, match="cannot read retouched"):
        generate_mask(ret_path, try_path, out_path)


def test_unreadable_tryon_raises(images):
    ret_path, try_path, out_path = images
    _write_image(ret_path, (128, 128, 128))
    # don't create tryon file

    with pytest.raises(MaskError, match="cannot read tryon"):
        generate_mask(ret_path, try_path, out_path)


def test_output_is_binary_mask(images):
    ret_path, try_path, out_path = images
    _write_image(ret_path, (200, 200, 200))
    _write_image(try_path, (50, 50, 50))

    generate_mask(ret_path, try_path, out_path, threshold=30)

    mask = cv2.imread(str(out_path), cv2.IMREAD_GRAYSCALE)
    assert mask is not None
    # mask should only contain 0 and 255
    unique_values = set(np.unique(mask).tolist())
    assert unique_values <= {0, 255}
