from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import os

from database import client
from config import STATIC_DIR, VIDEOS_DIR

# Create the main app
app = FastAPI(title="Capex Portal API")

# Import and include all routers
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.requests import router as requests_router
from routes.samples import router as samples_router
from routes.dap import router as dap_router
from routes.comments import router as comments_router
from routes.notifications import router as notifications_router
from routes.analytics import router as analytics_router
from routes.ai import router as ai_router
from routes.reference import router as reference_router
from routes.files import router as files_router
from routes.vendors import router as vendors_router
from routes.seed import router as seed_router
from routes.bulk_upload import router as bulk_upload_router
from routes.admin import router as admin_router
from routes.access_control import router as access_control_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(bulk_upload_router)
app.include_router(requests_router)
app.include_router(samples_router)
app.include_router(dap_router)
app.include_router(comments_router)
app.include_router(notifications_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(reference_router)
app.include_router(files_router)
app.include_router(vendors_router)
app.include_router(seed_router)
app.include_router(admin_router)
app.include_router(access_control_router)

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Mount static files for videos
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Dedicated endpoint for user manual video download
@app.get("/api/download/user-manual")
async def download_user_manual():
    video_path = VIDEOS_DIR / "user_manual.mp4"
    if not video_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User manual video not found.")
    return FileResponse(
        path=str(video_path),
        filename="Capex_Portal_User_Manual.mp4",
        media_type="video/mp4"
    )

# Dedicated endpoint for user manual PPT download
@app.get("/api/download/user-manual-ppt")
async def download_user_manual_ppt():
    ppt_path = STATIC_DIR / "CAPEX_Portal_User_Manual.pptx"
    if not ppt_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User manual PPT not found.")
    return FileResponse(
        path=str(ppt_path),
        filename="CAPEX_Portal_User_Manual.pptx",
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )

@app.get("/api/user-manual/status")
async def user_manual_status():
    video_path = VIDEOS_DIR / "user_manual.mp4"
    return {
        "available": video_path.exists(),
        "path": "/api/download/user-manual" if video_path.exists() else None,
        "stream_url": "/static/videos/user_manual.mp4" if video_path.exists() else None
    }

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
