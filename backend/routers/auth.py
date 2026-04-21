"""Auth routes — /api/auth/register and /api/auth/login."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from core.auth import create_account, authenticate, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    """Create a new account and return JWT token."""
    if len(req.name.strip()) < 2:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Ten phai co it nhat 2 ky tu")
    if len(req.password) < 6:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Mat khau phai co it nhat 6 ky tu")

    account = create_account(req.email.strip().lower(), req.password, req.name.strip())
    token = create_token(account["id"], account["email"], account["name"])

    return {
        "success": True,
        "token": token,
        "user": {
            "id": account["user_id"],
            "name": account["name"],
            "email": account["email"],
        },
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate and return JWT token."""
    account = authenticate(req.email.strip().lower(), req.password)
    token = create_token(account["id"], account["email"], account["name"])

    return {
        "success": True,
        "token": token,
        "user": {
            "id": account["user_id"],
            "name": account["name"],
            "email": account["email"],
        },
    }


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Return current authenticated user info."""
    return {
        "id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "account_id": user["account_id"],
    }
