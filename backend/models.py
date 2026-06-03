from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str
    department: Optional[str] = None
    plant: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    plant: Optional[str] = None
    employee_code: Optional[str] = None
    mobile: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class RequirementItem(BaseModel):
    description: str
    quantity: int = 1
    pr_available: Optional[bool] = False
    pr_number: Optional[str] = None
    cea_number: Optional[str] = None
    cea_status: Optional[str] = None
    wbs_number: Optional[str] = None
    pr_status: Optional[str] = None
    po_available: Optional[bool] = None
    po_number: Optional[str] = None
    po_status: Optional[str] = None
    delivery_status: Optional[str] = None
    installation_status: Optional[str] = None
    cea_created_date: Optional[str] = None
    cea_approved_date: Optional[str] = None
    pr_created_date: Optional[str] = None
    pr_approved_date: Optional[str] = None
    po_created_date: Optional[str] = None
    po_approved_date: Optional[str] = None
    ordered_date: Optional[str] = None
    delivery_date: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    expected_installation_date: Optional[str] = None
    expected_commissioning_date: Optional[str] = None
    installation_date: Optional[str] = None
    commissioning_date: Optional[str] = None
    commissioning_status: Optional[str] = None

class AttachmentInfo(BaseModel):
    id: Optional[str] = None
    file_id: Optional[str] = None
    filename: str
    type: str
    size: int = 0
    uploaded_at: Optional[str] = None

    @property
    def attachment_id(self):
        return self.id or self.file_id

class CapexRequestCreate(BaseModel):
    plant: str
    department: str
    asset_category: Optional[str] = None
    requirement_items: List[RequirementItem]
    requirement_type: str
    cea_required: bool = False
    cea_type: Optional[str] = None
    existing_cea_number: Optional[str] = None
    pr_available: bool = False
    pr_number: Optional[str] = None
    dap_required: bool = False
    justification: Optional[str] = None
    attachments: Optional[List[AttachmentInfo]] = []

class CapexRequestUpdate(BaseModel):
    cea_number: Optional[str] = None
    cea_creation_date: Optional[str] = None
    cea_status: Optional[str] = None
    wbs_number: Optional[str] = None
    pr_available: Optional[bool] = None
    pr_processed: Optional[bool] = None
    pr_number: Optional[str] = None
    pr_approval_status: Optional[str] = None
    pr_approval_level: Optional[str] = None
    pr_created_date: Optional[str] = None
    pr_approved_date: Optional[str] = None
    po_available: Optional[bool] = None
    po_processed: Optional[bool] = None
    po_number: Optional[str] = None
    po_approval_status: Optional[str] = None
    po_approval_level: Optional[str] = None
    po_created_date: Optional[str] = None
    po_approved_date: Optional[str] = None
    ordered_date: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_code: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    expected_installation_date: Optional[str] = None
    expected_commissioning_date: Optional[str] = None
    installation_date: Optional[str] = None
    commissioning_date: Optional[str] = None
    commissioning_status: Optional[str] = None
    status: Optional[str] = None
    workflow_status: Optional[str] = None
    assigned_buyer_id: Optional[str] = None
    cea_created_date: Optional[str] = None
    cea_approved_date: Optional[str] = None
    delivery_status: Optional[str] = None
    delivery_date: Optional[str] = None
    pdi_status: Optional[str] = None
    pdi_date: Optional[str] = None
    pdi_remarks: Optional[str] = None
    dap_dates: Optional[List[str]] = None
    current_workflow_stage: Optional[str] = None
    initial_price: Optional[float] = None
    final_negotiated_price: Optional[float] = None
    suppliers: Optional[List[dict]] = None
    payment_terms: Optional[List[dict]] = None
    gst_applicable: Optional[bool] = None
    gst_percentage: Optional[float] = None
    requirement_items: Optional[List[dict]] = None
    buyer_attachments: Optional[List[dict]] = None
    invoices: Optional[List[dict]] = None
    installation_documents: Optional[List[dict]] = None
    commissioning_documents: Optional[List[dict]] = None
    # Project Timeline Tracker fields
    planned_start_date: Optional[str] = None
    planned_completion_date: Optional[str] = None
    actual_completion_date: Optional[str] = None
    manufacturing_start_date: Optional[str] = None
    manufacturing_end_date: Optional[str] = None
    dispatch_date: Optional[str] = None
    closure_date: Optional[str] = None
    priority_level: Optional[str] = None
    project_owner_id: Optional[str] = None
    project_name: Optional[str] = None

class SampleLineItem(BaseModel):
    material_description: str
    number_of_samples: int

class SampleRequestCreate(BaseModel):
    capex_request_id: str
    line_items: List[SampleLineItem]

class SamplePreparationItem(BaseModel):
    material_code: Optional[str] = ""
    description: Optional[str] = ""
    number_of_samples: int = 1
    type_of_packing: str = "Wooden"
    weight: Optional[float] = None

class SamplePreparationUpdate(BaseModel):
    readiness_status: str
    tentative_pickup_date: Optional[str] = None
    expected_readiness_date: Optional[str] = None
    preparation_items: Optional[List[SamplePreparationItem]] = None
    gate_pass_available: Optional[bool] = None
    gate_pass_document_url: Optional[str] = None

    @validator('readiness_status')
    def check_readiness_status(cls, v):
        if not v or v.strip() == "":
            raise ValueError("Readiness status is required")
        valid_statuses = ["Under Preparation", "Ready for Pickup"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v

class SamplePickupUpdate(BaseModel):
    pickup_date: Optional[str] = None
    dispatch_date: Optional[str] = None
    dispatch_reference: Optional[str] = None
    delivery_date: Optional[str] = None
    buyer_decision: Optional[str] = None

class DAPCreate(BaseModel):
    capex_request_id: str
    documents: List[str] = []

class DAPApprovalUpdate(BaseModel):
    action: str
    comment: Optional[str] = None
    change_type: Optional[str] = None

class DAPRevisionUpload(BaseModel):
    documents: List[str]

class CommentCreate(BaseModel):
    capex_request_id: str
    content: str

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: str
    reference_id: Optional[str] = None

class VendorQuotation(BaseModel):
    capex_request_id: str
    vendor_name: str
    vendor_code: Optional[str] = None
    quoted_price: float
    delivery_timeline: Optional[str] = None
    notes: Optional[str] = None

class AIInsightRequest(BaseModel):
    query: str
    context: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserSettings(BaseModel):
    font_size: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    plant: Optional[str] = None

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    request_id: Optional[str] = None

class AIChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

    @validator('message')
    def message_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()

class AIChatResponse(BaseModel):
    response: str
    session_id: str
