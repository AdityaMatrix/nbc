from datetime import datetime, timezone
from typing import List
import uuid
import asyncio
import logging
import resend

from database import db
from config import RESEND_API_KEY, SENDER_EMAIL

resend.api_key = RESEND_API_KEY
logger = logging.getLogger(__name__)


async def create_notification(user_id: str, title: str, message: str, notification_type: str, link: str = None, request_id: str = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "link": link,
        "request_id": request_id,
        "reference_id": request_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification


async def send_email_notification(to_email: str, subject: str, html_content: str):
    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email")
        return
    try:
        params = {"from": SENDER_EMAIL, "to": [to_email], "subject": subject, "html": html_content}
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")


async def notify_users(user_ids: List[str], title: str, message: str, notification_type: str, reference_id: str = None, send_email: bool = True):
    for user_id in user_ids:
        await create_notification(user_id, title, message, notification_type, request_id=reference_id)
        if send_email:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if user:
                html = f"<h2>{title}</h2><p>{message}</p><p>Login to Capex Portal for more details.</p>"
                await send_email_notification(user["email"], f"Capex Portal: {title}", html)
