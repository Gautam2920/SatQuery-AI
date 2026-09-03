import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_db
from backend.app.core.config import settings
from backend.app.main import app


@pytest.fixture
def db_session():
    engine = create_engine(
        settings.test_database_url,
        pool_pre_ping=True,
    )

    with Session(engine) as session:
        try:
            yield session
        finally:
            session.rollback()

    engine.dispose()


@pytest.fixture
def client():
    engine = create_engine(
        settings.test_database_url,
        pool_pre_ping=True,
    )

    # Start every API test with a clean database.
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                TRUNCATE TABLE images, projects
                CASCADE
                """
            )
        )

    def override_get_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
