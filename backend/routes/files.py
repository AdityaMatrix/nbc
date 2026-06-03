from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime, timezone
import uuid

from database import db
from config import UPLOAD_DIR
from dependencies import get_current_user

router = APIRouter(prefix="/api")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), file_type: str = "document", current_user: dict = Depends(get_current_user)):
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    safe_filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / safe_filename

    content = await file.read()
    file_size = len(content)

    with open(file_path, "wb") as f:
        f.write(content)

    file_doc = {
        "id": file_id,
        "original_filename": file.filename,
        "stored_filename": safe_filename,
        "file_type": file_type,
        "content_type": file.content_type,
        "size": file_size,
        "uploaded_by": current_user["id"],
        "uploaded_by_name": current_user["name"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)

    return {
        "id": file_id,
        "file_id": file_id,
        "filename": file.filename,
        "type": file_type,
        "size": file_size,
        "uploaded_at": file_doc["uploaded_at"],
        "url": f"/api/files/{file_id}/download"
    }


@router.post("/files/upload")
async def upload_file_alias(
    file: UploadFile = File(...),
    file_type: str = "document",
    capex_request_id: str = None,
    document_type: str = None,
    current_user: dict = Depends(get_current_user)
):
    return await upload_file(file, document_type or file_type, current_user)


@router.get("/files/{file_id}")
async def get_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    return file_doc


@router.get("/files/{file_id}/download")
async def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = UPLOAD_DIR / file_doc["stored_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=file_doc["original_filename"],
        media_type=file_doc.get("content_type", "application/octet-stream")
    )
