"""Unit tests for validate_magic_bytes — covers all file type branches."""

import pytest

from app.core.file_validation import validate_magic_bytes


class TestValidateMagicBytes:
    # ── JPEG ─────────────────────────────────────────────────────────────────

    def test_valid_jpeg(self):
        data = b"\xff\xd8\xff\xe0" + b"\x00" * 100
        assert validate_magic_bytes(".jpg", data) is True

    def test_valid_jpeg_alt_ext(self):
        data = b"\xff\xd8\xff\xe1" + b"\x00" * 100
        assert validate_magic_bytes(".jpeg", data) is True

    def test_invalid_jpeg_wrong_magic(self):
        data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        assert validate_magic_bytes(".jpg", data) is False

    # ── PNG ──────────────────────────────────────────────────────────────────

    def test_valid_png(self):
        data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        assert validate_magic_bytes(".png", data) is True

    def test_invalid_png_wrong_magic(self):
        data = b"\xff\xd8\xff\xe0" + b"\x00" * 100
        assert validate_magic_bytes(".png", data) is False

    # ── WebP ─────────────────────────────────────────────────────────────────

    def test_valid_webp(self):
        # RIFF....WEBP
        data = b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 100
        assert validate_magic_bytes(".webp", data) is True

    def test_webp_missing_webp_marker(self):
        data = b"RIFF\x00\x00\x00\x00NOPE" + b"\x00" * 100
        assert validate_magic_bytes(".webp", data) is False

    def test_webp_too_short_for_webp_marker(self):
        # RIFF header present but data < 12 bytes
        data = b"RIFF\x00\x00\x00\x00WEB"
        assert validate_magic_bytes(".webp", data) is False

    def test_webp_wrong_prefix(self):
        data = b"NOPE\x00\x00\x00\x00WEBP"
        assert validate_magic_bytes(".webp", data) is False

    # ── HEIC/HEIF ────────────────────────────────────────────────────────────

    def test_valid_heic(self):
        # 4-byte size | "ftyp" | brand
        data = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 100
        assert validate_magic_bytes(".heic", data) is True

    def test_valid_heif(self):
        data = b"\x00\x00\x00\x18ftypmif1" + b"\x00" * 100
        assert validate_magic_bytes(".heif", data) is True

    @pytest.mark.parametrize(
        "brand", [b"heic", b"heix", b"mif1", b"msf1", b"hevc", b"hevx"]
    )
    def test_heic_all_valid_brands(self, brand):
        data = b"\x00\x00\x00\x18ftyp" + brand + b"\x00" * 100
        assert validate_magic_bytes(".heic", data) is True

    def test_heic_invalid_brand(self):
        data = b"\x00\x00\x00\x18ftypxxxx" + b"\x00" * 100
        assert validate_magic_bytes(".heic", data) is False

    def test_heic_missing_ftyp(self):
        data = b"\x00\x00\x00\x18NOPEheic" + b"\x00" * 100
        assert validate_magic_bytes(".heic", data) is False

    def test_heic_too_short(self):
        # HEIC needs at least 12 bytes
        data = b"\x00\x00\x00\x18ftyp"  # only 8 bytes
        assert validate_magic_bytes(".heic", data) is False

    # ── Edge cases ───────────────────────────────────────────────────────────

    def test_data_too_short(self):
        assert validate_magic_bytes(".jpg", b"\xff\xd8") is False

    def test_empty_data(self):
        assert validate_magic_bytes(".jpg", b"") is False

    def test_unknown_extension(self):
        data = b"\x00" * 100
        assert validate_magic_bytes(".bmp", data) is False
