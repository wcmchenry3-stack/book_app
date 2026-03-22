"""Unit tests for auth endpoints — DB and Google verification mocked."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User

FAKE_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
NOW = datetime.now(timezone.utc)
FAKE_USER = User(
    id=FAKE_USER_ID,
    email="test@example.com",
    created_at=NOW,
    updated_at=NOW,
)

GOOGLE_CLAIMS = {
    "sub": "google-uid-123",
    "email": "test@example.com",
    "email_verified": True,
    "name": "Test User",
    "picture": "https://example.com/avatar.jpg",
}

FAKE_ACCESS = "fake.access.token"
FAKE_REFRESH = "fake.refresh.token"


def _mock_user(uid=FAKE_USER_ID, email="test@example.com"):
    u = MagicMock()
    u.id = uid
    u.email = email
    u.display_name = "Test User"
    u.avatar_url = "https://example.com/avatar.jpg"
    return u


def _db_returning(scalar_value):
    async def _fake_db():
        result = MagicMock()
        result.scalar_one_or_none.return_value = scalar_value
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)
        db.refresh = AsyncMock()
        yield db

    return _fake_db


@pytest.fixture
def client():
    from app.core.database import get_db

    app.dependency_overrides[get_db] = _db_returning(None)
    yield TestClient(app)
    app.dependency_overrides.clear()


# ─── POST /auth/google ─────────────────────────────────────────────────────────


class TestGoogleAuth:
    def test_returns_401_for_invalid_google_token(self, client):
        with patch(
            "app.api.auth.verify_google_id_token",
            side_effect=Exception("signature mismatch"),
        ):
            resp = client.post("/auth/google", json={"id_token": "bad"})
        assert resp.status_code == 401

    def test_returns_401_for_unverified_email(self, client):
        claims = {**GOOGLE_CLAIMS, "email_verified": False}
        with patch("app.api.auth.verify_google_id_token", return_value=claims):
            resp = client.post("/auth/google", json={"id_token": "token"})
        assert resp.status_code == 401
        assert "verified" in resp.json()["detail"].lower()

    def test_returns_403_when_email_not_in_allowlist(self, client):
        with (
            patch("app.api.auth.verify_google_id_token", return_value=GOOGLE_CLAIMS),
            patch("app.api.auth.settings") as mock_settings,
        ):
            mock_settings.allowed_emails_list = ["other@example.com"]
            mock_settings.jwt_expiry_hours = 24
            resp = client.post("/auth/google", json={"id_token": "token"})
        assert resp.status_code == 403
        assert "not authorized" in resp.json()["detail"].lower()

    def test_returns_200_and_tokens_for_new_user(self):
        from app.core.database import get_db

        app.dependency_overrides[get_db] = _db_returning(None)

        with (
            patch("app.api.auth.verify_google_id_token", return_value=GOOGLE_CLAIMS),
            patch("app.api.auth.settings") as mock_settings,
            patch("app.api.auth.create_access_token", return_value=FAKE_ACCESS),
            patch("app.api.auth.create_refresh_token", return_value=FAKE_REFRESH),
        ):
            mock_settings.allowed_emails_list = []
            mock_settings.jwt_expiry_hours = 24
            resp = TestClient(app).post("/auth/google", json={"id_token": "valid"})

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == FAKE_ACCESS
        assert data["refresh_token"] == FAKE_REFRESH
        assert data["expires_in"] == 24 * 3600

    def test_returns_200_and_tokens_for_existing_user(self):
        from app.core.database import get_db

        existing = _mock_user()
        app.dependency_overrides[get_db] = _db_returning(existing)

        with (
            patch("app.api.auth.verify_google_id_token", return_value=GOOGLE_CLAIMS),
            patch("app.api.auth.settings") as mock_settings,
            patch("app.api.auth.create_access_token", return_value=FAKE_ACCESS),
            patch("app.api.auth.create_refresh_token", return_value=FAKE_REFRESH),
        ):
            mock_settings.allowed_emails_list = []
            mock_settings.jwt_expiry_hours = 24
            resp = TestClient(app).post("/auth/google", json={"id_token": "valid"})

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_updates_display_name_for_existing_user(self):
        from app.core.database import get_db

        existing = _mock_user()
        app.dependency_overrides[get_db] = _db_returning(existing)

        claims = {**GOOGLE_CLAIMS, "name": "Updated Name", "picture": "https://new.png"}
        with (
            patch("app.api.auth.verify_google_id_token", return_value=claims),
            patch("app.api.auth.settings") as mock_settings,
            patch("app.api.auth.create_access_token", return_value=FAKE_ACCESS),
            patch("app.api.auth.create_refresh_token", return_value=FAKE_REFRESH),
        ):
            mock_settings.allowed_emails_list = []
            mock_settings.jwt_expiry_hours = 24
            TestClient(app).post("/auth/google", json={"id_token": "valid"})

        app.dependency_overrides.clear()
        assert existing.display_name == "Updated Name"
        assert existing.avatar_url == "https://new.png"

    def test_allowlist_empty_permits_any_email(self):
        from app.core.database import get_db

        app.dependency_overrides[get_db] = _db_returning(None)

        with (
            patch("app.api.auth.verify_google_id_token", return_value=GOOGLE_CLAIMS),
            patch("app.api.auth.settings") as mock_settings,
            patch("app.api.auth.create_access_token", return_value=FAKE_ACCESS),
            patch("app.api.auth.create_refresh_token", return_value=FAKE_REFRESH),
        ):
            mock_settings.allowed_emails_list = []
            mock_settings.jwt_expiry_hours = 24
            resp = TestClient(app).post("/auth/google", json={"id_token": "valid"})

        app.dependency_overrides.clear()
        assert resp.status_code == 200


# ─── POST /auth/refresh ────────────────────────────────────────────────────────


class TestRefresh:
    def test_returns_401_for_expired_token(self, client):
        with patch(
            "app.api.auth.decode_token",
            side_effect=jwt.ExpiredSignatureError("expired"),
        ):
            resp = client.post("/auth/refresh", json={"refresh_token": "any"})
        assert resp.status_code == 401
        assert "expired" in resp.json()["detail"].lower()

    def test_returns_401_for_invalid_token(self, client):
        with patch(
            "app.api.auth.decode_token",
            side_effect=jwt.InvalidTokenError("bad"),
        ):
            resp = client.post("/auth/refresh", json={"refresh_token": "garbage"})
        assert resp.status_code == 401

    def test_returns_401_when_access_token_used_as_refresh(self, client):
        with patch(
            "app.api.auth.decode_token",
            return_value={"sub": str(FAKE_USER_ID), "type": "access"},
        ):
            resp = client.post("/auth/refresh", json={"refresh_token": "access-token"})
        assert resp.status_code == 401
        assert "type" in resp.json()["detail"].lower()

    def test_returns_401_when_user_deleted(self):
        from app.core.database import get_db

        async def _db_no_user():
            db = AsyncMock()
            db.get = AsyncMock(return_value=None)
            yield db

        app.dependency_overrides[get_db] = _db_no_user

        with patch(
            "app.api.auth.decode_token",
            return_value={"sub": str(FAKE_USER_ID), "type": "refresh"},
        ):
            resp = TestClient(app).post("/auth/refresh", json={"refresh_token": "tok"})

        app.dependency_overrides.clear()
        assert resp.status_code == 401
        assert "not found" in resp.json()["detail"].lower()

    def test_returns_new_tokens_for_valid_refresh(self):
        from app.core.database import get_db

        user = _mock_user()

        async def _db_with_user():
            db = AsyncMock()
            db.get = AsyncMock(return_value=user)
            yield db

        app.dependency_overrides[get_db] = _db_with_user

        with (
            patch(
                "app.api.auth.decode_token",
                return_value={"sub": str(FAKE_USER_ID), "type": "refresh"},
            ),
            patch("app.api.auth.create_access_token", return_value=FAKE_ACCESS),
            patch("app.api.auth.create_refresh_token", return_value=FAKE_REFRESH),
            patch("app.api.auth.settings") as mock_settings,
        ):
            mock_settings.jwt_expiry_hours = 24
            resp = TestClient(app).post("/auth/refresh", json={"refresh_token": "tok"})

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == FAKE_ACCESS
        assert data["refresh_token"] == FAKE_REFRESH


# ─── GET /auth/me ──────────────────────────────────────────────────────────────


class TestGetMe:
    def test_returns_401_without_auth(self):
        resp = TestClient(app).get("/auth/me")
        assert resp.status_code == 401

    def test_returns_current_user_email(self):
        from app.auth.dependencies import get_current_user

        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        resp = TestClient(app).get("/auth/me")
        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"
