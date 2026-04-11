"""
Security tests for image sanitization and ClamAV malware scanning.

pytest -m security -v tests/security/test_file_sanitization.py
"""

import io
import struct
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from PIL import Image


# ---------------------------------------------------------------------------
# Helpers — build minimal valid image bytes in memory
# ---------------------------------------------------------------------------


def _make_jpeg(width: int = 10, height: int = 10) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png(width: int = 10, height: int = 10, mode: str = "RGB") -> bytes:
    buf = io.BytesIO()
    img = Image.new(mode, (width, height), color=(0, 255, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_webp(width: int = 10, height: int = 10) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(0, 0, 255))
    img.save(buf, format="WEBP")
    return buf.getvalue()


def _jpeg_with_exif() -> bytes:
    """Build a minimal JPEG that includes an EXIF GPS tag."""
    from PIL import Image
    from PIL.ExifTags import TAGS

    buf = io.BytesIO()
    img = Image.new("RGB", (10, 10), color=(128, 128, 128))
    exif = img.getexif()
    # Tag 0x0112 = Orientation (safe, always present in real cameras)
    exif[0x0112] = 6
    img.save(buf, format="JPEG", exif=exif.tobytes())
    return buf.getvalue()


# ---------------------------------------------------------------------------
# A04 — Image sanitization (Pillow re-encode, always on)
# ---------------------------------------------------------------------------


@pytest.mark.security
class TestImageSanitization:
    """Pillow re-encode must strip metadata and always produce valid JPEG output."""

    def test_jpeg_sanitized_is_valid_jpeg(self) -> None:
        from app.core.file_security import sanitize_image

        result = sanitize_image(_make_jpeg())
        assert result[:3] == b"\xff\xd8\xff"  # JPEG magic bytes

    def test_png_sanitized_to_jpeg(self) -> None:
        from app.core.file_security import sanitize_image

        png_bytes = _make_png()
        result = sanitize_image(png_bytes)
        # Output must be JPEG regardless of input format
        assert result[:3] == b"\xff\xd8\xff"

    def test_webp_sanitized_to_jpeg(self) -> None:
        from app.core.file_security import sanitize_image

        result = sanitize_image(_make_webp())
        assert result[:3] == b"\xff\xd8\xff"

    def test_rgba_png_converted_without_error(self) -> None:
        """RGBA PNG (has alpha channel) must be downconverted to RGB before JPEG save."""
        from app.core.file_security import sanitize_image

        result = sanitize_image(_make_png(mode="RGBA"))
        assert result[:3] == b"\xff\xd8\xff"

    def test_exif_stripped_after_sanitization(self) -> None:
        """EXIF metadata present in the source image must not appear in the output."""
        from app.core.file_security import sanitize_image

        dirty = _jpeg_with_exif()

        # Confirm EXIF is present in original (APP1 marker = FF E1)
        assert b"\xff\xe1" in dirty

        clean = sanitize_image(dirty)

        # Re-open and confirm no EXIF
        img = Image.open(io.BytesIO(clean))
        exif = img.getexif()
        assert len(exif) == 0, f"Expected no EXIF after sanitization, got: {dict(exif)}"

    def test_unrecognised_format_falls_back_to_original(self) -> None:
        """If Pillow cannot decode the bytes (e.g. HEIC without pillow-heif),
        the original bytes must be returned unchanged — not an exception."""
        from PIL import UnidentifiedImageError

        from app.core.file_security import sanitize_image

        garbage = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 100  # minimal HEIC-like header

        with patch("PIL.Image.open", side_effect=UnidentifiedImageError("cannot identify")):
            result = sanitize_image(garbage)

        assert result == garbage  # falls back to original

    def test_sanitized_image_is_openable_by_pillow(self) -> None:
        """The sanitized output must be a valid image Pillow can fully round-trip."""
        from app.core.file_security import sanitize_image

        result = sanitize_image(_make_jpeg())
        img = Image.open(io.BytesIO(result))
        img.load()
        assert img.format == "JPEG"

    def test_sanitize_reduces_or_equal_size_for_simple_image(self) -> None:
        """A plain colour JPEG should not grow dramatically after sanitization."""
        from app.core.file_security import sanitize_image

        original = _make_jpeg(width=100, height=100)
        result = sanitize_image(original)
        # Allow up to 2× growth (re-encoding complex images can be slightly larger)
        assert len(result) <= len(original) * 2


# ---------------------------------------------------------------------------
# A04 — ClamAV scan (optional, env-gated)
# ---------------------------------------------------------------------------


@pytest.mark.security
class TestClamAVScan:
    """ClamAV scanning must be a no-op when disabled and fail-closed when enabled."""

    def test_scan_skipped_when_disabled(self) -> None:
        """With CLAMAV_ENABLED=false, scan_for_malware must return without error
        and without importing or calling clamd."""
        from app.core.file_security import scan_for_malware

        with patch("app.core.file_security.settings") as mock_settings:
            mock_settings.clamav_enabled = False
            # Should complete without raising — no clamd import needed
            scan_for_malware(b"any bytes")

    def test_scan_passes_clean_file(self) -> None:
        """When ClamAV is enabled and reports OK, no exception is raised."""
        from app.core.file_security import scan_for_malware

        mock_cd = MagicMock()
        mock_cd.instream.return_value = {"stream": ("OK", None)}

        with patch("app.core.file_security.settings") as mock_settings, \
             patch.dict("sys.modules", {"clamd": MagicMock(ClamdNetworkSocket=MagicMock(return_value=mock_cd))}):
            mock_settings.clamav_enabled = True
            mock_settings.clamav_host = "localhost"
            mock_settings.clamav_port = 3310
            scan_for_malware(_make_jpeg())  # must not raise

    def test_scan_raises_422_on_threat_found(self) -> None:
        """When ClamAV reports FOUND, a 422 HTTPException must be raised."""
        from app.core.file_security import scan_for_malware

        mock_cd = MagicMock()
        mock_cd.instream.return_value = {"stream": ("FOUND", "Eicar-Test-Signature")}

        with patch("app.core.file_security.settings") as mock_settings, \
             patch.dict("sys.modules", {"clamd": MagicMock(ClamdNetworkSocket=MagicMock(return_value=mock_cd))}):
            mock_settings.clamav_enabled = True
            mock_settings.clamav_host = "localhost"
            mock_settings.clamav_port = 3310

            with pytest.raises(HTTPException) as exc_info:
                scan_for_malware(b"EICAR test payload")

        assert exc_info.value.status_code == 422
        assert "malware" in exc_info.value.detail.lower()

    def test_scan_raises_503_when_daemon_unreachable(self) -> None:
        """When the ClamAV daemon is down, a 503 HTTPException must be raised
        (fail-closed: do not let uploads through if the scanner is broken)."""
        from app.core.file_security import scan_for_malware

        mock_clamd = MagicMock()
        mock_clamd.ClamdNetworkSocket.side_effect = ConnectionRefusedError("daemon down")

        with patch("app.core.file_security.settings") as mock_settings, \
             patch.dict("sys.modules", {"clamd": mock_clamd}):
            mock_settings.clamav_enabled = True
            mock_settings.clamav_host = "localhost"
            mock_settings.clamav_port = 3310

            with pytest.raises(HTTPException) as exc_info:
                scan_for_malware(_make_jpeg())

        assert exc_info.value.status_code == 503
