"""
Script to populate cost savings data (initial_price and final_price) for existing capex requests.
This updates supplier data to ensure cost savings calculations work correctly.
"""

import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Supplier names for generating data
SUPPLIER_NAMES = [
    "Tata Industrial", "Mahindra Engineering", "Bosch India", "Siemens Ltd",
    "ABB India", "L&T Heavy", "Kirloskar Brothers", "Thermax Ltd",
    "SKF India", "Timken", "NSK Ltd", "NTN Corporation"
]

async def populate_cost_savings_data():
    """Add initial_price and final_price to all suppliers in capex requests"""
    
    # Get all capex requests
    requests = await db.capex_requests.find({}).to_list(1000)
    print(f"Found {len(requests)} capex requests")
    
    updated_count = 0
    
    for req in requests:
        request_id = req.get('id')
        suppliers = req.get('suppliers', [])
        estimated_value = req.get('estimated_value', 0) or random.randint(100000, 5000000)
        
        # If no suppliers, create some
        if not suppliers:
            num_suppliers = random.randint(2, 4)
            suppliers = []
            base_price = estimated_value * random.uniform(0.9, 1.1)
            
            for i in range(num_suppliers):
                supplier_name = random.choice(SUPPLIER_NAMES)
                # Initial price is higher, final price is negotiated down
                initial_price = int(base_price * random.uniform(1.05, 1.25))
                final_price = int(initial_price * random.uniform(0.85, 0.95))  # 5-15% discount
                
                suppliers.append({
                    "name": supplier_name,
                    "code": f"SUP-{i+1:03d}",
                    "initial_price": initial_price,
                    "final_price": final_price,
                    "delivery_days": random.randint(15, 60),
                    "payment_terms": random.choice(["30 days", "45 days", "60 days", "90 days"]),
                    "warranty_months": random.choice([12, 18, 24, 36]),
                    "selected": i == 0  # First supplier is selected
                })
            
            # Update the request with new suppliers
            await db.capex_requests.update_one(
                {"id": request_id},
                {"$set": {
                    "suppliers": suppliers,
                    "final_negotiated_price": suppliers[0]["final_price"] if suppliers else estimated_value
                }}
            )
            print(f"  Added {num_suppliers} suppliers to {request_id}")
            updated_count += 1
            
        else:
            # Update existing suppliers with missing price data
            needs_update = False
            for supplier in suppliers:
                if not supplier.get('initial_price') or not supplier.get('final_price'):
                    needs_update = True
                    base_price = estimated_value * random.uniform(0.9, 1.1)
                    supplier['initial_price'] = supplier.get('initial_price') or int(base_price * random.uniform(1.05, 1.25))
                    supplier['final_price'] = supplier.get('final_price') or int(supplier['initial_price'] * random.uniform(0.85, 0.95))
            
            if needs_update:
                await db.capex_requests.update_one(
                    {"id": request_id},
                    {"$set": {"suppliers": suppliers}}
                )
                print(f"  Updated suppliers for {request_id}")
                updated_count += 1
    
    print(f"\nTotal requests updated: {updated_count}")
    
    # Calculate and display total cost savings
    all_requests = await db.capex_requests.find({}).to_list(1000)
    total_initial = 0
    total_final = 0
    
    for req in all_requests:
        for supplier in req.get('suppliers', []):
            if supplier.get('selected', False) or len(req.get('suppliers', [])) == 1:
                total_initial += supplier.get('initial_price', 0)
                total_final += supplier.get('final_price', 0)
                break
    
    savings = total_initial - total_final
    savings_percent = (savings / total_initial * 100) if total_initial > 0 else 0
    
    print(f"\n=== Cost Savings Summary ===")
    print(f"Total Initial Price: ₹{total_initial:,.0f}")
    print(f"Total Final Price: ₹{total_final:,.0f}")
    print(f"Total Savings: ₹{savings:,.0f} ({savings_percent:.1f}%)")

async def main():
    print("Populating cost savings data...")
    await populate_cost_savings_data()
    print("\nDone!")

if __name__ == "__main__":
    asyncio.run(main())
