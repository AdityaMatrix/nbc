from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone
import uuid

from database import db
from config import UserRole
from models import CommentCreate
from dependencies import get_current_user
from helpers import notify_users

router = APIRouter(prefix="/api")


@router.post("/comments")
async def create_comment(comment: CommentCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    capex = await db.capex_requests.find_one({"id": comment.capex_request_id}, {"_id": 0})
    if not capex:
        raise HTTPException(status_code=404, detail="Capex request not found")

    comment_doc = {
        "id": str(uuid.uuid4()),
        "capex_request_id": comment.capex_request_id,
        "content": comment.content,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_role": current_user["role"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.comments.insert_one(comment_doc)

    notify_ids = []
    if current_user["id"] != capex["user_id"]:
        notify_ids.append(capex["user_id"])
    if capex.get("assigned_buyer_id") and capex["assigned_buyer_id"] != current_user["id"]:
        notify_ids.append(capex["assigned_buyer_id"])

    if notify_ids:
        background_tasks.add_task(notify_users, notify_ids, "New Comment",
            f"{current_user['name']} commented on request {comment.capex_request_id}", "comment", comment.capex_request_id)

    comment_doc.pop("_id", None)
    return comment_doc


@router.get("/comments")
async def get_comments(capex_request_id: str, current_user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"capex_request_id": capex_request_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return comments
