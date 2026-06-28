from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import db
from dependencies import get_current_user

router = APIRouter(prefix="/api")


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Complete Module-Based Default Config ──
DEFAULT_CONFIG = {
    "id": "access_config",
    "modules": [
        {
            "id": "dashboard",
            "name": "Dashboard",
            "description": "Main dashboard with KPIs, analytics, tasks, and request table",
            "icon": "LayoutDashboard",
            "enabled": True,
            "items": [
                {"id": "card_budget_utilized", "name": "Total Budget Utilized", "desc": "Total purchase value of all processed requests",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head"],
                 "user_overrides": []},
                {"id": "card_pending_approvals", "name": "Pending Approvals", "desc": "Count of requests awaiting approval actions",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "department_head", "user", "process_engineering"],
                 "user_overrides": []},
                {"id": "card_cost_savings", "name": "Cost Savings", "desc": "Savings achieved through supplier negotiations",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer"],
                 "user_overrides": []},
                {"id": "card_completion_rate", "name": "Completion Rate", "desc": "Percentage of requests completed",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head"],
                 "user_overrides": []},
                {"id": "card_dept_requests", "name": "Department Requests", "desc": "Total requests in your department",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "department_head", "user", "process_engineering"],
                 "user_overrides": []},
                {"id": "card_my_requests", "name": "My Requests", "desc": "Requests submitted by the current user",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "user", "process_engineering"],
                 "user_overrides": []},
                {"id": "card_completed", "name": "Completed Requests", "desc": "Count of successfully completed requests",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "department_head", "buyer", "user", "process_engineering"],
                 "user_overrides": []},
                {"id": "card_in_progress", "name": "In Progress", "desc": "Requests currently being processed",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "department_head", "buyer"],
                 "user_overrides": []},
                {"id": "card_my_assigned", "name": "My Assigned Requests", "desc": "Requests assigned to the buyer",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "buyer"],
                 "user_overrides": []},
                {"id": "card_purchase_value", "name": "Total Purchase Value", "desc": "Total value of buyer purchases",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "buyer"],
                 "user_overrides": []},
                {"id": "dept_spend_chart", "name": "Department Spend Analysis", "desc": "Bar chart showing spend by department",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "department_head"],
                 "user_overrides": []},
                {"id": "buyer_performance_chart", "name": "Buyer Performance Chart", "desc": "Chart showing buyer workload and completion rates",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head"],
                 "user_overrides": []},
                {"id": "pending_tasks", "name": "Pending Tasks", "desc": "Action items requiring user attention",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "recent_requests", "name": "Requests Table", "desc": "Sortable list of all CAPEX requests",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "cost_savings_widget", "name": "Cost Savings Summary", "desc": "Quick savings overview card",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer"],
                 "user_overrides": []},
            ]
        },
        {
            "id": "capex_request",
            "name": "Capex Request View",
            "description": "Detailed request page with all sections for viewing and editing",
            "icon": "FileText",
            "enabled": True,
            "items": [
                {"id": "basic_info", "name": "Basic Information", "desc": "Request details, item name, specifications, dates, status",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "supplier_details", "name": "Supplier & Price Details", "desc": "Supplier name, initial/final prices, quotation data",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head"],
                 "user_overrides": []},
                {"id": "buyer_module", "name": "Buyer Module", "desc": "Quotation management, supplier comparison, Purchase Order generation",
                 "enabled": True, "permission": "editable",
                 "roles": ["admin", "capex_head", "buyer"],
                 "user_overrides": []},
                {"id": "capex_head_module", "name": "Capex Head Module", "desc": "Approval/rejection actions, buyer assignment, final authorization",
                 "enabled": True, "permission": "editable",
                 "roles": ["admin", "capex_head"],
                 "user_overrides": []},
                {"id": "dh_approval", "name": "DH Approval Section", "desc": "Department Head approval/rejection with remarks",
                 "enabled": True, "permission": "editable",
                 "roles": ["admin", "capex_head", "department_head"],
                 "user_overrides": []},
                {"id": "approval_flow", "name": "Approval Flow Timeline", "desc": "Visual timeline of all approvals and status changes",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "sample_section", "name": "Sample Requests", "desc": "Sample creation, dispatch tracking, delivery confirmation",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "comments", "name": "Comments & Discussion", "desc": "Thread of comments and notes on the request",
                 "enabled": True, "permission": "editable",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "attachments", "name": "File Attachments", "desc": "Upload and download documents, drawings, photos",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "assigned_buyer", "name": "Assigned Buyer Info", "desc": "Details of the buyer assigned to the request",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head"],
                 "user_overrides": []},
            ]
        },
        {
            "id": "analytics",
            "name": "Analytics & Reports",
            "description": "Charts, reports, and data analytics across the portal",
            "icon": "BarChart3",
            "enabled": True,
            "items": [
                {"id": "cost_savings_report", "name": "Cost Savings Report", "desc": "Detailed savings achieved through supplier negotiations",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer"],
                 "user_overrides": []},
                {"id": "purchase_trends", "name": "Purchase Trends", "desc": "Monthly/quarterly purchase volume and value analysis",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head"],
                 "user_overrides": []},
                {"id": "vendor_performance", "name": "Vendor Performance", "desc": "Supplier delivery, quality ratings, and comparison",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer"],
                 "user_overrides": []},
                {"id": "department_spend", "name": "Department Spend Analysis", "desc": "Budget vs actual spend broken down by department",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "department_head"],
                 "user_overrides": []},
                {"id": "status_breakdown", "name": "Status Breakdown", "desc": "Pie chart showing distribution of request statuses",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head", "buyer", "department_head", "process_engineering", "user"],
                 "user_overrides": []},
                {"id": "buyer_performance", "name": "Buyer Performance", "desc": "Buyer workload, response times, and completion rates",
                 "enabled": True, "permission": "view",
                 "roles": ["admin", "capex_head"],
                 "user_overrides": []},
            ]
        }
    ],
    "updated_at": None,
    "updated_by": None,
}


