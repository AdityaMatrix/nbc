"""
Comprehensive seed script to populate Capex Portal with realistic FY 2025-26 data.
This creates:
- Multiple capex requests across different plants and departments
- Supplier quotations with pricing
- Invoices
- Complete workflow stages from CEA to Commissioning
"""

import asyncio
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Reference data
PLANTS = ["Bagru", "Jaipur", "Newai", "Savli"]
DEPARTMENTS = [
    "Railway Bearing", "Industrial Bearing", "Ball Bearing", "Taper Roller Bearing",
    "Large Dia Bearing", "Water Pump Bearing", "Finish Goods", "Stores",
    "Digital", "Quality", "IT", "HR"
]

SUPPLIERS = [
    {"name": "Tata Industrial", "code": "TATA-001"},
    {"name": "Mahindra Engineering", "code": "MAH-002"},
    {"name": "Bosch India", "code": "BOSCH-003"},
    {"name": "Siemens Ltd", "code": "SIE-004"},
    {"name": "ABB India", "code": "ABB-005"},
    {"name": "L&T Heavy", "code": "LT-006"},
    {"name": "Kirloskar Brothers", "code": "KIR-007"},
    {"name": "Thermax Ltd", "code": "THX-008"},
]

EQUIPMENT_TYPES = [
    "CNC Lathe Machine", "Vertical Machining Center", "Grinding Machine",
    "Heat Treatment Furnace", "Quality Testing Equipment", "Hydraulic Press",
    "Assembly Line Conveyor", "Packaging Machine", "Air Compressor",
    "Industrial Robot Arm", "3D Printer", "Laser Cutting Machine"
]

# Users mapping (from seed users)
USERS = {
    "user": "amit@capex.com",
    "buyer": "vijay@capex.com",
    "capex_head": "manoj@capex.com",
    "department_head": "rajesh@capex.com"
}

async def get_user_id(email):
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})
    return user["id"] if user else None

