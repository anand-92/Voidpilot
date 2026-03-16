from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    PROJECT_NAME: str = "Modern Python Backend"
    API_V1_STR: str = "/api/v1"
    FIREBASE_PROJECT_ID: str = Field(default="")
    FIREBASE_STORAGE_BUCKET: str = Field(default="")
    FIREBASE_LOCATION: str = "us-east1"
    FIREBASE_CREDENTIALS_JSON: str | None = Field(default=None)
    GOOGLE_API_KEY: str = Field(default="")
    GEMINI_FILE_SEARCH_STORE_ID: str = (
        "fileSearchStores/voidpilotdocscontext-4kjns2fp73sc"
    )


settings = Settings()