async def get_or_create_config():
    config = await db.access_config.find_one({"id": "access_config"}, {"_id": 0})
    if not config or "modules" not in config:
        # Replace old format or create new
        config = {**DEFAULT_CONFIG, "updated_at": datetime.now(timezone.utc).isoformat()}
        await db.access_config.replace_one({"id": "access_config"}, config, upsert=True)
        config.pop("_id", None)
    return config


@router.get("/admin/access-config")
async def get_access_config(current_user: dict = Depends(require_admin)):
    return await get_or_create_config()


class ItemUpdate(BaseModel):
    id: str
    enabled: bool
    permission: str
    roles: List[str]
    user_overrides: Optional[List[dict]] = []

class ModuleUpdate(BaseModel):
    id: str
    enabled: bool
    items: List[ItemUpdate]

class AccessConfigUpdate(BaseModel):
    modules: List[ModuleUpdate]


@router.put("/admin/access-config")
async def update_access_config(data: AccessConfigUpdate, current_user: dict = Depends(require_admin)):
    config = await get_or_create_config()
    existing_modules = {m["id"]: m for m in config.get("modules", [])}

    for mod_update in data.modules:
        if mod_update.id in existing_modules:
            existing_mod = existing_modules[mod_update.id]
            existing_mod["enabled"] = mod_update.enabled
            item_map = {it["id"]: it for it in existing_mod.get("items", [])}
            for item_up in mod_update.items:
                d = item_up.dict()
                if item_up.id in item_map:
                    item_map[item_up.id].update(d)
                else:
                    item_map[item_up.id] = {**d, "name": d["id"], "desc": ""}
            existing_mod["items"] = list(item_map.values())

    update_fields = {
        "modules": list(existing_modules.values()),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.get("name", "Admin"),
    }
    await db.access_config.update_one({"id": "access_config"}, {"$set": update_fields})
    return await db.access_config.find_one({"id": "access_config"}, {"_id": 0})


@router.get("/access/permissions")
async def get_my_permissions(current_user: dict = Depends(get_current_user)):
    config = await get_or_create_config()
    user_role = current_user.get("role", "user")
    user_id = current_user.get("id", "")

    result = {}
    for module in config.get("modules", []):
        mod_id = module["id"]
        result[mod_id] = {}

        # Admin gets full editable on everything
        if user_role == "admin":
            for item in module.get("items", []):
                result[mod_id][item["id"]] = "editable"
            continue

        # Module disabled → everything hidden
        if not module.get("enabled", True):
            for item in module.get("items", []):
                result[mod_id][item["id"]] = "hidden"
            continue

        for item in module.get("items", []):
            # Item disabled → hidden
            if not item.get("enabled", True):
                result[mod_id][item["id"]] = "hidden"
                continue

            # User override (highest priority)
            override = next((o for o in item.get("user_overrides", []) if o.get("user_id") == user_id), None)
            if override:
                result[mod_id][item["id"]] = override.get("permission", "hidden")
                continue

            # Role-based
            if user_role in item.get("roles", []):
                result[mod_id][item["id"]] = item.get("permission", "view")
            else:
                result[mod_id][item["id"]] = "hidden"

    return result


@router.get("/admin/access-config/preview/{role_id}")
async def preview_role_permissions(role_id: str, current_user: dict = Depends(require_admin)):
    """Compute permissions as if the caller had the specified role (admin-only preview)."""
    config = await get_or_create_config()
    result = {}
    for module in config.get("modules", []):
        mod_id = module["id"]
        result[mod_id] = {}
        if not module.get("enabled", True):
            for item in module.get("items", []):
                result[mod_id][item["id"]] = "hidden"
            continue
        for item in module.get("items", []):
            if not item.get("enabled", True):
                result[mod_id][item["id"]] = "hidden"
                continue
            if role_id in item.get("roles", []):
                result[mod_id][item["id"]] = item.get("permission", "view")
            else:
                result[mod_id][item["id"]] = "hidden"
    return result


@router.post("/admin/access-config/reset")
async def reset_access_config(current_user: dict = Depends(require_admin)):
    reset = {**DEFAULT_CONFIG, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": current_user.get("name", "Admin")}
    await db.access_config.replace_one({"id": "access_config"}, reset, upsert=True)
    return {"message": "Access configuration reset to defaults"}
