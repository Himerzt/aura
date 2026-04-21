"""Authentication helpers — password hashing, JWT, and FastAPI dependency."""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.database import get_connection

JWT_SECRET = os.getenv("JWT_SECRET", "aura-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72

_bearer = HTTPBearer(auto_error=False)


# ── Password ────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT ─────────────────────────────────────────────────────────────────────

def create_token(account_id: int, email: str, name: str) -> str:
    payload = {
        "sub": str(account_id),
        "email": email,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token het han — vui long dang nhap lai")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token khong hop le")


# ── Account DB helpers ──────────────────────────────────────────────────────

def create_account(email: str, password: str, name: str) -> dict:
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM accounts WHERE email = ?", (email,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email da duoc su dung")

        pw_hash = hash_password(password)
        cursor = conn.execute(
            "INSERT INTO accounts (email, password_hash, name) VALUES (?, ?, ?)",
            (email, pw_hash, name),
        )
        conn.commit()
        account_id = cursor.lastrowid

        # Create a linked user profile row
        user_id = f"user_{account_id}"
        conn.execute(
            "INSERT OR IGNORE INTO users (id, account_id, name) VALUES (?, ?, ?)",
            (user_id, account_id, name),
        )
        conn.commit()

        return {"id": account_id, "email": email, "name": name, "user_id": user_id}
    finally:
        conn.close()


def authenticate(email: str, password: str) -> dict:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, email, password_hash, name FROM accounts WHERE email = ?",
            (email,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Email hoac mat khau khong dung")
        if not verify_password(password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Email hoac mat khau khong dung")
        user_id = f"user_{row['id']}"
        return {"id": row["id"], "email": row["email"], "name": row["name"], "user_id": user_id}
    finally:
        conn.close()


# ── FastAPI dependency — inject current user ────────────────────────────────

async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chua dang nhap — vui long gui token trong header Authorization",
        )
    payload = decode_token(creds.credentials)
    return {
        "account_id": int(payload["sub"]),
        "email": payload["email"],
        "name": payload["name"],
        "user_id": f"user_{payload['sub']}",
    }
