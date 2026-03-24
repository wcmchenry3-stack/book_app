import logging

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.book import EnrichedBook
from app.services.chatgpt_vision import ChatGPTVisionIdentifier
from app.services.deduplication import DeduplicationService
from app.services.enrichment import EnrichmentService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["scan"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


@router.post("/scan", response_model=list[EnrichedBook])
@limiter.limit(settings.rate_limit_scan)
async def scan(
    request: Request,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EnrichedBook]:
    # Validate file extension before reading body
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be a JPEG, PNG, WebP, or HEIC image",
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 5MB or smaller",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be an image",
        )

    identifier = ChatGPTVisionIdentifier()
    candidates = await identifier.identify(image_bytes)

    if not candidates:
        return []

    enrichment = EnrichmentService()
    enriched = await enrichment.enrich(candidates)

    dedup = DeduplicationService()
    enriched = await dedup.check(db, str(current_user.id), enriched)

    return enriched
