from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.security import InvalidTokenError, read_access_token
from backend.app.db.session import SessionLocal
from backend.app.models.user import User


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_REJECTED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise CREDENTIALS_REJECTED

    try:
        user_id = read_access_token(credentials.credentials)
    except InvalidTokenError as error:
        raise CREDENTIALS_REJECTED from error

    user = db.get(User, user_id)

    # The account can have been deleted since the token was issued.
    if user is None:
        raise CREDENTIALS_REJECTED

    return user
