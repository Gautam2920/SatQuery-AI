import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_db
from backend.app.core.config import settings
from backend.app.core.security import hash_password
from backend.app.main import app
from backend.app.models.user import User


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
def api_engine():
    engine = create_engine(
        settings.test_database_url,
        pool_pre_ping=True,
    )

    # Start every API test with a clean database.
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE images, projects, users CASCADE"))

    def override_get_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield engine
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def sign_in_new_account(test_client: TestClient, email: str) -> uuid.UUID:
    """Register an account, authenticate the client as it, and return its id."""
    response = test_client.post(
        "/auth/register",
        json={"email": email, "password": "correct-horse-battery"},
    )
    assert response.status_code == 201, response.text

    body = response.json()
    test_client.headers["Authorization"] = f"Bearer {body['access_token']}"

    return uuid.UUID(body["user"]["id"])


@pytest.fixture
def anonymous_client(api_engine):
    """A client carrying no credentials, for testing the auth boundary itself."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client(api_engine):
    """The default client is signed in.

    Every data route now belongs to an owner, so a test about projects, images or
    analysis needs a session before it can say anything about that behaviour.
    """
    with TestClient(app) as test_client:
        email = f"analyst-{uuid.uuid4().hex[:8]}@example.com"
        # Tests that seed rows directly need to own them to reach them.
        test_client.user_id = sign_in_new_account(test_client, email)

        yield test_client


@pytest.fixture
def other_client(api_engine):
    """A second, separate account — used to prove one user cannot see another's data."""
    with TestClient(app) as test_client:
        email = f"other-{uuid.uuid4().hex[:8]}@example.com"
        test_client.user_id = sign_in_new_account(test_client, email)

        yield test_client


@pytest.fixture
def db_owner(api_engine, db_session):
    """An account for tests that build rows through the ORM rather than the API."""
    user = User(
        email=f"owner-{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("correct-horse-battery"),
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return user
