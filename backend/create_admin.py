"""One-time script to ensure an admin user exists in the database."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os, uuid, bcrypt
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]

    # Check if admin already exists
    admin = await db.users.find_one({"role": "admin"}, {"_id": 0, "password_hash": 0})
    if admin:
        print(f"Admin already exists: {admin['email']} (name: {admin['name']})")
        print("If you can't login, the password will be reset to 'admin123'")
        # Reset password just in case
        hashed = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        await db.users.update_one({"role": "admin"}, {"$set": {"password_hash": hashed}})
        print("Password reset to: admin123")
    else:
        print("No admin user found. Creating one...")
        hashed = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        doc = {
            "id": str(uuid.uuid4()),
            "email": "admin@capex.com",
            "name": "Admin",
            "role": "admin",
            "department": None,
            "plant": None,
            "password_hash": hashed,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        }
        await db.users.insert_one(doc)
        print(f"Admin user created!")
        print(f"  Email:    admin@capex.com")
        print(f"  Password: admin123")

    client.close()

asyncio.run(main())
