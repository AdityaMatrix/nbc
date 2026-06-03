from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from config import UserRole
from models import CapexRequestCreate, CapexRequestUpdate
from dependencies import get_current_user
from helpers import notify_users

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@router.post("/capex-requests")
async def create_capex_request(request: CapexRequestCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if current_user["role"] in [UserRole.USER, UserRole.DEPARTMENT_HEAD, UserRole.PROCESS_ENGINEERING]:
        user_dept = current_user.get("department")
        if user_dept and request.department != user_dept:
            raise HTTPException(
                status_code=403,
                detail=f"You can only create requests for your assigned department: {user_dept}"
            )

    plant_code = request.plant[:3].upper() if request.plant else "XXX"
    dept_words = request.department.split() if request.department else ["X"]
    dept_code = "".join([word[0].upper() for word in dept_words if word])
    if not dept_code:
        dept_code = "X"

    total_count = await db.capex_requests.count_documents({})
    serial_num = str(total_count + 1).zfill(3)
    request_id = f"{plant_code}-{dept_code}-{serial_num}"

    requirement_items = [item.model_dump() for item in request.requirement_items]
    requirement_description = "; ".join([item['description'] for item in requirement_items if item['description']])

    initial_status = "Pending DH Approval"
    initial_cea_status = None
    initial_pr_approval_status = None
    initial_workflow_status = None
    wbs_number = None

    if request.cea_required:
        if request.cea_type == "new":
            initial_workflow_status = "CEA Under Approval"
        elif request.cea_type == "existing":
            wbs_number = request.existing_cea_number
            initial_cea_status = "Approved"
            initial_workflow_status = "CEA Approved"

    if request.pr_available and request.pr_number:
        initial_pr_approval_status = "Approved"
        initial_workflow_status = "PR Approved"

    capex_doc = {
        "id": request_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_email": current_user["email"],
        "plant": request.plant,
        "department": request.department,
        "asset_category": request.asset_category,
        "requirement_items": requirement_items,
        "requirement_description": requirement_description,
        "requirement_type": request.requirement_type,
        "cea_required": request.cea_required,
        "cea_type": request.cea_type,
        "cea_number": None,
        "wbs_number": wbs_number,
        "cea_status": initial_cea_status,
        "pr_available": request.pr_available,
        "pr_number": request.pr_number if request.pr_available else None,
        "pr_approval_status": initial_pr_approval_status,
        "dap_required": request.dap_required,
        "justification": request.justification,
        "status": initial_status,
        "workflow_status": initial_workflow_status,
        "current_workflow_stage": "request",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "time_log": [{
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "Request Submitted",
            "by": current_user["name"],
            "by_id": current_user["id"]
        }],
        "attachments": [att.model_dump() for att in request.attachments] if request.attachments else [],
        "cea_creation_date": None,
        "pr_processed": False, "pr_approval_level": None,
        "po_available": False, "po_processed": False, "po_number": None, "po_approval_status": None, "po_approval_level": None,
        "expected_delivery_date": None, "installation_date": None,
        "commissioning_date": None, "commissioning_status": None,
        "assigned_buyer_id": None, "assigned_buyer_name": None,
        "dap_id": None,
        "dh_approval_status": "Pending",
        "dh_approved_by": None, "dh_approved_at": None, "dh_rejection_reason": None,
        "pdi_status": None, "pdi_date": None, "pdi_remarks": None,
        "delivery_status": None, "delivery_date": None,
        "suppliers": [],
        "payment_terms": [],
        "gst_applicable": None,
        "gst_percentage": None,
        "pr_provided_by": "user" if request.pr_available and request.pr_number else None
    }

    await db.capex_requests.insert_one(capex_doc)

    dept_heads = await db.users.find({"role": UserRole.DEPARTMENT_HEAD, "department": request.department}, {"_id": 0}).to_list(100)
    if dept_heads:
        head_ids = [h["id"] for h in dept_heads]
        background_tasks.add_task(notify_users, head_ids, "New Capex Request",
            f"New request {request_id} submitted by {current_user['name']} requires your approval.",
            "approval_required", request_id)

    capex_doc.pop("_id", None)
    return capex_doc


@router.get("/capex-requests")
async def get_capex_requests(status: Optional[str] = None, department: Optional[str] = None,
                             plant: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    user_dept = current_user.get("department")

    if current_user["role"] == UserRole.USER:
        if user_dept:
            query["department"] = user_dept
        else:
            query["user_id"] = current_user["id"]
    elif current_user["role"] == UserRole.DEPARTMENT_HEAD:
        if user_dept:
            query["department"] = user_dept
        else:
            query["department"] = current_user.get("department")
    elif current_user["role"] == UserRole.PROCESS_ENGINEERING:
        query["user_id"] = current_user["id"]
        if user_dept:
            query["department"] = user_dept
    elif current_user["role"] == UserRole.BUYER:
        query["$or"] = [{"status": {"$nin": ["Pending Approval", "Pending DH Approval", "Rejected", "Rejected by DH"]}}, {"assigned_buyer_id": current_user["id"]}]

    if status:
        query["status"] = status
    if department and current_user["role"] in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        query["department"] = department
    if plant:
        query["plant"] = plant

    requests = await db.capex_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    if current_user["role"] == UserRole.USER:
        for req in requests:
            req.pop("initial_price", None)
            req.pop("final_negotiated_price", None)

    return requests


@router.get("/capex-requests/search")
async def search_capex_requests(q: str, current_user: dict = Depends(get_current_user)):
    if not q or len(q) < 2:
        return []

    search_regex = {"$regex": q, "$options": "i"}
    search_query = {
        "$or": [
            {"id": search_regex},
            {"pr_number": search_regex},
            {"po_number": search_regex},
            {"vendor_name": search_regex},
            {"requirement_items.description": search_regex},
            {"requirement_items.pr_number": search_regex},
            {"requirement_items.po_number": search_regex},
            {"cea_number": search_regex}
        ]
    }

    if current_user["role"] == UserRole.USER:
        search_query = {"$and": [search_query, {"user_id": current_user["id"]}]}
    elif current_user["role"] == UserRole.DEPARTMENT_HEAD:
        search_query = {"$and": [search_query, {"department": current_user.get("department")}]}

    results = await db.capex_requests.find(search_query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return results


@router.get("/capex-requests/{request_id}")
async def get_capex_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.capex_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    user_dept = current_user.get("department")
    if current_user["role"] == UserRole.USER:
        if user_dept and request["department"] != user_dept:
            raise HTTPException(status_code=403, detail="You can only view requests from your department")
    elif current_user["role"] == UserRole.DEPARTMENT_HEAD:
        if user_dept and request["department"] != user_dept:
            raise HTTPException(status_code=403, detail="You can only view requests from your department")
    elif current_user["role"] == UserRole.PROCESS_ENGINEERING:
        if request["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only view your own requests")

    if current_user["role"] == UserRole.USER:
        request.pop("initial_price", None)
        request.pop("final_negotiated_price", None)

    return request


@router.put("/capex-requests/{request_id}")
async def update_capex_request(request_id: str, update: CapexRequestUpdate,
                               background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    request = await db.capex_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        return request

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    time_log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": f"Updated: {', '.join(update_data.keys())}",
        "by": current_user["name"],
        "by_id": current_user["id"]
    }

    if update.assigned_buyer_id:
        buyer = await db.users.find_one({"id": update.assigned_buyer_id}, {"_id": 0})
        if buyer:
            update_data["assigned_buyer_name"] = buyer["name"]
            background_tasks.add_task(notify_users, [update.assigned_buyer_id], "Request Assigned",
                f"Capex request {request_id} has been assigned to you.", "assignment", request_id)

    # Sync top-level fields from requirement_items
    if "requirement_items" in update_data:
        items = update_data["requirement_items"]
        if items and len(items) > 0:
            item_cea_statuses = [it.get("cea_status") for it in items if it.get("cea_status")]
            if item_cea_statuses:
                if all(s == "Approved" for s in item_cea_statuses):
                    update_data["cea_status"] = "Approved"
                else:
                    non_approved = [s for s in item_cea_statuses if s != "Approved"]
                    update_data["cea_status"] = non_approved[0] if non_approved else item_cea_statuses[0]
            item_cea_numbers = [it.get("cea_number") for it in items if it.get("cea_number")]
            if item_cea_numbers:
                update_data["cea_number"] = item_cea_numbers[0]
            item_pr_statuses = [it.get("pr_status") for it in items if it.get("pr_status")]
            if item_pr_statuses:
                if all(s == "Approved" for s in item_pr_statuses):
                    update_data["pr_approval_status"] = "Approved"
                else:
                    non_approved = [s for s in item_pr_statuses if s != "Approved"]
                    update_data["pr_approval_status"] = non_approved[0] if non_approved else item_pr_statuses[0]
            item_pr_numbers = [it.get("pr_number") for it in items if it.get("pr_number")]
            if item_pr_numbers:
                update_data["pr_number"] = item_pr_numbers[0]
            item_po_statuses = [it.get("po_status") for it in items if it.get("po_status")]
            if item_po_statuses:
                if all(s == "Approved" for s in item_po_statuses):
                    update_data["po_approval_status"] = "Approved"
                else:
                    non_approved = [s for s in item_po_statuses if s != "Approved"]
                    update_data["po_approval_status"] = non_approved[0] if non_approved else item_po_statuses[0]
            item_po_numbers = [it.get("po_number") for it in items if it.get("po_number")]
            if item_po_numbers:
                update_data["po_number"] = item_po_numbers[0]
            for date_field in ["cea_created_date", "cea_approved_date", "pr_created_date", "pr_approved_date", "po_created_date", "po_approved_date"]:
                item_dates = [it.get(date_field) for it in items if it.get(date_field)]
                if item_dates:
                    update_data[date_field] = item_dates[0]

    # Auto-infer statuses from date fields
    merged_data = {**request, **update_data}

    if "requirement_items" in update_data:
        items = update_data["requirement_items"]
        items_changed = False
        for item in items:
            if item.get("cea_approved_date") and item.get("cea_status") != "Approved":
                item["cea_status"] = "Approved"
                items_changed = True
            elif item.get("cea_created_date") and not item.get("cea_status"):
                item["cea_status"] = "Capex Head"
                items_changed = True
            if item.get("pr_approved_date") and item.get("pr_status") != "Approved":
                item["pr_status"] = "Approved"
                items_changed = True
            elif item.get("pr_created_date") and not item.get("pr_status"):
                item["pr_status"] = "01"
                items_changed = True
            if item.get("po_approved_date") and item.get("po_status") != "Approved":
                item["po_status"] = "Approved"
                items_changed = True
            elif item.get("po_created_date") and not item.get("po_status"):
                item["po_status"] = "01"
                items_changed = True
            if item.get("ordered_date") and not item.get("po_available"):
                item["po_available"] = True
                items_changed = True
        if items_changed:
            item_cea_statuses = [it.get("cea_status") for it in items if it.get("cea_status")]
            if item_cea_statuses:
                update_data["cea_status"] = "Approved" if all(s == "Approved" for s in item_cea_statuses) else next((s for s in item_cea_statuses if s != "Approved"), item_cea_statuses[0])
            item_pr_statuses = [it.get("pr_status") for it in items if it.get("pr_status")]
            if item_pr_statuses:
                update_data["pr_approval_status"] = "Approved" if all(s == "Approved" for s in item_pr_statuses) else next((s for s in item_pr_statuses if s != "Approved"), item_pr_statuses[0])
            item_po_statuses = [it.get("po_status") for it in items if it.get("po_status")]
            if item_po_statuses:
                update_data["po_approval_status"] = "Approved" if all(s == "Approved" for s in item_po_statuses) else next((s for s in item_po_statuses if s != "Approved"), item_po_statuses[0])
            merged_data = {**request, **update_data}

    # Top-level date → status inference
    if merged_data.get("cea_approved_date") and merged_data.get("cea_status") != "Approved":
        update_data["cea_status"] = "Approved"
    elif merged_data.get("cea_created_date") and not merged_data.get("cea_status"):
        update_data["cea_status"] = "Capex Head"

    if merged_data.get("pr_approved_date") and merged_data.get("pr_approval_status") != "Approved":
        update_data["pr_approval_status"] = "Approved"
    elif merged_data.get("pr_created_date") and not merged_data.get("pr_approval_status"):
        update_data["pr_approval_status"] = "01"

    if merged_data.get("po_approved_date") and merged_data.get("po_approval_status") != "Approved":
        update_data["po_approval_status"] = "Approved"
    elif merged_data.get("po_created_date") and not merged_data.get("po_approval_status"):
        update_data["po_approval_status"] = "01"

    if merged_data.get("ordered_date") and not merged_data.get("po_available"):
        update_data["po_available"] = True

    merged_data = {**request, **update_data}

    # Auto-calculate workflow_status
    auto_workflow_status = None
    cea_required = merged_data.get("cea_required", False)
    cea_status = merged_data.get("cea_status")
    pr_approval_status = merged_data.get("pr_approval_status")
    po_approval_status = merged_data.get("po_approval_status")
    dap_required = merged_data.get("dap_required", False)
    dap_id = merged_data.get("dap_id")
    pdi_status = merged_data.get("pdi_status")
    pdi_date = merged_data.get("pdi_date")
    delivery_status = merged_data.get("delivery_status")
    installation_date = merged_data.get("installation_date")
    commissioning_date = merged_data.get("commissioning_date")

    if commissioning_date:
        auto_workflow_status = "Completed"
    elif installation_date:
        auto_workflow_status = "Installation in Progress"
    elif delivery_status == "Delivered":
        auto_workflow_status = "Delivered"
    elif delivery_status in ("Dispatched", "Delivery Schedule"):
        auto_workflow_status = delivery_status
    elif delivery_status == "Yet to Dispatch":
        auto_workflow_status = "Yet to Dispatch"
    elif pdi_status == "Completed":
        auto_workflow_status = "PDI Completed"
    elif pdi_date or pdi_status:
        auto_workflow_status = "PDI"
    elif dap_required and dap_id:
        dap_doc = await db.dap_documents.find_one({"id": dap_id}, {"_id": 0, "status": 1})
        if dap_doc:
            if dap_doc.get("status") == "Approved":
                auto_workflow_status = "DAP Approved"
            else:
                auto_workflow_status = "DAP Under Approval"

    if not auto_workflow_status:
        if merged_data.get("ordered_date"):
            auto_workflow_status = "Order Placed"
        elif po_approval_status == "Approved":
            auto_workflow_status = "PO Approved"
        elif po_approval_status and po_approval_status != "Approved":
            auto_workflow_status = "PO Under Approval"
        elif pr_approval_status == "Approved":
            auto_workflow_status = "PR Approved"
        elif pr_approval_status and pr_approval_status != "Approved":
            auto_workflow_status = "PR Under Approval"
        elif cea_required and cea_status == "Approved":
            auto_workflow_status = "CEA Approved"
        elif cea_required and cea_status and cea_status != "Approved":
            auto_workflow_status = "CEA Processing"

    if auto_workflow_status:
        update_data["workflow_status"] = auto_workflow_status
        if auto_workflow_status == "Completed":
            update_data["status"] = "Completed"

    await db.capex_requests.update_one({"id": request_id}, {"$set": update_data, "$push": {"time_log": time_log_entry}})

    if update.status:
        background_tasks.add_task(notify_users, [request["user_id"]], "Request Status Updated",
            f"Your request {request_id} status changed to: {update.status}", "status_update", request_id)

    updated = await db.capex_requests.find_one({"id": request_id}, {"_id": 0})
    return updated


@router.post("/capex-requests/{request_id}/approve")
async def approve_request(request_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.DEPARTMENT_HEAD, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Not authorized to approve")

    request = await db.capex_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    time_log_entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "action": "Approved",
                      "by": current_user["name"], "by_id": current_user["id"]}

    if request.get("status") == "Pending DH Approval" and current_user["role"] == UserRole.DEPARTMENT_HEAD:
        time_log_entry["action"] = "DH Approved"
        await db.capex_requests.update_one({"id": request_id}, {
            "$set": {
                "status": "Submitted",
                "dh_approval_status": "Approved",
                "dh_approved_by": current_user["id"],
                "dh_approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"time_log": time_log_entry}
        })
        background_tasks.add_task(notify_users, [request["user_id"]], "Request Approved by DH",
            f"Your request {request_id} has been approved by Department Head {current_user['name']}.", "dh_approval", request_id)

        buyers_and_head = await db.users.find({"role": {"$in": [UserRole.BUYER, UserRole.CAPEX_HEAD]}}, {"_id": 0}).to_list(100)
        if buyers_and_head:
            ids = [u["id"] for u in buyers_and_head]
            background_tasks.add_task(notify_users, ids, "New Request Available",
                f"Request {request_id} has been approved by DH and is ready for processing.", "new_request", request_id)

        return {"message": "Request approved by Department Head", "request_id": request_id}

    await db.capex_requests.update_one({"id": request_id}, {
        "$set": {"status": "Approved", "approved_by": current_user["id"],
                 "approved_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        "$push": {"time_log": time_log_entry}
    })

    background_tasks.add_task(notify_users, [request["user_id"]], "Request Approved",
        f"Your request {request_id} has been approved by {current_user['name']}.", "approval", request_id)

    return {"message": "Request approved", "request_id": request_id}


@router.post("/capex-requests/{request_id}/reject")
async def reject_request(request_id: str, reason: str = "", background_tasks: BackgroundTasks = None,
                         current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.DEPARTMENT_HEAD, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Not authorized to reject")

    request = await db.capex_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.get("status") == "Pending DH Approval" and current_user["role"] == UserRole.DEPARTMENT_HEAD:
        time_log_entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "action": f"Rejected by DH: {reason}",
                          "by": current_user["name"], "by_id": current_user["id"]}
        await db.capex_requests.update_one({"id": request_id}, {
            "$set": {"status": "Rejected by DH", "dh_approval_status": "Rejected",
                     "dh_rejection_reason": reason, "dh_approved_by": current_user["id"],
                     "updated_at": datetime.now(timezone.utc).isoformat()},
            "$push": {"time_log": time_log_entry}
        })
        if background_tasks:
            background_tasks.add_task(notify_users, [request["user_id"]], "Request Rejected by DH",
                f"Your request {request_id} has been rejected by Department Head. Reason: {reason}", "dh_rejection", request_id)
        return {"message": "Request rejected by Department Head", "request_id": request_id}

    time_log_entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "action": f"Rejected: {reason}",
                      "by": current_user["name"], "by_id": current_user["id"]}

    await db.capex_requests.update_one({"id": request_id}, {
        "$set": {"status": "Rejected", "rejected_by": current_user["id"], "rejection_reason": reason,
                 "updated_at": datetime.now(timezone.utc).isoformat()},
        "$push": {"time_log": time_log_entry}
    })

    if background_tasks:
        background_tasks.add_task(notify_users, [request["user_id"]], "Request Rejected",
            f"Your request {request_id} has been rejected. Reason: {reason}", "rejection", request_id)

    return {"message": "Request rejected", "request_id": request_id}


@router.delete("/capex-requests/{request_id}")
async def delete_capex_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.capex_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.capex_requests.delete_one({"id": request_id})
    await db.comments.delete_many({"capex_request_id": request_id})
    await db.sample_requests.delete_many({"capex_request_id": request_id})
    await db.dap_documents.delete_many({"capex_request_id": request_id})
    await db.vendor_quotations.delete_many({"capex_request_id": request_id})

    logger.info(f"Request {request_id} deleted by {current_user['name']} ({current_user['role']})")
    return {"message": "Request deleted successfully", "request_id": request_id}
