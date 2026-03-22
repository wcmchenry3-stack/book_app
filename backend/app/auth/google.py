import httpx
from authlib.jose import jwt as authlib_jwt

from app.core.config import settings

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"


async def verify_google_id_token(id_token: str) -> dict:
    """Verify a Google ID token against Google's JWKS and return its claims."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(GOOGLE_CERTS_URL)
        resp.raise_for_status()
        jwks = resp.json()

    claims = authlib_jwt.decode(
        id_token,
        jwks,
        claims_options={
            "iss": {
                "essential": True,
                "values": ["https://accounts.google.com"],
            },
            "aud": {
                "essential": True,
                "value": settings.google_client_id,
            },
        },
    )
    claims.validate()
    return dict(claims)
