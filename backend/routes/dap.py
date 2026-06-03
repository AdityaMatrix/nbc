from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone
import logging

from database import db
from config import UserRole
from models import DAPCreate, DAPApprovalUpdate, DAPRevisionUpload
from dependencies import get_current_user
from helpers import notify_users

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

import uuid


@router.post("/dap")
async def create_dap(dap: DAPCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Not authorized")

    capex = await db.capex_requests.find_one({"id": dap.capex_request_id}, {"_id": 0})
    if not capex:
        raise HTTPException(status_code=404, detail="Capex request not found")

    dap_id = f"DAP-{str(uuid.uuid4())[:8].upper()}"

    dap_doc = {
        "id": dap_id,
        "capex_request_id": dap.capex_request_id,
        "version": 1,
        "documents": dap.documents,
        "status": "Pending Approval",
        "process_engineer_approval_status": "Pending",
        "process_engineer_approval_by": None,
        "process_engineer_approval_date": None,
        "dept_head_approval_status": "Pending",
        "dept_head_approval_by": None,
        "dept_head_approval_date": None,
        "user_approval_status": "Pending",
        "user_approval_by": None,
        "user_approval_date": None,
        "change_requests": [],
        "created_by_id": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "activity_log": [{
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "DAP created - Awaiting Process Engineer approval",
            "by": current_user["name"],
            "by_id": current_user["id"],
            "version": 1
        }]
    }

    await db.dap_documents.insert_one(dap_doc)

    await db.capex_requests.update_one({"id": dap.capex_request_id}, {
        "$set": {"dap_required": True, "dap_id": dap_id, "status": "DAP Review", "workflow_status": "DAP Under Approval"},
        "$push": {"time_log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": f"DAP {dap_id} created - awaiting Process Engineer approval",
            "by": current_user["name"],
            "by_id": current_user["id"]
        }}
    })

    process_engineers = await db.users.find({"role": UserRole.PROCESS_ENGINEERING}, {"_id": 0}).to_list(10)
    notify_ids = [pe["id"] for pe in process_engineers]

    background_tasks.add_task(notify_users, notify_ids, "DAP Approval Required",
        f"DAP document for request {dap.capex_request_id} requires your approval (Step 1/3).", "dap_review", dap_id)

    dap_doc.pop("_id", None)
    return dap_doc


@router.get("/dap/{dap_id}")
async def get_dap(dap_id: str, current_user: dict = Depends(get_current_user)):
    dap = await db.dap_documents.find_one({"id": dap_id}, {"_id": 0})
    if not dap:
        raise HTTPException(status_code=404, detail="DAP not found")
    return dap


@router.get("/dap/capex/{capex_request_id}")
async def get_dap_by_capex(capex_request_id: str, current_user: dict = Depends(get_current_user)):
    dap = await db.dap_documents.find_one({"capex_request_id": capex_request_id}, {"_id": 0})
    return dap


