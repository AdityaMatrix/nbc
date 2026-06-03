from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from database import db
from config import UserRole
from models import SampleRequestCreate, SamplePreparationUpdate, SamplePickupUpdate
from dependencies import get_current_user
from helpers import notify_users

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@router.post("/sample-requests")
async def create_sample_request(request: SampleRequestCreate, background_tasks: BackgroundTasks,
                                current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Only buyers can create sample requests")

    capex = await db.capex_requests.find_one({"id": request.capex_request_id}, {"_id": 0})
    if not capex:
        raise HTTPException(status_code=404, detail="Capex request not found")

    sample_request_id = f"SR-{str(uuid.uuid4())[:8].upper()}"

    sample_doc = {
        "id": sample_request_id,
        "capex_request_id": request.capex_request_id,
        "user_id": capex.get("user_id"),
        "line_items": [item.model_dump() for item in request.line_items],
        "status": "Pending",
        "created_by_id": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "sample_requested_date": datetime.now(timezone.utc).isoformat(),
        "readiness_status": None,
        "tentative_pickup_date": None,
        "preparation_items": [],
        "gate_pass_available": False,
        "gate_pass_document_url": None,
        "preparation_date": None,
        "ready_for_pickup_date": None,
        "pickup_date": None,
        "dispatch_date": None,
        "dispatch_reference": None,
        "delivery_date": None,
        "activity_log": [{
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "Sample request created by Buyer",
            "by": current_user["name"],
            "by_id": current_user["id"],
            "details": f"{len(request.line_items)} item(s) requested"
        }]
    }

    await db.sample_requests.insert_one(sample_doc)

    await db.capex_requests.update_one({"id": request.capex_request_id}, {
        "$set": {"status": "Sample Request", "updated_at": datetime.now(timezone.utc).isoformat()},
        "$push": {"time_log": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": f"Sample request {sample_request_id} created by {current_user['name']}",
            "by": current_user["name"],
            "by_id": current_user["id"]
        }}
    })

    background_tasks.add_task(notify_users, [capex["user_id"]], "Sample Request - Action Required",
        f"Buyer {current_user['name']} has requested samples for {request.capex_request_id}. Please prepare the samples.",
        "sample_request", sample_request_id)

    sample_doc.pop("_id", None)
    return sample_doc


@router.get("/sample-requests")
async def get_sample_requests(capex_request_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if capex_request_id:
        query["capex_request_id"] = capex_request_id

    user_roles = [UserRole.USER, UserRole.DEPARTMENT_HEAD, UserRole.PROCESS_ENGINEERING]
    if current_user["role"] in user_roles:
        if current_user["role"] == UserRole.DEPARTMENT_HEAD:
            user_requests = await db.capex_requests.find(
                {"department": current_user.get("department")},
                {"id": 1, "_id": 0}
            ).to_list(1000)
        else:
            user_requests = await db.capex_requests.find(
                {"user_id": current_user["id"]},
                {"id": 1, "_id": 0}
            ).to_list(1000)
        request_ids = [r["id"] for r in user_requests]

        if capex_request_id:
            if capex_request_id not in request_ids:
                return []
        else:
            query["capex_request_id"] = {"$in": request_ids}

    samples = await db.sample_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return samples


@router.get("/sample-requests/{sample_id}")
async def get_sample_request(sample_id: str, current_user: dict = Depends(get_current_user)):
    sample = await db.sample_requests.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample request not found")
    return sample


@router.put("/sample-requests/{sample_id}/preparation")
async def update_sample_preparation(sample_id: str, update: SamplePreparationUpdate,
                                    background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    allowed_roles = [UserRole.USER, UserRole.DEPARTMENT_HEAD, UserRole.PROCESS_ENGINEERING]
    if current_user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Only users can update sample preparation")

    sample = await db.sample_requests.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample request not found")

    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    activity_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "by": current_user["name"],
        "by_id": current_user["id"]
    }

    if update.readiness_status == "Under Preparation":
        update_data["readiness_status"] = "Under Preparation"
        update_data["status"] = "Under Preparation"
        update_data["preparation_date"] = datetime.now(timezone.utc).isoformat()
        if update.expected_readiness_date:
            update_data["expected_readiness_date"] = update.expected_readiness_date
        if update.tentative_pickup_date:
            update_data["tentative_pickup_date"] = update.tentative_pickup_date
        activity_entry["action"] = "Sample marked as Under Preparation"
        activity_entry["details"] = f"Expected readiness: {update.expected_readiness_date or 'TBD'}"

    elif update.readiness_status == "Ready for Pickup":
        update_data["readiness_status"] = "Ready for Pickup"
        update_data["status"] = "Sample Ready for Dispatch"
        update_data["ready_for_pickup_date"] = datetime.now(timezone.utc).isoformat()
        update_data["pickup_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        if update.preparation_items:
            update_data["preparation_items"] = [item.model_dump() for item in update.preparation_items]
        if update.gate_pass_available is not None:
            update_data["gate_pass_available"] = update.gate_pass_available
        if update.gate_pass_document_url:
            update_data["gate_pass_document_url"] = update.gate_pass_document_url

        activity_entry["action"] = "Sample Ready for Dispatch"
        items_count = len(update.preparation_items or [])
        packing_summary = ", ".join(set(i.type_of_packing for i in (update.preparation_items or []))) or "N/A"
        activity_entry["details"] = f"{items_count} item(s) prepared, Packing: {packing_summary}, Gate pass: {'Yes' if update.gate_pass_available else 'No'}"

        await db.capex_requests.update_one(
            {"id": sample["capex_request_id"]},
            {"$set": {"status": "Sample Ready for Dispatch", "current_workflow_stage": "sample"}}
        )

    await db.sample_requests.update_one({"id": sample_id}, {"$set": update_data, "$push": {"activity_log": activity_entry}})

    # Enhanced notifications to buyer
    notify_title = f"Sample {update.readiness_status}"
    if update.readiness_status == "Under Preparation":
        date_str = update.expected_readiness_date or "TBD"
        notify_msg = f"Sample {sample_id} is now Under Preparation. Expected readiness date: {date_str}."
    else:
        gate_str = "Gate pass uploaded." if update.gate_pass_available else "No gate pass."
        notify_msg = f"Sample {sample_id} is Ready for Dispatch. {gate_str}"
    background_tasks.add_task(notify_users, [sample["created_by_id"]], notify_title, notify_msg, "sample_update", sample_id)

    updated = await db.sample_requests.find_one({"id": sample_id}, {"_id": 0})
    return updated


@router.put("/sample-requests/{sample_id}/pickup")
async def update_sample_pickup(sample_id: str, update: SamplePickupUpdate,
                               background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Only buyers can update pickup status")

    sample = await db.sample_requests.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample request not found")

    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    activity_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "by": current_user["name"],
        "by_id": current_user["id"]
    }

    if update.buyer_decision:
        update_data["buyer_decision"] = update.buyer_decision
        activity_entry["action"] = f"Buyer selected: {update.buyer_decision}"
        activity_entry["details"] = f"Document type: {update.buyer_decision}"

    if update.pickup_date:
        update_data["pickup_date"] = update.pickup_date
        update_data["status"] = "Picked Up"
        activity_entry["action"] = "Sample picked up"
        activity_entry["details"] = f"Pickup date: {update.pickup_date}"

    if update.dispatch_date:
        update_data["dispatch_date"] = update.dispatch_date
        update_data["status"] = "Dispatched"
        if update.dispatch_reference:
            update_data["dispatch_reference"] = update.dispatch_reference
        activity_entry["action"] = "Sample dispatched to vendor"
        activity_entry["details"] = f"Dispatch date: {update.dispatch_date}, Ref: {update.dispatch_reference or 'N/A'}"

        await db.capex_requests.update_one(
            {"id": sample["capex_request_id"]},
            {"$set": {"status": "Completed", "current_workflow_stage": "completed"}}
        )

    if update.delivery_date:
        update_data["delivery_date"] = update.delivery_date
        update_data["status"] = "Delivered"
        activity_entry["action"] = "Sample delivered"
        activity_entry["details"] = f"Delivery date: {update.delivery_date}"

    await db.sample_requests.update_one({"id": sample_id}, {"$set": update_data, "$push": {"activity_log": activity_entry}})

    capex = await db.capex_requests.find_one({"id": sample["capex_request_id"]}, {"_id": 0})
    if capex:
        background_tasks.add_task(notify_users, [capex["user_id"]], f"Sample {update_data.get('status', 'Updated')}",
            f"Sample {sample_id} has been {update_data.get('status', 'updated')}.", "sample_update", sample_id)

    updated = await db.sample_requests.find_one({"id": sample_id}, {"_id": 0})
    return updated


@router.get("/sample-requests/{sample_id}/activity-log")
async def get_sample_activity_log(sample_id: str, current_user: dict = Depends(get_current_user)):
    sample = await db.sample_requests.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample request not found")
    return {
        "sample_id": sample_id,
        "capex_request_id": sample["capex_request_id"],
        "status": sample["status"],
        "activity_log": sample.get("activity_log", [])
    }
