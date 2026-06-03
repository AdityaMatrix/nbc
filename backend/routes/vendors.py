from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from database import db
from config import UserRole
from models import VendorQuotation
from dependencies import get_current_user

router = APIRouter(prefix="/api")


@router.post("/vendor-quotations")
async def create_vendor_quotation(quotation: VendorQuotation, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.BUYER, UserRole.CAPEX_HEAD]:
        raise HTTPException(status_code=403, detail="Not authorized")

    quote_doc = {
        "id": str(uuid.uuid4()),
        "capex_request_id": quotation.capex_request_id,
        "vendor_name": quotation.vendor_name,
        "vendor_code": quotation.vendor_code,
        "quoted_price": quotation.quoted_price,
        "delivery_timeline": quotation.delivery_timeline,
        "notes": quotation.notes,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.vendor_quotations.insert_one(quote_doc)
    quote_doc.pop("_id", None)
    return quote_doc


@router.get("/vendor-quotations")
async def get_vendor_quotations(capex_request_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.USER:
        raise HTTPException(status_code=403, detail="Not authorized to view pricing")
    quotations = await db.vendor_quotations.find({"capex_request_id": capex_request_id}, {"_id": 0}).to_list(100)
    return quotations
