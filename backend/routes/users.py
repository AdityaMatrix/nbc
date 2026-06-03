from fastapi import APIRouter, Depends, HTTPException
from typing import List
import logging

from database import db
from config import UserRole
from models import UserResponse, UserUpdate
from dependencies import get_current_user, hash_password

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.CAPEX_HEAD, UserRole.BUYER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update: UserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.CAPEX_HEAD, UserRole.BUYER]:
        raise HTTPException(status_code=403, detail="Only Capex Head and Buyers can update users")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        return UserResponse(**{k: v for k, v in user.items() if k != "password_hash"})

    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated_user)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.CAPEX_HEAD, UserRole.BUYER]:
        raise HTTPException(status_code=403, detail="Only Capex Head and Buyers can delete users")

    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.delete_one({"id": user_id})
    logger.info(f"User {user['email']} deleted by {current_user['name']}")
    return {"message": "User deleted successfully", "user_id": user_id}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.CAPEX_HEAD, UserRole.BUYER]:
        raise HTTPException(status_code=403, detail="Only Capex Head and Buyers can reset passwords")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    default_password = "password123"
    new_hash = hash_password(default_password)
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": new_hash}})

    logger.info(f"Password reset for {user['email']} by {current_user['name']}")
    return {"message": f"Password reset to '{default_password}'", "user_id": user_id}


@router.get("/users/buyers", response_model=List[UserResponse])
async def get_buyers(current_user: dict = Depends(get_current_user)):
    buyers = await db.users.find({"role": {"$in": [UserRole.BUYER, UserRole.CAPEX_HEAD]}}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [UserResponse(**b) for b in buyers]
