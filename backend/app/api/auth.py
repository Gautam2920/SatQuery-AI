from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, get_db
from backend.app.core.config import settings
from backend.app.core.security import (
    TOKEN_TYPE,
    create_access_token,
    hash_password,
    verify_password,
)
from backend.app.models.user import User
from backend.app.schemas.auth import (
    AuthenticatedUser,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

SECONDS_PER_MINUTE = 60


def _normalise_email(email: str) -> str:
    return email.strip().lower()


def _issue_token(user: User) -> AuthenticatedUser:
    return AuthenticatedUser(
        access_token=create_access_token(user.id),
        token_type=TOKEN_TYPE,
        expires_in=settings.access_token_expire_minutes * SECONDS_PER_MINUTE,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/register",
    response_model=AuthenticatedUser,
    status_code=status.HTTP_201_CREATED,
)
def register(credentials: RegisterRequest, db: Session = Depends(get_db)):
    email = _normalise_email(credentials.email)

    user = User(email=email, password_hash=hash_password(credentials.password))
    db.add(user)

    try:
        db.commit()
    except IntegrityError as error:
        # The unique index is the authority; two concurrent registrations of the
        # same address cannot both pass a prior SELECT.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        ) from error

    db.refresh(user)

    return _issue_token(user)


@router.post("/login", response_model=AuthenticatedUser)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    email = _normalise_email(credentials.email)

    user = db.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()

    # One message for both branches so the response cannot enumerate accounts.
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _issue_token(user)


@router.get("/me", response_model=UserResponse)
def read_current_user(user: User = Depends(get_current_user)):
    return user
