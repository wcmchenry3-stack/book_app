"""
Shared slowapi Limiter instance.

Lives in app.core to avoid circular imports — main.py and every router
import from here instead of from each other.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _get_user_id_or_ip(request: Request) -> str:
    """Rate-limit key: authenticated user ID when a valid JWT is present, else remote IP."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from app.auth.jwt import decode_token

            payload = decode_token(auth[7:])
            return f"user:{payload['sub']}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=_get_user_id_or_ip)
