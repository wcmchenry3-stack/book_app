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
    google_books_api_key: str = ""
    open_library_base_url: str = "https://openlibrary.org"

    # App
    environment: str = "development"
    cors_origins: list[str] = []
    rate_limit_scan: str = "10/minute"

    @property
    def allowed_emails_list(self) -> list[str]:
        return [e.strip() for e in self.allowed_emails.split(",") if e.strip()]


settings = Settings()
