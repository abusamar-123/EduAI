from fastapi import APIRouter, HTTPException, status
from services.auth_service import (
    authenticate_user, create_access_token,
    LoginRequest, Token
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(request: LoginRequest):
    user = authenticate_user(request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token({
        "user_id": user["user_id"],
        "role": user["role"],
        "name": user["name"],
    })
    return Token(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        name=user["name"],
    )


@router.get("/me")
def get_me():
    return {"message": "use token to get user info"}