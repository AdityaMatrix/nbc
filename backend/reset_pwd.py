import asyncio, os, bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    h = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()
    r = await db.users.update_one({"email": "manoj@capex.com"}, {"$set": {"password_hash": h}})
    print(f"Updated: {r.modified_count}")
    client.close()

asyncio.run(main())
