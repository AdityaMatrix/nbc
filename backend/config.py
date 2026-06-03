import os
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

STATIC_DIR = ROOT_DIR / "static"
VIDEOS_DIR = STATIC_DIR / "videos"
UPLOAD_DIR = ROOT_DIR / "uploads"

STATIC_DIR.mkdir(exist_ok=True)
VIDEOS_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Resend Config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class UserRole:
    USER = "user"
    DEPARTMENT_HEAD = "department_head"
    BUYER = "buyer"
    CAPEX_HEAD = "capex_head"
    PROCESS_ENGINEERING = "process_engineering"
    ADMIN = "admin"


PLANTS = ["Bagru", "Jaipur", "Newai", "Savli"]
DEPARTMENTS = [
    "Railway Bearing", "Industrial Bearing", "Ball Bearing", "Taper Roller Bearing",
    "Large Dia Bearing", "Water Pump Bearing", "Finish Goods", "Stores",
    "Digital", "Quality", "IT", "HR", "Marketing & Branding", "R&D", "Metallurgy Lab", "Tribo Lab"
]

CEA_APPROVAL_STAGES = ["Capex Head", "Department Head", "CTO", "Manufacturing Head", "Operation Head", "Budget", "CFO", "Approved"]
PR_APPROVAL_STAGES = ["01", "02", "03", "04", "05", "06", "Approved"]
PO_APPROVAL_STAGES = ["01", "02", "03", "04", "05", "Approved"]
PROJECT_STATUSES = [
    "Submitted", "Pending Approval", "Approved", "CEA Processing", "PR Processing",
    "PO Processing", "DAP Approval Pending", "Sample Requested", "PDI", "Under Dispatch",
    "Delivery", "Installation in Progress", "Completed", "Rejected"
]

WORKFLOW_STAGES = [
    "request", "cea", "pr", "po", "dap", "sample", "pdi", "dispatch", "delivery", "commissioned", "completed"
]

SAMPLE_STATUSES = ["Pending", "Under Preparation", "Ready for Pickup", "Sample Ready for Dispatch", "Picked Up", "Dispatched", "Delivered"]
DAP_STATUSES = ["Pending Approval", "Changes Required", "Approved"]
DAP_CHANGE_TYPES = ["Minor Revision Required", "Major Revision Required", "Re-submit DAP"]
