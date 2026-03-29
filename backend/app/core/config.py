from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str

    # Auth
    google_client_id: str = ""
    google_client_secret: str = ""
    jwt_private_key: str = ""
    jwt_public_key: str = ""
    jwt_expiry_hours: int = 24
    refresh_token_expiry_days: int = 7
    allowed_emails: str = ""

    # External APIs
    openai_api_key: str = ""
    openai_max_tokens: int = 512
    google_books_api_key: str = ""
    open_library_base_url: str = "https://openlibrary.org"

    # Observability
    sentry_dsn: str = ""

    # App
    environment: str = "development"
    cors_origins: list[str] = []
    rate_limit_scan: str = "10/minute"
    rate_limit_auth: str = "5/minute"
    rate_limit_books_search: str = "30/minute"
    rate_limit_writes: str = "60/minute"
    rate_limit_reads: str = "120/minute"
    rate_limit_health: str = "60/minute"
    # Allowlist of Host header values accepted in production.
    # Override via TRUSTED_HOSTS env var: '["api.example.com"]'
    trusted_hosts: list[str] = ["*"]

    @field_validator("cors_origins")
    @classmethod
    def no_wildcard_origins(cls, v: list[str]) -> list[str]:
        if "*" in v:
            raise ValueError("Wildcard '*' is not permitted in CORS_ORIGINS")
        return v

    @property
    def async_database_url(self) -> str:
        # Normalize any postgres:// or postgresql:// scheme to postgresql+asyncpg://
        import re

        return re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", self.database_url)

    @property
    def allowed_emails_list(self) -> list[str]:
        return [e.strip() for e in self.allowed_emails.split(",") if e.strip()]


settings = Settings()
