import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    is_verified: bool
    created_at: datetime


class AuthenticatedUser(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse
