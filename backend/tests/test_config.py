from backend.app.core.config import Settings


def test_default_settings():
    test_settings = Settings(_env_file=None)

    assert test_settings.app_name == "SatQuery AI Backend"
    assert test_settings.environment == "development"
    assert test_settings.debug is True


def test_environment_override(monkeypatch):
    monkeypatch.setenv("APP_NAME", "SatQuery AI Test")
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("DEBUG", "false")

    test_settings = Settings(_env_file=None)

    assert test_settings.app_name == "SatQuery AI Test"
    assert test_settings.environment == "test"
    assert test_settings.debug is False