async def create_comprehensive_requests():
    """Create realistic capex requests for FY 2025-26"""
    
    user_id = await get_user_id(USERS["user"])
    buyer_id = await get_user_id(USERS["buyer"])
    
    if not user_id or not buyer_id:
        print("Error: Required users not found. Run seed-users first.")
        return
    
    # Get current request count for serial numbers
    current_count = await db.capex_requests.count_documents({})
    
    requests_data = []
    
    # FY 2025-26: April 2025 to March 2026
    fy_start = datetime(2025, 4, 1)
    
    # Create 15 comprehensive requests with varying stages
    scenarios = [
        # Completed requests (full workflow)
        {"status": "Completed", "workflow_status": "Completed", "months_ago": 8, "complete": True},
        {"status": "Completed", "workflow_status": "Completed", "months_ago": 7, "complete": True},
        {"status": "Completed", "workflow_status": "Completed", "months_ago": 6, "complete": True},
        # Installation in progress
        {"status": "Installation", "workflow_status": "Installation in Progress", "months_ago": 3, "stage": "installation"},
        {"status": "Installation", "workflow_status": "Installation in Progress", "months_ago": 2, "stage": "installation"},
        # Delivered - awaiting installation
        {"status": "Delivered", "workflow_status": "Delivered", "months_ago": 2, "stage": "delivered"},
        # In transit
        {"status": "Dispatched", "workflow_status": "Dispatched", "months_ago": 1, "stage": "dispatched"},
        # PO Approved - awaiting dispatch
        {"status": "PO Approved", "workflow_status": "PO Approved", "months_ago": 1, "stage": "po_approved"},
        {"status": "PO Approved", "workflow_status": "Order Placed", "months_ago": 1, "stage": "ordered"},
        # PR Processing
        {"status": "PR Processing", "workflow_status": "PR Under Approval", "months_ago": 0, "stage": "pr_processing"},
        # CEA Processing
        {"status": "CEA Processing", "workflow_status": "CEA Processing", "months_ago": 0, "stage": "cea_processing"},
        # Newly submitted
        {"status": "Submitted", "workflow_status": None, "months_ago": 0, "stage": "submitted"},
        {"status": "Submitted", "workflow_status": None, "months_ago": 0, "stage": "submitted"},
        # Pending DH Approval
        {"status": "Pending DH Approval", "workflow_status": None, "months_ago": 0, "stage": "pending_dh"},
    ]
    
    for idx, scenario in enumerate(scenarios):
        serial = current_count + idx + 1
        plant = random.choice(PLANTS)
        dept = random.choice(DEPARTMENTS)
        plant_code = plant[:3].upper()
        dept_code = "".join([w[0].upper() for w in dept.split()])
        request_id = f"{plant_code}-{dept_code}-{str(serial).zfill(3)}"
        
        # Calculate dates based on scenario
        base_date = datetime.now() - timedelta(days=scenario["months_ago"] * 30)
        created_at = base_date - timedelta(days=random.randint(5, 30))
        
        equipment = random.choice(EQUIPMENT_TYPES)
        quantity = random.randint(1, 3)
        
        # Build requirement items
        requirement_items = [{
            "description": f"{equipment} - {random.choice(['Standard', 'Heavy Duty', 'Precision'])} Model",
            "quantity": quantity,
            "pr_available": False,
            "pr_number": None,
            "cea_number": None,
            "cea_status": None,
            "pr_status": None,
            "po_status": None,
        }]
        
        # Base request
        request = {
            "id": request_id,
            "user_id": user_id,
            "user_name": "Amit Singh",
            "user_email": "amit@capex.com",
            "plant": plant,
            "department": dept,
            "asset_category": random.choice(["plant_machinery", "building"]),
            "requirement_items": requirement_items,
            "requirement_description": requirement_items[0]["description"],
            "requirement_type": random.choice(["New", "Replacement", "Retrofitment", "Expansion"]),
            "cea_required": True,
            "cea_type": "new",
            "cea_number": None,
            "wbs_number": None,
            "cea_status": None,
            "pr_available": False,
            "pr_number": None,
            "pr_approval_status": None,
            "dap_required": random.choice([True, False]),
            "justification": f"Required for {dept} operations to improve productivity and quality standards.",
            "status": scenario["status"],
            "workflow_status": scenario["workflow_status"],
            "current_workflow_stage": "request",
            "created_at": created_at.isoformat(),
            "updated_at": base_date.isoformat(),
            "time_log": [{
                "timestamp": created_at.isoformat(),
                "action": "Request Submitted",
                "by": "Amit Singh",
                "by_id": user_id
            }],
            "attachments": [],
            "cea_creation_date": None,
            "pr_processed": False,
            "pr_approval_level": None,
            "po_available": False,
            "po_processed": False,
            "po_number": None,
            "po_approval_status": None,
            "po_approval_level": None,
            "expected_delivery_date": None,
            "installation_date": None,
            "commissioning_date": None,
            "commissioning_status": None,
            "assigned_buyer_id": buyer_id if scenario["status"] not in ["Pending DH Approval"] else None,
            "assigned_buyer_name": "Vijay Sharma" if scenario["status"] not in ["Pending DH Approval"] else None,
            "dap_id": None,
            "dh_approval_status": "Approved" if scenario["status"] not in ["Pending DH Approval", "Rejected by DH"] else "Pending",
            "dh_approved_by": None,
            "dh_approved_at": None,
            "dh_rejection_reason": None,
            "pdi_status": None,
            "pdi_date": None,
            "pdi_remarks": None,
            "delivery_status": None,
            "delivery_date": None,
            "suppliers": [],
            "payment_terms": [],
            "gst_applicable": True,
            "gst_percentage": 18.0,
            "invoices": [],
        }
        
        # Add workflow-specific data based on stage
        stage = scenario.get("stage", "")
        
        if scenario.get("complete") or stage in ["installation", "delivered", "dispatched", "ordered", "po_approved"]:
            # CEA completed
            cea_num = f"CEA-{plant_code}-{serial:04d}"
            cea_created = created_at + timedelta(days=5)
            cea_approved = cea_created + timedelta(days=15)
            request["cea_number"] = cea_num
            request["cea_status"] = "Approved"
            request["cea_creation_date"] = cea_created.strftime("%Y-%m-%d")
            request["cea_approved_date"] = cea_approved.strftime("%Y-%m-%d")
            request["wbs_number"] = f"WBS-{serial:06d}"
            request["requirement_items"][0]["cea_number"] = cea_num
            request["requirement_items"][0]["cea_status"] = "Approved"
            request["requirement_items"][0]["cea_created_date"] = cea_created.strftime("%Y-%m-%d")
            request["requirement_items"][0]["cea_approved_date"] = cea_approved.strftime("%Y-%m-%d")
            
            # PR completed
            pr_num = f"PR-{serial:06d}"
            pr_created = cea_approved + timedelta(days=3)
            pr_approved = pr_created + timedelta(days=7)
            request["pr_number"] = pr_num
            request["pr_available"] = True
            request["pr_approval_status"] = "Approved"
            request["pr_created_date"] = pr_created.strftime("%Y-%m-%d")
            request["pr_approved_date"] = pr_approved.strftime("%Y-%m-%d")
            request["requirement_items"][0]["pr_number"] = pr_num
            request["requirement_items"][0]["pr_status"] = "Approved"
            request["requirement_items"][0]["pr_created_date"] = pr_created.strftime("%Y-%m-%d")
            request["requirement_items"][0]["pr_approved_date"] = pr_approved.strftime("%Y-%m-%d")
            
            # Add suppliers with quotations
            num_suppliers = random.randint(2, 4)
            base_price = random.randint(500000, 5000000)
            suppliers = []
            for s_idx in range(num_suppliers):
                supplier = random.choice(SUPPLIERS)
                initial_price = base_price + random.randint(-100000, 200000)
                final_price = initial_price - random.randint(10000, 50000)  # Negotiated discount
                suppliers.append({
                    "name": supplier["name"],
                    "code": supplier["code"],
                    "initial_price": initial_price,
                    "final_price": final_price,
                    "quote_reference": f"QT-{supplier['code']}-{serial:04d}",
                    "quote_date": (pr_approved + timedelta(days=s_idx * 2)).strftime("%Y-%m-%d"),
                    "is_ordered": s_idx == 0 if stage not in ["pr_processing", "cea_processing", "submitted", "pending_dh"] else False,
                    "ordered_date": (pr_approved + timedelta(days=10)).strftime("%Y-%m-%d") if s_idx == 0 else None
                })
            request["suppliers"] = suppliers
            
            # Set vendor from ordered supplier
            ordered_supplier = next((s for s in suppliers if s.get("is_ordered")), None)
            if ordered_supplier:
                request["vendor_name"] = ordered_supplier["name"]
                request["vendor_code"] = ordered_supplier["code"]
                request["initial_price"] = ordered_supplier["initial_price"]
                request["final_negotiated_price"] = ordered_supplier["final_price"]
                request["ordered_date"] = ordered_supplier["ordered_date"]
            
            # PO completed
            if stage not in ["pr_processing"]:
                po_num = f"PO-{serial:06d}"
                po_created = pr_approved + timedelta(days=12)
                po_approved = po_created + timedelta(days=5)
                request["po_number"] = po_num
                request["po_available"] = True
                request["po_approval_status"] = "Approved"
                request["po_created_date"] = po_created.strftime("%Y-%m-%d")
                request["po_approved_date"] = po_approved.strftime("%Y-%m-%d")
                request["requirement_items"][0]["po_number"] = po_num
                request["requirement_items"][0]["po_status"] = "Approved"
                request["requirement_items"][0]["po_created_date"] = po_created.strftime("%Y-%m-%d")
                request["requirement_items"][0]["po_approved_date"] = po_approved.strftime("%Y-%m-%d")
        
        if stage in ["dispatched", "delivered", "installation"] or scenario.get("complete"):
            # Delivery info
            dispatch_date = datetime.strptime(request.get("po_approved_date", base_date.strftime("%Y-%m-%d")), "%Y-%m-%d") + timedelta(days=20)
            request["delivery_status"] = "Dispatched" if stage == "dispatched" else "Delivered"
            request["delivery_date"] = (dispatch_date + timedelta(days=5)).strftime("%Y-%m-%d") if stage != "dispatched" else None
            request["expected_delivery_date"] = (dispatch_date + timedelta(days=7)).strftime("%Y-%m-%d")
            request["requirement_items"][0]["delivery_date"] = request["delivery_date"]
        
        if stage == "installation" or scenario.get("complete"):
            # Installation info
            delivery_date = datetime.strptime(request.get("delivery_date", base_date.strftime("%Y-%m-%d")), "%Y-%m-%d")
            request["installation_date"] = (delivery_date + timedelta(days=10)).strftime("%Y-%m-%d")
            request["requirement_items"][0]["installation_date"] = request["installation_date"]
        
        if scenario.get("complete"):
            # Commissioning completed
            install_date = datetime.strptime(request["installation_date"], "%Y-%m-%d")
            request["commissioning_date"] = (install_date + timedelta(days=7)).strftime("%Y-%m-%d")
            request["commissioning_status"] = "Completed"
            request["requirement_items"][0]["commissioning_date"] = request["commissioning_date"]
            request["requirement_items"][0]["commissioning_status"] = "Completed"
            
            # Add invoices for completed requests
            if request.get("final_negotiated_price"):
                total_amount = request["final_negotiated_price"]
                # Advance invoice
                request["invoices"] = [
                    {
                        "invoice_number": f"INV-{serial:06d}-ADV",
                        "invoice_date": request.get("ordered_date", base_date.strftime("%Y-%m-%d")),
                        "amount": total_amount * 0.3,  # 30% advance
                        "file_url": None,
                        "file_name": None,
                        "uploaded_at": None
                    },
                    {
                        "invoice_number": f"INV-{serial:06d}-DEL",
                        "invoice_date": request.get("delivery_date", base_date.strftime("%Y-%m-%d")),
                        "amount": total_amount * 0.5,  # 50% on delivery
                        "file_url": None,
                        "file_name": None,
                        "uploaded_at": None
                    },
                    {
                        "invoice_number": f"INV-{serial:06d}-FIN",
                        "invoice_date": request["commissioning_date"],
                        "amount": total_amount * 0.2,  # 20% final
                        "file_url": None,
                        "file_name": None,
                        "uploaded_at": None
                    }
                ]
            
            # Payment terms
            request["payment_terms"] = [
                {"description": "Advance Payment", "percentage": 30, "condition": "On PO", "abg_required": True, "pbg_required": False},
                {"description": "On Delivery", "percentage": 50, "condition": "Against Delivery", "abg_required": False, "pbg_required": False},
                {"description": "Final Payment", "percentage": 20, "condition": "After Commissioning", "abg_required": False, "pbg_required": True}
            ]
        
        if stage == "cea_processing":
            cea_num = f"CEA-{plant_code}-{serial:04d}"
            request["cea_number"] = cea_num
            request["cea_status"] = random.choice(["Capex Head", "Department Head", "CTO", "Budget"])
            request["cea_creation_date"] = (created_at + timedelta(days=3)).strftime("%Y-%m-%d")
            request["requirement_items"][0]["cea_number"] = cea_num
            request["requirement_items"][0]["cea_status"] = request["cea_status"]
        
        if stage == "pr_processing":
            # CEA completed
            cea_num = f"CEA-{plant_code}-{serial:04d}"
            request["cea_number"] = cea_num
            request["cea_status"] = "Approved"
            request["cea_creation_date"] = (created_at + timedelta(days=3)).strftime("%Y-%m-%d")
            request["cea_approved_date"] = (created_at + timedelta(days=15)).strftime("%Y-%m-%d")
            request["wbs_number"] = f"WBS-{serial:06d}"
            
            # PR in progress
            pr_num = f"PR-{serial:06d}"
            request["pr_number"] = pr_num
            request["pr_available"] = True
            request["pr_approval_status"] = random.choice(["01", "02", "03", "04"])
            request["pr_created_date"] = (created_at + timedelta(days=18)).strftime("%Y-%m-%d")
        
        requests_data.append(request)
    
    # Insert all requests
    if requests_data:
        await db.capex_requests.insert_many(requests_data)
        print(f"Created {len(requests_data)} comprehensive capex requests")
    
    return requests_data

async def main():
    print("Starting comprehensive FY 2025-26 data seeding...")
    await create_comprehensive_requests()
    print("Seeding completed!")

if __name__ == "__main__":
    asyncio.run(main())
