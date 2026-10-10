"""Application configuration loaded from environment variables."""

from typing import Any, List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    fastapi_env: str = Field(default="development", alias="FASTAPI_ENV")
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    cors_origins: Union[List[str], str] = Field(
        default=[
            "http://localhost:5173",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:4173",
        ],
        alias="CORS_ORIGINS",
    )
    cors_origin_regex: Optional[str] = Field(
        default=r"^https:\/\/.*\.pages\.dev$",
        alias="CORS_ORIGIN_REGEX",
    )

    # MongoDB Atlas
    mongodb_uri: Optional[str] = Field(default=None, alias="MONGODB_URI")
    mongodb_db_name: str = Field(default="plantdoctor", alias="MONGODB_DB_NAME")

    # Embeddings
    embedding_model: str = Field(default="BAAI/bge-small-en-v1.5", alias="EMBEDDING_MODEL")
    embedding_dimension: int = Field(default=384, alias="EMBEDDING_DIMENSION")

    # Optional LLMs
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")

    # Security
    admin_api_key: str = Field(
        default="dev-admin-secret-change-in-production",
        alias="ADMIN_API_KEY",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("mongodb_uri", mode="before")
    @classmethod
    def sanitize_mongodb_uri(cls, v: Any) -> Optional[str]:
        if not v or not isinstance(v, str):
            return v
        s = v.strip()
        if "://" in s and "@" in s:
            import urllib.parse
            scheme, rest = s.split("://", 1)
            userinfo, host_and_params = rest.rsplit("@", 1)
            if ":" in userinfo:
                username, password = userinfo.split(":", 1)
                clean_pw = password.strip("<> ")
                unquoted = urllib.parse.unquote_plus(clean_pw)
                encoded_pw = urllib.parse.quote_plus(unquoted)
                return f"{scheme}://{username}:{encoded_pw}@{host_and_params}"
        return s

    @property
    def is_mongodb_configured(self) -> bool:
        return bool(self.mongodb_uri and self.mongodb_uri.strip())

    @property
    def is_llm_configured(self) -> bool:
        return bool(
            (self.gemini_api_key and self.gemini_api_key.strip())
            or (self.openai_api_key and self.openai_api_key.strip())
        )


settings = Settings()
