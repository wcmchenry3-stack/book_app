"""Unit tests for verify_google_id_token — all HTTP and JWT ops mocked."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.auth.google import verify_google_id_token

FAKE_JWKS = {"keys": [{"kty": "RSA", "kid": "key1"}]}
FAKE_CLAIMS_DATA = {
    "iss": "https://accounts.google.com",
    "aud": "fake-client-id",
    "sub": "12345",
    "email": "user@example.com",
}


class _FakeClaims(dict):
    """A dict subclass mimicking authlib JWTClaims (supports validate() and dict())."""

    def validate(self):
        pass

    def get(self, key, default=None):
        return super().get(key, default)


def _mock_httpx_client(jwks: dict):
    resp = MagicMock()
    resp.json.return_value = jwks
    resp.raise_for_status = MagicMock()

    client = AsyncMock()
    client.get = AsyncMock(return_value=resp)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    return client


class TestVerifyGoogleIdToken:
    async def test_returns_claims_dict_on_valid_token(self):
        fake_claims = _FakeClaims(FAKE_CLAIMS_DATA)

        with (
            patch("app.auth.google.httpx.AsyncClient") as mock_cls,
            patch("app.auth.google.authlib_jwt.decode") as mock_decode,
            patch("app.auth.google.settings") as mock_settings,
        ):
            mock_settings.google_client_ids = ["fake-client-id"]
            mock_cls.return_value = _mock_httpx_client(FAKE_JWKS)
            mock_decode.return_value = fake_claims

            result = await verify_google_id_token("fake.id.token")

        assert result["sub"] == "12345"
        assert result["email"] == "user@example.com"
        assert result["iss"] == "https://accounts.google.com"

    async def test_fetches_jwks_from_google(self):
        fake_claims = _FakeClaims(FAKE_CLAIMS_DATA)

        with (
            patch("app.auth.google.httpx.AsyncClient") as mock_cls,
            patch("app.auth.google.authlib_jwt.decode", return_value=fake_claims),
            patch("app.auth.google.settings") as mock_settings,
        ):
            mock_settings.google_client_ids = ["fake-client-id"]
            mock_client = _mock_httpx_client(FAKE_JWKS)
            mock_cls.return_value = mock_client

            await verify_google_id_token("fake.id.token")

        mock_client.get.assert_awaited_once_with(
            "https://www.googleapis.com/oauth2/v3/certs"
        )

    async def test_passes_claims_options_to_decode(self):
        fake_claims = _FakeClaims(FAKE_CLAIMS_DATA)

        with (
            patch("app.auth.google.httpx.AsyncClient") as mock_cls,
            patch("app.auth.google.authlib_jwt.decode") as mock_decode,
            patch("app.auth.google.settings") as mock_settings,
        ):
            mock_settings.google_client_ids = ["test-client-id"]
            mock_cls.return_value = _mock_httpx_client(FAKE_JWKS)
            mock_decode.return_value = fake_claims

            await verify_google_id_token("some.token")

        _, kwargs = mock_decode.call_args
        claims_options = kwargs.get("claims_options") or mock_decode.call_args[0][2]
        assert claims_options["aud"]["values"] == ["test-client-id"]
        assert "https://accounts.google.com" in claims_options["iss"]["values"]

    async def test_raises_on_jwks_timeout(self):
        """A timeout fetching Google JWKS must propagate as httpx.TimeoutException."""
        import httpx

        with patch("app.auth.google.httpx.AsyncClient") as mock_cls:
            timeout_client = AsyncMock()
            timeout_client.get = AsyncMock(
                side_effect=httpx.TimeoutException("timed out")
            )
            timeout_client.__aenter__ = AsyncMock(return_value=timeout_client)
            timeout_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = timeout_client

            with pytest.raises(httpx.TimeoutException):
                await verify_google_id_token("any.token")

    async def test_calls_validate_on_claims(self):
        fake_claims = _FakeClaims(FAKE_CLAIMS_DATA)
        fake_claims.validate = MagicMock()

        with (
            patch("app.auth.google.httpx.AsyncClient") as mock_cls,
            patch("app.auth.google.authlib_jwt.decode", return_value=fake_claims),
            patch("app.auth.google.settings") as mock_settings,
        ):
            mock_settings.google_client_ids = ["fake-client-id"]
            mock_cls.return_value = _mock_httpx_client(FAKE_JWKS)

            await verify_google_id_token("fake.id.token")

        fake_claims.validate.assert_called_once()
