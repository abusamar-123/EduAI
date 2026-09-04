"""
EduAI - Authentication Service
JWT-based auth with Student/Teacher roles.
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "eduai-secret-change-in-production-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ── Models ────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

class TokenData(BaseModel):
    user_id: str
    role: str
    name: str

class LoginRequest(BaseModel):
    username: str
    password: str

# ── Demo Users (replace with DB in production) ────────────────────────────────
# Passwords are bcrypt hashed. Demo:
#   student1 / student123
#   teacher1 / teacher123
DEMO_USERS = {
    "student1": {
        "user_id": "s001",
        "name": "Rahul Kumar",
        "role": "student",
        "hashed_password": pwd_context.hash("student123"),
        "class": "9",
        "section": "A",
    },
    "student2": {
        "user_id": "s002",
        "name": "Priya Singh",
        "role": "student",
        "hashed_password": pwd_context.hash("student123"),
        "class": "9",
        "section": "B",
    },
    "teacher1": {
        "user_id": "t001",
        "name": "Mrs. Sharma",
        "role": "teacher",
        "hashed_password": pwd_context.hash("teacher123"),
        "subject": "Science",
    },
    "teacher2": {
        "user_id": "t002",
        "name": "Mr. Verma",
        "role": "teacher",
        "hashed_password": pwd_context.hash("teacher123"),
        "subject": "Science",
    },
}

# ── Core Functions ────────────────────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = DEMO_USERS.get(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

def decode_token(token: str) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        role: str = payload.get("role")
        name: str = payload.get("name")
        if user_id is None or role is None:
            raise credentials_exception
        return TokenData(user_id=user_id, role=role, name=name)
    except JWTError:
        raise credentials_exception

# ── FastAPI Dependencies ──────────────────────────────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    return decode_token(credentials.credentials)

def require_teacher(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required"
        )
    return current_user

def require_student_or_teacher(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role not in ("student", "teacher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authentication required"
        )
    return current_user
