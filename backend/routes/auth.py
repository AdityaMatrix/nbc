from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import db
from config import UserRole
from models import UserCreate, UserLogin, UserResponse, TokenResponse, PasswordChange, UserSettings
from dependencies import get_current_user, hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api")


@router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.CAPEX_HEAD, UserRole.BUYER]:
        raise HTTPException(status_code=403, detail="Not authorized to create accounts")

    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    import uuid
    from datetime import datetime, timezone
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "department": user.department,
        "plant": user.plant,
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.users.insert_one(user_doc)
    return UserResponse(**{k: v for k, v in user_doc.items() if k != "password_hash"})


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(**{k: v for k, v in user.items() if k != "password_hash"})
    )


@router.post("/auth/google-login")
async def google_login(data: dict):
    from datetime import datetime, timezone
    import uuid

    email = data.get("email")
    name = data.get("name", "")
    google_id = data.get("google_id")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one({"email": email}, {"_id": 0})

    if not user:
        # Auto-create user with 'user' role for Google sign-ins
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "role": UserRole.USER,
            "department": None,
            "plant": None,
            "password_hash": hash_password(str(uuid.uuid4())),
            "google_id": google_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "google_oauth"
        }
        await db.users.insert_one(user)
        user.pop("_id", None)
    else:
        # Update google_id if not set
        if not user.get("google_id") and google_id:
            await db.users.update_one({"email": email}, {"$set": {"google_id": google_id}})

    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(**{k: v for k, v in user.items() if k not in ("password_hash", "google_id")})
    )



@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in current_user.items() if k != "password_hash"})


@router.post("/auth/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user or not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash}}
    )
    return {"message": "Password changed successfully"}


@router.put("/auth/settings")
async def update_settings(settings: UserSettings, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"settings": update_data}}
        )
    return {"message": "Settings updated"}


@router.post("/auth/forgot-password")
async def forgot_password(data: dict):
    from datetime import datetime, timezone
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        return {"message": "If the email exists, a reset request has been submitted"}

    existing_pending = await db.password_reset_requests.find_one({"email": email, "status": "pending"})
    if existing_pending:
        return {"message": "A reset request is already pending for this email"}

    import uuid
    reset_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "user_name": user.get("name", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.password_reset_requests.insert_one(reset_doc)
    return {"message": "Password reset request submitted. An admin will review it shortly."}
