"""Tests the /health exemption from TrustedHostMiddleware.

/health is legitimately hit by CI probes, uptime monitors, and load balancers
using whatever hostname the origin is reachable at (e.g. the raw Render
`*.onrender.com` URL), which won't be in the production `trusted_hosts`
allowlist. Without the exemption, those probes get 400 before reaching the
handler.
"""

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


def _build_app():
    from app.main import _HealthExemptTrustedHost

    app = FastAPI()
    app.add_middleware(_HealthExemptTrustedHost, allowed_hosts=["trusted.example.com"])

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    @app.get("/other")
    async def other() -> dict:
        return {"status": "other"}

    return app


@pytest.mark.asyncio
async def test_health_accepts_untrusted_host_header():
    """Probes from raw origin hostnames must still hit /health."""
    async with AsyncClient(
        transport=ASGITransport(app=_build_app()),
        base_url="http://bookshelf-api-rxp3.onrender.com",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_non_health_path_still_rejects_untrusted_host():
    """Every non-/health path still enforces the trusted_hosts allowlist."""
    async with AsyncClient(
        transport=ASGITransport(app=_build_app()),
        base_url="http://attacker.example.com",
    ) as client:
        response = await client.get("/other")

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_non_health_path_passes_for_trusted_host():
    """Sanity: trusted hosts still pass through normally on non-/health paths."""
    async with AsyncClient(
        transport=ASGITransport(app=_build_app()),
        base_url="http://trusted.example.com",
    ) as client:
        response = await client.get("/other")

    assert response.status_code == 200
