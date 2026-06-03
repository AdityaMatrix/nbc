from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import logging

from database import db
from config import UserRole
from dependencies import get_current_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user: dict = Depends(get_current_user)):
    base_query = {}
    if current_user["role"] == UserRole.BUYER:
        base_query = {"$or": [{"assigned_buyer_id": current_user["id"]}, {"status": {"$nin": ["Pending Approval", "Rejected"]}}]}
    elif current_user["role"] == UserRole.DEPARTMENT_HEAD:
        base_query = {"department": current_user.get("department")}
    elif current_user["role"] == UserRole.USER:
        base_query = {"user_id": current_user["id"]}

    total_requests = await db.capex_requests.count_documents(base_query)

    status_pipeline = [{"$match": base_query}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_counts = await db.capex_requests.aggregate(status_pipeline).to_list(50)
    status_dict = {s["_id"]: s["count"] for s in status_counts}

    if current_user["role"] == UserRole.USER:
        user_request_ids = await db.capex_requests.find({"user_id": current_user["id"]}, {"id": 1, "_id": 0}).to_list(1000)
        req_ids = [r["id"] for r in user_request_ids]
        sample_count = await db.sample_requests.count_documents({"capex_request_id": {"$in": req_ids}})

        sample_status_pipeline = [
            {"$match": {"capex_request_id": {"$in": req_ids}}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        sample_status_counts = await db.sample_requests.aggregate(sample_status_pipeline).to_list(50)

        in_process_statuses = ["Approved", "CEA Processing", "PR Processing", "PO Processing",
                              "DAP Approval Pending", "Sample Requested", "PDI", "Under Dispatch",
                              "Delivery", "Installation in Progress", "Submitted"]
        in_process = sum(status_dict.get(s, 0) for s in in_process_statuses)

        return {
            "total_requests": total_requests,
            "pending_approval": status_dict.get("Pending Approval", 0) + status_dict.get("Submitted", 0),
            "approved": status_dict.get("Approved", 0),
            "in_process": in_process,
            "completed": status_dict.get("Completed", 0),
            "rejected": status_dict.get("Rejected", 0),
            "status_breakdown": status_dict,
            "sample_requests_count": sample_count,
            "sample_status_breakdown": {s["_id"]: s["count"] for s in sample_status_counts}
        }

    dept_pipeline = [{"$match": base_query}, {"$group": {"_id": "$department", "count": {"$sum": 1}}}]
    dept_counts = await db.capex_requests.aggregate(dept_pipeline).to_list(50)

    dept_investment_pipeline = [
        {"$match": {**base_query, "final_negotiated_price": {"$ne": None}}},
        {"$group": {"_id": "$department", "total_value": {"$sum": "$final_negotiated_price"}}}
    ]
    dept_investments = await db.capex_requests.aggregate(dept_investment_pipeline).to_list(50)

    plant_pipeline = [{"$match": base_query}, {"$group": {"_id": "$plant", "count": {"$sum": 1}}}]
    plant_counts = await db.capex_requests.aggregate(plant_pipeline).to_list(50)

    financial_query = base_query
    if current_user["role"] == UserRole.BUYER:
        financial_query = {"assigned_buyer_id": current_user["id"]}

    requests_with_suppliers = await db.capex_requests.find(
        {**financial_query, "suppliers": {"$exists": True, "$ne": []}},
        {"_id": 0, "suppliers": 1, "assigned_buyer_id": 1}
    ).to_list(1000)

    total_initial_from_suppliers = 0
    total_final_from_suppliers = 0
    buyer_savings = {}

    for req in requests_with_suppliers:
        suppliers = req.get("suppliers", [])
        buyer_id = req.get("assigned_buyer_id")

        selected_supplier = next(
            (s for s in suppliers if s.get("is_ordered")),
            next((s for s in suppliers if s.get("selected")), suppliers[0] if suppliers else None)
        )
        if selected_supplier:
            initial = selected_supplier.get("initial_price", 0) or 0
            final = selected_supplier.get("final_price", 0) or 0
            total_initial_from_suppliers += initial
            total_final_from_suppliers += final

            if buyer_id:
                if buyer_id not in buyer_savings:
                    buyer_savings[buyer_id] = {"initial": 0, "final": 0}
                buyer_savings[buyer_id]["initial"] += initial
                buyer_savings[buyer_id]["final"] += final

    total_cost_savings = total_initial_from_suppliers - total_final_from_suppliers

    my_savings = 0
    if current_user["role"] == UserRole.BUYER and current_user["id"] in buyer_savings:
        bs = buyer_savings[current_user["id"]]
        my_savings = bs["initial"] - bs["final"]

    vendor_pipeline = [
        {"$match": {**base_query, "vendor_name": {"$ne": None}, "final_negotiated_price": {"$ne": None}}},
        {"$group": {"_id": "$vendor_name", "total": {"$sum": "$final_negotiated_price"}}}
    ]
    vendor_spend = await db.capex_requests.aggregate(vendor_pipeline).to_list(50)

    plant_spend_pipeline = [
        {"$match": {**base_query, "plant": {"$ne": None}, "final_negotiated_price": {"$ne": None}}},
        {"$group": {"_id": "$plant", "total_spend": {"$sum": "$final_negotiated_price"}, "count": {"$sum": 1}}}
    ]
    plant_spend = await db.capex_requests.aggregate(plant_spend_pipeline).to_list(50)

    monthly_pipeline = [
        {"$match": financial_query},
        {"$addFields": {
            "month": {"$substr": ["$created_at", 0, 7]},
            "_selected_supplier": {
                "$let": {
                    "vars": {
                        "ordered": {
                            "$filter": {
                                "input": {"$ifNull": ["$suppliers", []]},
                                "as": "s",
                                "cond": {"$eq": ["$$s.is_ordered", True]}
                            }
                        },
                        "sel": {
                            "$filter": {
                                "input": {"$ifNull": ["$suppliers", []]},
                                "as": "s",
                                "cond": {"$eq": ["$$s.selected", True]}
                            }
                        },
                        "all": {"$ifNull": ["$suppliers", []]}
                    },
                    "in": {
                        "$cond": [
                            {"$gt": [{"$size": "$$ordered"}, 0]},
                            {"$arrayElemAt": ["$$ordered", 0]},
                            {"$cond": [
                                {"$gt": [{"$size": "$$sel"}, 0]},
                                {"$arrayElemAt": ["$$sel", 0]},
                                {"$arrayElemAt": ["$$all", 0]}
                            ]}
                        ]
                    }
                }
            }
        }},
        {"$group": {
            "_id": "$month",
            "count": {"$sum": 1},
            "purchase_value": {"$sum": {"$ifNull": ["$_selected_supplier.final_price", 0]}},
            "initial_value": {"$sum": {"$ifNull": ["$_selected_supplier.initial_price", 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    monthly_trend = await db.capex_requests.aggregate(monthly_pipeline).to_list(24)

    return {
        "total_requests": total_requests,
        "pending_approval": status_dict.get("Pending Approval", 0),
        "approved": status_dict.get("Approved", 0),
        "pr_processed": status_dict.get("PR Processing", 0) + status_dict.get("PO Processing", 0),
        "po_processed": status_dict.get("PO Processing", 0),
        "under_commissioning": status_dict.get("Under Commissioning", 0),
        "completed": status_dict.get("Completed", 0),
        "rejected": status_dict.get("Rejected", 0),
        "total_purchase_value": total_final_from_suppliers,
        "total_initial_value": total_initial_from_suppliers,
        "cost_savings": max(0, total_cost_savings),
        "my_cost_savings": max(0, my_savings),
        "cost_avoidance": max(0, total_cost_savings),
        "status_breakdown": status_dict,
        "department_breakdown": [{d["_id"]: d["count"]} for d in dept_counts if d["_id"]],
        "department_investment": [{d["_id"]: d["total_value"]} for d in dept_investments if d["_id"]],
        "plant_breakdown": [{p["_id"]: p["count"]} for p in plant_counts if p["_id"]],
        "vendor_spend": [{v["_id"]: v["total"]} for v in vendor_spend if v["_id"]],
        "plant_spend": [{"plant": p["_id"], "spend": p["total_spend"], "count": p["count"]} for p in plant_spend if p["_id"]],
        "monthly_trend": [{"month": m["_id"], "count": m["count"], "purchase": m.get("purchase_value", 0), "savings": max(0, (m.get("initial_value", 0) or 0) - (m.get("purchase_value", 0) or 0))} for m in monthly_trend]
    }


@router.get("/analytics/buyer/{buyer_id}")
async def get_buyer_analytics(buyer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.CAPEX_HEAD:
        raise HTTPException(status_code=403, detail="Only Capex Head can view buyer analytics")

    query = {"assigned_buyer_id": buyer_id}
    total = await db.capex_requests.count_documents(query)

    status_pipeline = [{"$match": query}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_counts = await db.capex_requests.aggregate(status_pipeline).to_list(50)

    financial_pipeline = [
        {"$match": {**query, "final_negotiated_price": {"$ne": None}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$final_negotiated_price"}, "initial_value": {"$sum": "$initial_price"}}}
    ]
    financial = await db.capex_requests.aggregate(financial_pipeline).to_list(1)
    fin_data = financial[0] if financial else {"total_value": 0, "initial_value": 0}

    return {
        "buyer_id": buyer_id,
        "total_requests": total,
        "status_breakdown": {s["_id"]: s["count"] for s in status_counts},
        "total_spend": fin_data.get("total_value", 0) or 0,
        "savings": max(0, (fin_data.get("initial_value", 0) or 0) - (fin_data.get("total_value", 0) or 0))
    }
