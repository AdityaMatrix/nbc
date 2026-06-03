from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from database import db
from config import UserRole, PLANTS, DEPARTMENTS
from dependencies import get_current_user, hash_password

router = APIRouter(prefix="/api/admin")
logger = logging.getLogger(__name__)


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# --- Plant Management ---
class PlantCreate(BaseModel):
    name: str

class PlantUpdate(BaseModel):
    name: str


@router.get("/plants")
async def get_plants(admin: dict = Depends(require_admin)):
    plants = await db.plants.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    if not plants:
        for p in PLANTS:
            await db.plants.insert_one({"id": str(uuid.uuid4()), "name": p, "created_at": datetime.now(timezone.utc).isoformat()})
        plants = await db.plants.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return plants


@router.post("/plants")
async def create_plant(plant: PlantCreate, admin: dict = Depends(require_admin)):
    existing = await db.plants.find_one({"name": plant.name})
    if existing:
        raise HTTPException(status_code=400, detail="Plant already exists")
    doc = {"id": str(uuid.uuid4()), "name": plant.name, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.plants.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/plants/{plant_id}")
async def update_plant(plant_id: str, update: PlantUpdate, admin: dict = Depends(require_admin)):
    result = await db.plants.update_one({"id": plant_id}, {"$set": {"name": update.name}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    return {"message": "Plant updated"}


@router.delete("/plants/{plant_id}")
async def delete_plant(plant_id: str, admin: dict = Depends(require_admin)):
    plant = await db.plants.find_one({"id": plant_id}, {"_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    in_use = await db.capex_requests.count_documents({"plant": plant["name"]})
    if in_use > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {in_use} request(s) use this plant")
    await db.plants.delete_one({"id": plant_id})
    return {"message": "Plant deleted"}


# --- Department Management ---
class DepartmentCreate(BaseModel):
    name: str
    plant: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: str
    plant: Optional[str] = None


@router.get("/departments")
async def get_departments(admin: dict = Depends(require_admin)):
    depts = await db.departments.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    if not depts:
        for d in DEPARTMENTS:
            await db.departments.insert_one({"id": str(uuid.uuid4()), "name": d, "created_at": datetime.now(timezone.utc).isoformat()})
        depts = await db.departments.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    return depts


@router.post("/departments")
async def create_department(dept: DepartmentCreate, admin: dict = Depends(require_admin)):
    existing = await db.departments.find_one({"name": dept.name})
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")
    doc = {"id": str(uuid.uuid4()), "name": dept.name, "plant": dept.plant, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.departments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/departments/{dept_id}")
async def update_department(dept_id: str, update: DepartmentUpdate, admin: dict = Depends(require_admin)):
    result = await db.departments.update_one({"id": dept_id}, {"$set": {"name": update.name, "plant": update.plant}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department updated"}


@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, admin: dict = Depends(require_admin)):
    dept = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    in_use = await db.capex_requests.count_documents({"department": dept["name"]})
    if in_use > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {in_use} request(s) use this department")
    await db.departments.delete_one({"id": dept_id})
    return {"message": "Department deleted"}


# --- User Management (Admin) ---
class AdminUserCreate(BaseModel):
    email: str
    name: str
    role: str
    password: str
    employee_id: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    plant: Optional[str] = None
    mapped_dh_id: Optional[str] = None


@router.get("/users")
async def admin_get_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users


@router.get("/department-heads")
async def get_department_heads(admin: dict = Depends(require_admin)):
    dhs = await db.users.find({"role": "department_head"}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(100)
    return dhs


@router.get("/capex-heads")
async def get_capex_heads(admin: dict = Depends(require_admin)):
    chs = await db.users.find({"role": "capex_head"}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(100)
    return chs


@router.post("/users")
async def admin_create_user(user_data: AdminUserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if user_data.employee_id:
        existing_emp = await db.users.find_one({"employee_id": user_data.employee_id})
        if existing_emp:
            raise HTTPException(status_code=400, detail="Employee ID already exists")

    if user_data.role in ("user", "department_head"):
        if not user_data.plant or not user_data.department:
            raise HTTPException(status_code=400, detail="Plant and Department are mandatory for User/DH roles")
        if user_data.role == "user" and not user_data.mapped_dh_id:
            raise HTTPException(status_code=400, detail="User must be mapped to a Department Head")

    if user_data.role == "buyer" and not user_data.mapped_dh_id:
        raise HTTPException(status_code=400, detail="Buyer must be mapped to a Capex Head")

    doc = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "employee_id": user_data.employee_id or "",
        "mobile": user_data.mobile or "",
        "department": user_data.department,
        "plant": user_data.plant,
        "mapped_dh_id": user_data.mapped_dh_id,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["id"],
    }
    await db.users.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


@router.put("/users/{user_id}")
async def admin_update_user(user_id: str, update: dict, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    allowed_fields = {"name", "role", "department", "plant", "email", "employee_id", "mobile", "mapped_dh_id"}
    update_data = {k: v for k, v in update.items() if k in allowed_fields and v is not None}
    if not update_data:
        return user
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.delete_one({"id": user_id})
    return {"message": f"User {user['email']} deleted"}


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_password = "password123"
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": hash_password(new_password)}})
    return {"message": f"Password reset to '{new_password}'"}


# --- Password Reset Requests (Admin-assisted) ---
@router.get("/password-reset-requests")
async def get_reset_requests(admin: dict = Depends(require_admin)):
    requests = await db.password_reset_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests


@router.post("/password-reset-requests/{request_id}/approve")
async def approve_reset_request(request_id: str, admin: dict = Depends(require_admin)):
    req = await db.password_reset_requests.find_one({"id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Reset request not found")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    new_password = "password123"
    await db.users.update_one({"email": req["email"]}, {"$set": {"password_hash": hash_password(new_password)}})
    await db.password_reset_requests.update_one({"id": request_id}, {
        "$set": {"status": "approved", "processed_by": admin["name"], "processed_at": datetime.now(timezone.utc).isoformat(), "new_password": new_password}
    })
    return {"message": f"Password reset to '{new_password}' for {req['email']}"}


@router.post("/password-reset-requests/{request_id}/reject")
async def reject_reset_request(request_id: str, admin: dict = Depends(require_admin)):
    req = await db.password_reset_requests.find_one({"id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    await db.password_reset_requests.update_one({"id": request_id}, {
        "$set": {"status": "rejected", "processed_by": admin["name"], "processed_at": datetime.now(timezone.utc).isoformat()}
    })
    return {"message": "Reset request rejected"}


# --- Dashboard Stats ---
@router.get("/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_requests = await db.capex_requests.count_documents({})
    total_plants = await db.plants.count_documents({})
    total_depts = await db.departments.count_documents({})
    pending_resets = await db.password_reset_requests.count_documents({"status": "pending"})

    role_pipeline = [{"$group": {"_id": "$role", "count": {"$sum": 1}}}]
    role_counts = await db.users.aggregate(role_pipeline).to_list(20)

    return {
        "total_users": total_users,
        "total_requests": total_requests,
        "total_plants": total_plants if total_plants > 0 else len(PLANTS),
        "total_departments": total_depts if total_depts > 0 else len(DEPARTMENTS),
        "pending_resets": pending_resets,
        "role_breakdown": {r["_id"]: r["count"] for r in role_counts},
    }
