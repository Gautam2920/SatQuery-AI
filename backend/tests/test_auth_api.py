import uuid

from backend.app.core.security import create_access_token


VALID_PASSWORD = "correct-horse-battery"


def register(anonymous_client, email=None, password=VALID_PASSWORD):
    return anonymous_client.post(
        "/auth/register",
        json={"email": email or f"user-{uuid.uuid4().hex[:8]}@example.com", "password": password},
    )


def test_register_returns_a_usable_session(anonymous_client):
    response = register(anonymous_client, "analyst@example.com")

    assert response.status_code == 201

    body = response.json()

    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "analyst@example.com"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]

    anonymous_client.headers["Authorization"] = f"Bearer {body['access_token']}"
    me = anonymous_client.get("/auth/me")

    assert me.status_code == 200
    assert me.json()["email"] == "analyst@example.com"


def test_registration_rejects_a_duplicate_email(anonymous_client):
    assert register(anonymous_client, "taken@example.com").status_code == 201

    duplicate = register(anonymous_client, "taken@example.com")

    assert duplicate.status_code == 409
    assert "already exists" in duplicate.json()["detail"]


def test_registration_treats_email_case_insensitively(anonymous_client):
    assert register(anonymous_client, "Mixed@Example.com").status_code == 201
    assert register(anonymous_client, "mixed@example.com").status_code == 409


def test_registration_rejects_a_malformed_email(anonymous_client):
    assert register(anonymous_client, "not-an-email").status_code == 422


def test_registration_rejects_a_short_password(anonymous_client):
    assert register(anonymous_client, "short@example.com", "abc").status_code == 422


def test_login_succeeds_with_the_registered_password(anonymous_client):
    register(anonymous_client, "returning@example.com")

    response = anonymous_client.post(
        "/auth/login",
        json={"email": "returning@example.com", "password": VALID_PASSWORD},
    )

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_accepts_a_differently_cased_email(anonymous_client):
    register(anonymous_client, "casing@example.com")

    response = anonymous_client.post(
        "/auth/login",
        json={"email": "CASING@example.com", "password": VALID_PASSWORD},
    )

    assert response.status_code == 200


def test_login_rejects_a_wrong_password(anonymous_client):
    register(anonymous_client, "wrongpass@example.com")

    response = anonymous_client.post(
        "/auth/login",
        json={"email": "wrongpass@example.com", "password": "not-the-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_does_not_reveal_whether_an_account_exists(anonymous_client):
    register(anonymous_client, "known@example.com")

    wrong_password = anonymous_client.post(
        "/auth/login",
        json={"email": "known@example.com", "password": "not-the-password"},
    )
    unknown_account = anonymous_client.post(
        "/auth/login",
        json={"email": "unknown@example.com", "password": "not-the-password"},
    )

    assert wrong_password.status_code == unknown_account.status_code == 401
    assert wrong_password.json() == unknown_account.json()


def test_me_requires_a_token(anonymous_client):
    assert anonymous_client.get("/auth/me").status_code == 401


def test_me_rejects_a_garbage_token(anonymous_client):
    anonymous_client.headers["Authorization"] = "Bearer not.a.jwt"

    assert anonymous_client.get("/auth/me").status_code == 401


def test_me_rejects_a_token_for_a_deleted_account(anonymous_client):
    """A token signed for an id that no longer exists must not authenticate."""
    anonymous_client.headers["Authorization"] = (
        f"Bearer {create_access_token(uuid.uuid4())}"
    )

    assert anonymous_client.get("/auth/me").status_code == 401


def test_the_stored_password_is_hashed(anonymous_client, db_session):
    from sqlalchemy import select

    from backend.app.models.user import User

    register(anonymous_client, "hashed@example.com")

    user = db_session.execute(
        select(User).where(User.email == "hashed@example.com")
    ).scalar_one()

    assert user.password_hash != VALID_PASSWORD
    assert user.password_hash.startswith("$2")
