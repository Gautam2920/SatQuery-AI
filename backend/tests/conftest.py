import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.app.core.config import settings


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
