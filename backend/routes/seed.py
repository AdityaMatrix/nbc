from fastapi import APIRouter
from datetime import datetime, timezone
import uuid

from database import db
from config import UserRole
from dependencies import hash_password

router = APIRouter(prefix="/api")


@router.post("/seed-users")
async def seed_default_users():
    existing = await db.users.count_documents({})
    if existing > 0:
        return {"message": "Users already exist", "count": existing}

    default_users = [
        {"email": "manoj@capex.com", "name": "Manoj", "role": UserRole.CAPEX_HEAD, "password": "capex123"},
        {"email": "vijay@capex.com", "name": "Vijay", "role": UserRole.BUYER, "password": "buyer123"},
        {"email": "saurabh@capex.com", "name": "Saurabh", "role": UserRole.BUYER, "password": "buyer123"},
        {"email": "rajesh@capex.com", "name": "Rajesh Kumar", "role": UserRole.DEPARTMENT_HEAD, "password": "depthead123", "department": "Railway Bearing", "plant": "Jaipur"},
        {"email": "priya@capex.com", "name": "Priya Sharma", "role": UserRole.DEPARTMENT_HEAD, "password": "depthead123", "department": "Industrial Bearing", "plant": "Bagru"},
        {"email": "amit@capex.com", "name": "Amit Singh", "role": UserRole.USER, "password": "user123", "department": "Railway Bearing", "plant": "Jaipur"},
        {"email": "neha@capex.com", "name": "Neha Gupta", "role": UserRole.USER, "password": "user123", "department": "Industrial Bearing", "plant": "Bagru"},
        {"email": "rahul@capex.com", "name": "Rahul Verma", "role": UserRole.PROCESS_ENGINEERING, "password": "process123", "department": "Quality", "plant": "Newai"},
        {"email": "sunita@capex.com", "name": "Sunita Patel", "role": UserRole.PROCESS_ENGINEERING, "password": "process123", "department": "R&D", "plant": "Savli"},
    ]

    created_users = []
    for user_data in default_users:
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": user_data["email"],
            "name": user_data["name"],
            "role": user_data["role"],
            "department": user_data.get("department"),
            "plant": user_data.get("plant"),
            "password_hash": hash_password(user_data["password"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        }
        await db.users.insert_one(user_doc)
        created_users.append({"email": user_data["email"], "role": user_data["role"], "password": user_data["password"]})

    return {"message": "Default users created", "users": created_users}
