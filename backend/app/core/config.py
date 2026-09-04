from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "SatQuery AI Backend"
    environment: str = "development"
    debug: bool = True
    database_url: str = ""
    test_database_url: str = ""
    raster_storage_dir: Path = BASE_DIR / "storage" / "rasters"
    cors_allow_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
