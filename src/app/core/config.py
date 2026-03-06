from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    PROJECT_NAME: str = "Modern Python Backend"
    API_V1_STR: str = "/api/v1"
    GOOGLE_API_KEY: str = ""


settings = Settings()
