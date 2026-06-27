from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://eventmvp:eventmvp@db:5432/eventmvp"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # App
    public_base_url: str = "http://localhost:5173"  # for building registration links
    cors_origins: str = "http://localhost:5173"

    # Email (SendGrid). If api key is empty, emails are logged to stdout instead of sent.
    sendgrid_api_key: str = ""
    email_from: str = "no-reply@eventmvp.local"
    email_from_name: str = "Event MVP"

    # Seed admin (created on first startup if no users exist)
    seed_admin_email: str = "admin@eventmvp.local"
    seed_admin_password: str = "admin12345"
    seed_org_name: str = "Demo Organization"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
