from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth_service import verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.user import TokenResponse, RefreshRequest
from jose import JWTError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {
        "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
        "refresh_token": create_refresh_token({"sub": str(user.id), "role": user.role}),
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
            "refresh_token": body.refresh_token,
            "token_type": "bearer",
            "role": user.role,
            "name": user.name,
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
