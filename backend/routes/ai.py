from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid
import os
import logging

from database import db
from config import UserRole
from models import AIInsightRequest, AIChatMessage, AIChatResponse
from dependencies import get_current_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@router.post("/ai/insights")
async def get_ai_insights(request: AIInsightRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.USER:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from routes.analytics import get_dashboard_analytics

        analytics = await get_dashboard_analytics(current_user)

        context = f"""
        You are an AI assistant for a Capex (Capital Expenditure) Portal.
        Current analytics data:
        - Total Requests: {analytics['total_requests']}
        - Pending Approval: {analytics['pending_approval']}
        - Completed: {analytics['completed']}
        - Total Purchase Value: {analytics.get('total_purchase_value', 0):,.2f}
        - Cost Avoidance/Savings: {analytics.get('cost_avoidance', 0):,.2f}

        User's role: {current_user['role']}
        {request.context or ''}
        """

        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"capex-insights-{current_user['id']}",
            system_message=context
        ).with_model("openai", "gpt-5")

        message = UserMessage(text=request.query)
        response = await chat.send_message(message)

        return {"insight": response, "query": request.query}
    except Exception as e:
        logger.error(f"AI insight error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insight: {str(e)}")


async def get_role_based_context(user: dict) -> str:
    role = user["role"]
    user_id = user["id"]
    context_data = []

    query = {}
    if role == UserRole.USER:
        query["user_id"] = user_id
    elif role == UserRole.DEPARTMENT_HEAD:
        query["department"] = user.get("department")
    elif role == UserRole.BUYER:
        query["$or"] = [
            {"status": {"$nin": ["Pending Approval", "Pending DH Approval", "Rejected", "Rejected by DH"]}},
            {"assigned_buyer_id": user_id}
        ]

    requests = await db.capex_requests.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)

    if requests:
        context_data.append(f"Total accessible requests: {len(requests)}")

        status_counts = {}
        for req in requests:
            status = req.get("status", "Unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        context_data.append(f"Status breakdown: {status_counts}")

        recent = requests[:10]
        recent_summary = []
        for req in recent:
            summary = {
                "id": req.get("id"),
                "plant": req.get("plant"),
                "department": req.get("department"),
                "status": req.get("status"),
                "workflow_status": req.get("workflow_status"),
                "created_at": req.get("created_at", "")[:10] if req.get("created_at") else "N/A",
                "requirement_type": req.get("requirement_type"),
                "cea_required": req.get("cea_required"),
                "cea_number": req.get("cea_number"),
                "pr_number": req.get("pr_number"),
                "po_number": req.get("po_number"),
            }
            if role != UserRole.USER:
                summary["vendor_name"] = req.get("vendor_name")
                if req.get("suppliers"):
                    summary["suppliers_count"] = len(req.get("suppliers", []))
            recent_summary.append(summary)
        context_data.append(f"Recent requests: {recent_summary}")

        workflow_counts = {}
        for req in requests:
            ws = req.get("workflow_status", "Not Set")
            workflow_counts[ws] = workflow_counts.get(ws, 0) + 1
        context_data.append(f"Workflow status breakdown: {workflow_counts}")

    if role in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        total_purchase = sum(
            sum(s.get("final_price", 0) or 0 for s in req.get("suppliers", []) if s.get("is_ordered"))
            for req in requests
        )
        context_data.append(f"Total purchase value (visible requests): {total_purchase:,.2f}")

        pending_approval = len([r for r in requests if r.get("status") == "Pending Approval"])
        pending_dh = len([r for r in requests if r.get("status") == "Pending DH Approval"])
        context_data.append(f"Pending approvals: {pending_approval}, Pending DH approvals: {pending_dh}")

    sample_query = {}
    if role in [UserRole.USER, UserRole.DEPARTMENT_HEAD, UserRole.PROCESS_ENGINEERING]:
        user_req_ids = [r["id"] for r in requests]
        sample_query["capex_request_id"] = {"$in": user_req_ids}

    samples = await db.sample_requests.find(sample_query, {"_id": 0}).limit(50).to_list(50)
    if samples:
        sample_statuses = {}
        for s in samples:
            st = s.get("status", "Unknown")
            sample_statuses[st] = sample_statuses.get(st, 0) + 1
        context_data.append(f"Sample requests: {len(samples)} total, status: {sample_statuses}")

    return "\n".join(context_data)


@router.post("/ai/chat", response_model=AIChatResponse)
async def ai_chat(request: AIChatMessage, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        session_id = request.session_id or f"chat-{current_user['id']}-{str(uuid.uuid4())[:8]}"

        role_context = await get_role_based_context(current_user)

        role_descriptions = {
            UserRole.USER: "a User who submits capex requests and can only see their own requests",
            UserRole.DEPARTMENT_HEAD: "a Department Head who approves requests for their department",
            UserRole.BUYER: "a Buyer who processes approved requests, manages vendors, and handles procurement",
            UserRole.CAPEX_HEAD: "the Capex Head with full visibility of all requests and analytics",
            UserRole.PROCESS_ENGINEERING: "a Process Engineering team member who can submit requests"
        }

        role_desc = role_descriptions.get(current_user["role"], "a portal user")

        system_message = f"""You are an AI assistant for the Capex (Capital Expenditure) Portal. You help users navigate the system, answer questions about their requests, and provide guidance.

IMPORTANT: You are talking to {current_user['name']} who is {role_desc}.
- Department: {current_user.get('department', 'Not specified')}
- Plant: {current_user.get('plant', 'Not specified')}

ROLE-BASED ACCESS RULES:
- Users can only see and ask about their own requests
- Department Heads can see requests from their department
- Buyers can see all approved requests and those assigned to them
- Capex Head has full visibility

CURRENT DATA CONTEXT (filtered for user's role):
{role_context}

GUIDELINES:
1. Only provide information about requests the user is authorized to see
2. Be helpful and concise in your responses
3. If asked about data you don't have access to, politely explain the limitation
4. Help users understand the Capex workflow: Request -> DH Approval -> Buyer Processing -> CEA -> PR -> PO -> Delivery -> Installation -> Commissioning
5. For status questions, refer to the workflow_status field which automatically updates based on progress
6. Use Indian Rupee format for any financial figures
7. Keep responses professional and focused on Capex portal functionality"""

        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5")

        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)

        chat_log = {
            "session_id": session_id,
            "user_id": current_user["id"],
            "user_role": current_user["role"],
            "message": request.message,
            "response": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_chat_logs.insert_one(chat_log)

        return AIChatResponse(response=response, session_id=session_id)

    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")


@router.get("/ai/chat/history")
async def get_chat_history(session_id: str = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if session_id:
        query["session_id"] = session_id

    history = await db.ai_chat_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(50).to_list(50)
    return history


@router.delete("/ai/chat/history")
async def clear_chat_history(session_id: str = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if session_id:
        query["session_id"] = session_id

    result = await db.ai_chat_logs.delete_many(query)
    return {"message": f"Cleared {result.deleted_count} chat messages"}
