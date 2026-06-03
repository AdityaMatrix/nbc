from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from database import db
from config import UserRole
from dependencies import get_current_user

router = APIRouter(prefix="/api")


@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)

    dynamic_notifications = []

    if current_user["role"] == UserRole.DEPARTMENT_HEAD:
        user_dept = current_user.get("department")
        pending_query = {"status": "Pending DH Approval"}
        if user_dept:
            pending_query["department"] = user_dept
        pending = await db.capex_requests.count_documents(pending_query)
        if pending > 0:
            dynamic_notifications.append({
                "id": "dh-pending",
                "title": "Pending Approvals",
                "message": f"You have {pending} request(s) awaiting your approval",
                "type": "approval_needed",
                "link": "/dashboard",
                "read": False,
                "is_dynamic": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    elif current_user["role"] == UserRole.BUYER:
        unassigned = await db.capex_requests.count_documents({
            "assigned_buyer_id": None,
            "status": {"$nin": ["Pending DH Approval", "Rejected by DH", "Rejected"]}
        })
        if unassigned > 0:
            dynamic_notifications.append({
                "id": "buyer-unassigned",
                "title": "Unassigned Requests",
                "message": f"{unassigned} request(s) need buyer assignment",
                "type": "assignment",
                "link": "/dashboard",
                "read": False,
                "is_dynamic": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        my_pending = await db.capex_requests.count_documents({
            "assigned_buyer_id": current_user["id"],
            "workflow_status": {"$nin": ["Completed", None]}
        })
        if my_pending > 0:
            dynamic_notifications.append({
                "id": "buyer-assigned",
                "title": "Your Active Requests",
                "message": f"You have {my_pending} request(s) in progress",
                "type": "status_update",
                "link": "/dashboard",
                "read": False,
                "is_dynamic": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    elif current_user["role"] == UserRole.CAPEX_HEAD:
        pending_approval = await db.capex_requests.count_documents({"status": "Pending Approval"})
        if pending_approval > 0:
            dynamic_notifications.append({
                "id": "capex-pending",
                "title": "Pending Final Approvals",
                "message": f"{pending_approval} request(s) need your approval",
                "type": "approval_needed",
                "link": "/dashboard",
                "read": False,
                "is_dynamic": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        high_value = await db.capex_requests.count_documents({
            "final_negotiated_price": {"$gte": 1000000},
            "workflow_status": {"$ne": "Completed"}
        })
        if high_value > 0:
            dynamic_notifications.append({
                "id": "capex-highvalue",
                "title": "High Value Requests",
                "message": f"{high_value} request(s) above 10L in progress",
                "type": "alert",
                "link": "/dashboard",
                "read": False,
                "is_dynamic": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    elif current_user["role"] in [UserRole.USER, UserRole.PROCESS_ENGINEERING]:
        user_requests = await db.capex_requests.find(
            {"user_id": current_user["id"]},
            {"_id": 0, "id": 1, "status": 1, "workflow_status": 1}
        ).to_list(100)

        pending = len([r for r in user_requests if r.get("status") in ["Pending DH Approval", "Pending Approval"]])
        if pending > 0:
            dynamic_notifications.append({
                "id": "user-pending",
                "title": "Pending Requests",
                "message": f"{pending} of your request(s) are awaiting approval",
                "type": "status_update",
                "link": "/dashboard",
                "read": False,
                "is_dynamic": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        in_progress = len([r for r in user_requests if r.get("workflow_status") and r.get("workflow_status") not in ["Completed", None]])
        if in_progress > 0:
            dynamic_notifications.append({
                "id": "user-progress",
                "title": "Requests In Progress",
                "message": f"{in_progress} of your request(s) are being processed",
                "type": "status_update",
                "link": "/dashboard",
                "read": False,
                "is_dynamic": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    all_notifications = dynamic_notifications + notifications
    return all_notifications


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}
