from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from database import db
from config import UserRole
from models import ProjectGroupCreate, ProjectGroupUpdate
from dependencies import get_current_user

router = APIRouter(prefix="/api")


def _require_group_role(current_user: dict):
    """Only buyer and capex_head can manage groups."""
    if current_user["role"] not in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Not authorized to manage project groups")


@router.get("/project-groups")
async def list_groups(current_user: dict = Depends(get_current_user)):
    _require_group_role(current_user)
    groups = await db.project_groups.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return groups


@router.post("/project-groups")
async def create_group(body: ProjectGroupCreate, current_user: dict = Depends(get_current_user)):
    _require_group_role(current_user)

    # Validate that project_ids actually exist
    if body.project_ids:
        existing = await db.capex_requests.find(
            {"id": {"$in": body.project_ids}}, {"_id": 0, "id": 1}
        ).to_list(len(body.project_ids))
        existing_ids = {r["id"] for r in existing}
        invalid = set(body.project_ids) - existing_ids
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid project IDs: {', '.join(invalid)}")

    # Ensure these projects are not already in another group
    if body.project_ids:
        conflicts = await db.project_groups.find(
            {"project_ids": {"$in": body.project_ids}}, {"_id": 0, "id": 1, "name": 1, "project_ids": 1}
        ).to_list(100)
        for g in conflicts:
            overlap = set(body.project_ids) & set(g["project_ids"])
            if overlap:
                raise HTTPException(
                    status_code=400,
                    detail=f"Projects {', '.join(overlap)} already belong to group '{g['name']}'"
                )

    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "description": body.description,
        "project_ids": body.project_ids,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.project_groups.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/project-groups/{group_id}")
async def update_group(group_id: str, body: ProjectGroupUpdate, current_user: dict = Depends(get_current_user)):
    _require_group_role(current_user)

    group = await db.project_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        return group

    # If updating project_ids, validate them
    if "project_ids" in update_data:
        new_ids = update_data["project_ids"]
        if new_ids:
            existing = await db.capex_requests.find(
                {"id": {"$in": new_ids}}, {"_id": 0, "id": 1}
            ).to_list(len(new_ids))
            existing_ids = {r["id"] for r in existing}
            invalid = set(new_ids) - existing_ids
            if invalid:
                raise HTTPException(status_code=400, detail=f"Invalid project IDs: {', '.join(invalid)}")

            # Check conflicts with OTHER groups (not this one)
            conflicts = await db.project_groups.find(
                {"project_ids": {"$in": new_ids}, "id": {"$ne": group_id}},
                {"_id": 0, "id": 1, "name": 1, "project_ids": 1}
            ).to_list(100)
            for g in conflicts:
                overlap = set(new_ids) & set(g["project_ids"])
                if overlap:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Projects {', '.join(overlap)} already belong to group '{g['name']}'"
                    )

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.project_groups.update_one({"id": group_id}, {"$set": update_data})

    updated = await db.project_groups.find_one({"id": group_id}, {"_id": 0})
    return updated


@router.delete("/project-groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(get_current_user)):
    _require_group_role(current_user)

    group = await db.project_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    await db.project_groups.delete_one({"id": group_id})
    return {"message": "Group deleted", "id": group_id}
