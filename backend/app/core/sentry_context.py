"""Sentry context enrichment — attaches request-level tags and user identity."""

import sentry_sdk
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.logging import request_id_var


class SentryContextMiddleware(BaseHTTPMiddleware):
    """Attach request_id and endpoint tags to every Sentry event.

    User identity is set separately via ``set_sentry_user`` inside route
    handlers (after FastAPI dependency injection resolves the current user).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        sentry_sdk.set_tag("request_id", request_id_var.get())
        sentry_sdk.set_tag("endpoint", request.url.path)
        sentry_sdk.set_tag("method", request.method)
        return await call_next(request)


def set_sentry_user(user_id: int | str) -> None:
    """Set Sentry user context with ID only (no PII)."""
    sentry_sdk.set_user({"id": str(user_id)})