@router.put("/dap/{dap_id}/approve")
async def approve_dap(dap_id: str, update: DAPApprovalUpdate, background_tasks: BackgroundTasks,
                      current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.USER, UserRole.DEPARTMENT_HEAD, UserRole.PROCESS_ENGINEERING]:
        raise HTTPException(status_code=403, detail="Not authorized to approve DAP")

    dap = await db.dap_documents.find_one({"id": dap_id}, {"_id": 0})
    if not dap:
        raise HTTPException(status_code=404, detail="DAP not found")

    capex = await db.capex_requests.find_one({"id": dap["capex_request_id"]}, {"_id": 0})

    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    activity_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "by": current_user["name"],
        "by_id": current_user["id"],
        "role": current_user["role"],
        "version": dap["version"]
    }

    if current_user["role"] == UserRole.PROCESS_ENGINEERING:
        pe_status = dap.get("process_engineer_approval_status", "Pending")
        if pe_status == "Approved":
            raise HTTPException(status_code=400, detail="Process Engineer has already approved")

        if update.action == "approve":
            update_data["process_engineer_approval_status"] = "Approved"
            update_data["process_engineer_approval_by"] = current_user["id"]
            update_data["process_engineer_approval_date"] = datetime.now(timezone.utc).isoformat()
            activity_entry["action"] = "Process Engineer approved DAP (Step 1/3)"

            dept_heads = await db.users.find({"role": UserRole.DEPARTMENT_HEAD, "department": capex["department"]}, {"_id": 0}).to_list(10)
            notify_ids = [h["id"] for h in dept_heads]
            background_tasks.add_task(notify_users, notify_ids, "DAP Approval Required",
                f"DAP for request {dap['capex_request_id']} requires your approval (Step 2/3).", "dap_review", dap_id)
        else:
            update_data["process_engineer_approval_status"] = "Changes Required"
            update_data["status"] = "Changes Required"
            activity_entry["action"] = "Process Engineer requested changes"
            activity_entry["comment"] = update.comment
            activity_entry["change_type"] = update.change_type

            change_request = {
                "requested_by": current_user["name"],
                "requested_by_id": current_user["id"],
                "role": "Process Engineer",
                "comment": update.comment,
                "change_type": update.change_type,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await db.dap_documents.update_one({"id": dap_id}, {"$push": {"change_requests": change_request}})

    elif current_user["role"] == UserRole.DEPARTMENT_HEAD:
        pe_status = dap.get("process_engineer_approval_status", "Pending")
        if pe_status != "Approved":
            raise HTTPException(status_code=400, detail="Process Engineer must approve first")

        dh_status = dap.get("dept_head_approval_status", "Pending")
        if dh_status == "Approved":
            raise HTTPException(status_code=400, detail="Department Head has already approved")

        if update.action == "approve":
            update_data["dept_head_approval_status"] = "Approved"
            update_data["dept_head_approval_by"] = current_user["id"]
            update_data["dept_head_approval_date"] = datetime.now(timezone.utc).isoformat()
            activity_entry["action"] = "Department Head approved DAP (Step 2/3)"

            background_tasks.add_task(notify_users, [capex["user_id"]], "DAP Approval Required",
                f"DAP for request {dap['capex_request_id']} requires your final approval (Step 3/3).", "dap_review", dap_id)
        else:
            update_data["dept_head_approval_status"] = "Changes Required"
            update_data["status"] = "Changes Required"
            activity_entry["action"] = "Department Head requested changes"
            activity_entry["comment"] = update.comment
            activity_entry["change_type"] = update.change_type

            change_request = {
                "requested_by": current_user["name"],
                "requested_by_id": current_user["id"],
                "role": "Department Head",
                "comment": update.comment,
                "change_type": update.change_type,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await db.dap_documents.update_one({"id": dap_id}, {"$push": {"change_requests": change_request}})

    elif current_user["role"] == UserRole.USER:
        dh_status = dap.get("dept_head_approval_status", "Pending")
        if dh_status != "Approved":
            raise HTTPException(status_code=400, detail="Department Head must approve first")

        user_status = dap.get("user_approval_status", "Pending")
        if user_status == "Approved":
            raise HTTPException(status_code=400, detail="User has already approved")

        if update.action == "approve":
            update_data["user_approval_status"] = "Approved"
            update_data["user_approval_by"] = current_user["id"]
            update_data["user_approval_date"] = datetime.now(timezone.utc).isoformat()
            activity_entry["action"] = "User approved DAP (Step 3/3 - Final)"
        else:
            update_data["user_approval_status"] = "Changes Required"
            update_data["status"] = "Changes Required"
            activity_entry["action"] = "User requested changes"
            activity_entry["comment"] = update.comment
            activity_entry["change_type"] = update.change_type

            change_request = {
                "requested_by": current_user["name"],
                "requested_by_id": current_user["id"],
                "role": "User",
                "comment": update.comment,
                "change_type": update.change_type,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await db.dap_documents.update_one({"id": dap_id}, {"$push": {"change_requests": change_request}})

    await db.dap_documents.update_one({"id": dap_id}, {"$set": update_data, "$push": {"activity_log": activity_entry}})

    updated_dap = await db.dap_documents.find_one({"id": dap_id}, {"_id": 0})
    pe_approved = updated_dap.get("process_engineer_approval_status") == "Approved"
    dh_approved = updated_dap.get("dept_head_approval_status") == "Approved"
    user_approved = updated_dap.get("user_approval_status") == "Approved"

    if pe_approved and dh_approved and user_approved:
        await db.dap_documents.update_one({"id": dap_id}, {"$set": {"status": "Approved"}})
        await db.capex_requests.update_one({"id": dap["capex_request_id"]}, {
            "$set": {"status": "Under Delivery", "workflow_status": "DAP Approved"},
            "$push": {"time_log": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": "DAP approved by all parties (PE -> DH -> User) - proceeding to delivery",
                "by": "System", "by_id": "system"
            }}
        })
        background_tasks.add_task(notify_users, [dap["created_by_id"]], "DAP Approved",
            f"DAP {dap_id} has been fully approved. Proceeding to delivery.", "dap_approved", dap_id)

    elif update.action == "request_changes":
        background_tasks.add_task(notify_users, [dap["created_by_id"]], "DAP Changes Required",
            f"Changes requested on DAP {dap_id}: {update.comment}", "dap_changes", dap_id)

    return await db.dap_documents.find_one({"id": dap_id}, {"_id": 0})


@router.put("/dap/{dap_id}/revise")
async def revise_dap(dap_id: str, revision: DAPRevisionUpload, background_tasks: BackgroundTasks,
                     current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Only buyer can revise DAP")

    dap = await db.dap_documents.find_one({"id": dap_id}, {"_id": 0})
    if not dap:
        raise HTTPException(status_code=404, detail="DAP not found")

    new_version = dap["version"] + 1

    update_data = {
        "version": new_version,
        "documents": revision.documents,
        "status": "Pending Approval",
        "user_approval_status": "Pending",
        "user_approval_by": None,
        "user_approval_date": None,
        "dept_head_approval_status": "Pending",
        "dept_head_approval_by": None,
        "dept_head_approval_date": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    activity_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": f"DAP revised - Version {new_version}",
        "by": current_user["name"],
        "by_id": current_user["id"],
        "version": new_version
    }

    await db.dap_documents.update_one({"id": dap_id}, {"$set": update_data, "$push": {"activity_log": activity_entry}})

    capex = await db.capex_requests.find_one({"id": dap["capex_request_id"]}, {"_id": 0})
    if capex:
        dept_heads = await db.users.find({"role": UserRole.DEPARTMENT_HEAD, "department": capex["department"]}, {"_id": 0}).to_list(10)
        notify_ids = [capex["user_id"]] + [h["id"] for h in dept_heads]
        background_tasks.add_task(notify_users, notify_ids, "DAP Revised",
            f"DAP {dap_id} has been revised (Version {new_version}). Please review.", "dap_revised", dap_id)

    return await db.dap_documents.find_one({"id": dap_id}, {"_id": 0})
