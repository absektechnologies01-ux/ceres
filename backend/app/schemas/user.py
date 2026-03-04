from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid
from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str
    name: str


class RefreshRequest(BaseModel):
    refresh_token: str
