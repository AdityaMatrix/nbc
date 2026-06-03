from fastapi import APIRouter

from config import (
    PLANTS, DEPARTMENTS, CEA_APPROVAL_STAGES, PR_APPROVAL_STAGES,
    PO_APPROVAL_STAGES, PROJECT_STATUSES, SAMPLE_STATUSES,
    DAP_STATUSES, DAP_CHANGE_TYPES, WORKFLOW_STAGES
)

router = APIRouter(prefix="/api")


@router.get("/reference/plants")
async def get_plants():
    return PLANTS


@router.get("/reference/departments")
async def get_departments():
    return DEPARTMENTS


@router.get("/reference/cea-stages")
async def get_cea_stages():
    return CEA_APPROVAL_STAGES


@router.get("/reference/pr-stages")
async def get_pr_stages():
    return PR_APPROVAL_STAGES


@router.get("/reference/po-stages")
async def get_po_stages():
    return PO_APPROVAL_STAGES


@router.get("/reference/statuses")
async def get_statuses():
    return PROJECT_STATUSES


@router.get("/reference/sample-statuses")
async def get_sample_statuses():
    return SAMPLE_STATUSES


@router.get("/reference/dap-statuses")
async def get_dap_statuses():
    return DAP_STATUSES


@router.get("/reference/dap-change-types")
async def get_dap_change_types():
    return DAP_CHANGE_TYPES


@router.get("/reference/workflow-stages")
async def get_workflow_stages():
    return WORKFLOW_STAGES
