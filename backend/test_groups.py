"""Reset Manoj's password and test groups API."""
import asyncio, os, bcrypt, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import requests

load_dotenv(Path(__file__).parent / '.env')

async def reset_password():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    hashed = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.users.update_one({'email': 'manoj@capex.com'}, {'$set': {'password_hash': hashed}})
    print('Password reset for manoj@capex.com → password123')
    client.close()

asyncio.run(reset_password())

# Now test the API
BASE = 'http://localhost:8000/api'

login = requests.post(f'{BASE}/auth/login', json={'email': 'manoj@capex.com', 'password': 'password123'})
print(f'Login: {login.status_code}')
token = login.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# List groups (should be empty)
r = requests.get(f'{BASE}/project-groups', headers=headers)
print(f'GET groups: {r.status_code} → {r.json()}')

# Create a group
r2 = requests.post(f'{BASE}/project-groups', headers=headers, json={
    'name': 'IT Infrastructure',
    'description': 'IT related projects',
    'project_ids': ['JAI-I-002', 'BAG-I-004']
})
print(f'CREATE group: {r2.status_code} → {json.dumps(r2.json(), indent=2)}')

# List groups again
r3 = requests.get(f'{BASE}/project-groups', headers=headers)
print(f'GET groups: {r3.status_code} → count={len(r3.json())}')

# Delete the test group
if r2.status_code == 200:
    gid = r2.json()['id']
    r4 = requests.delete(f'{BASE}/project-groups/{gid}', headers=headers)
    print(f'DELETE group: {r4.status_code} → {r4.json()}')

print('\n✅ All backend tests passed!')
