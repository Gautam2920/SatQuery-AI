"""Password hashing and access tokens.

bcrypt silently truncates anything past 72 bytes, so passwords are SHA-256'd and
base64-encoded first. That keeps the whole passphrase significant at any length
and makes the hash input a fixed size.
"""

import base64
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from backend.app.core.config import settings


ALGORITHM = "HS256"
TOKEN_TYPE = "bearer"


class InvalidTokenError(Exception):
    pass


def _prepare_password(password: str) -> bytes:
    return base64.b64encode(hashlib.sha256(password.encode("utf-8")).digest())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare_password(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare_password(password), password_hash.encode("utf-8"))
    except ValueError:
        # A malformed hash in the row must read as "wrong password", not a 500.
        return False


def _signing_key() -> str:
    if not settings.secret_key:
        raise RuntimeError(
            'SECRET_KEY is not set. Tokens cannot be signed. Generate one with '
            'python -c "import secrets; print(secrets.token_urlsafe(48))" and put '
            'it in backend/.env.'
        )

    return settings.secret_key


def create_access_token(user_id: uuid.UUID) -> str:
    issued_at = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "iat": issued_at,
        "exp": issued_at + timedelta(minutes=settings.access_token_expire_minutes),
    }

    return jwt.encode(payload, _signing_key(), algorithm=ALGORITHM)


def read_access_token(token: str) -> uuid.UUID:
    """Return the user id a token carries, or raise InvalidTokenError."""
    try:
        payload = jwt.decode(token, _signing_key(), algorithms=[ALGORITHM])
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as error:
        raise InvalidTokenError(str(error)) from error
