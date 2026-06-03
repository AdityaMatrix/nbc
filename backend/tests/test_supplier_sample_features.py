"""
Test file for Supplier Selection Logic and Sample Request Pickup Details
Features tested:
1. Supplier selection logic - only one supplier can be ordered
2. Place Order button works and auto-populates vendor_name/vendor_code
3. Cancel Order button works
4. Non-selected suppliers show as disabled
5. Sample request pickup details - Buyer can update Pickup Date, Dispatch Date, Reference No
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSupplierSelectionLogic:
    """Test supplier selection and ordering logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as buyer and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.request_id = "BAG-BB-002"
    
    def test_get_request_with_suppliers(self):
        """Test that request has suppliers array with is_ordered flag"""
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "suppliers" in data, "Request should have suppliers array"
        assert isinstance(data["suppliers"], list), "Suppliers should be a list"
        
        # Check supplier structure
        if len(data["suppliers"]) > 0:
            supplier = data["suppliers"][0]
            assert "name" in supplier, "Supplier should have name"
            assert "is_ordered" in supplier, "Supplier should have is_ordered flag"
            print(f"✓ Request has {len(data['suppliers'])} suppliers")
    
    def test_only_one_supplier_can_be_ordered(self):
        """Test that only one supplier has is_ordered=True"""
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        suppliers = data.get("suppliers", [])
        
        ordered_count = sum(1 for s in suppliers if s.get("is_ordered"))
        assert ordered_count <= 1, f"Only one supplier should be ordered, found {ordered_count}"
        print(f"✓ Only {ordered_count} supplier is ordered (expected 0 or 1)")
    
    def test_vendor_name_code_auto_populated(self):
        """Test that vendor_name and vendor_code are set when supplier is ordered"""
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        suppliers = data.get("suppliers", [])
        
        # Find ordered supplier
        ordered_supplier = next((s for s in suppliers if s.get("is_ordered")), None)
        
        if ordered_supplier:
            # Vendor name/code should match ordered supplier
            assert data.get("vendor_name") == ordered_supplier.get("name"), \
                f"vendor_name should match ordered supplier name"
            assert data.get("vendor_code") == ordered_supplier.get("code"), \
                f"vendor_code should match ordered supplier code"
            print(f"✓ vendor_name='{data.get('vendor_name')}' matches ordered supplier")
            print(f"✓ vendor_code='{data.get('vendor_code')}' matches ordered supplier")
        else:
            print("⚠ No supplier is currently ordered")
    
    def test_place_order_updates_supplier(self):
        """Test placing order on a supplier"""
        # First get current state
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        suppliers = data.get("suppliers", [])
        if len(suppliers) < 2:
            pytest.skip("Need at least 2 suppliers to test order switching")
        
        # Find a non-ordered supplier
        non_ordered_idx = next((i for i, s in enumerate(suppliers) if not s.get("is_ordered")), None)
        if non_ordered_idx is None:
            # Cancel current order first
            new_suppliers = [{"name": s["name"], "code": s.get("code"), "initial_price": s.get("initial_price"), 
                            "final_price": s.get("final_price"), "is_ordered": False} for s in suppliers]
            response = requests.put(f"{BASE_URL}/api/capex-requests/{self.request_id}", 
                                   headers=self.headers, json={"suppliers": new_suppliers, "vendor_name": None, "vendor_code": None})
            assert response.status_code == 200
            non_ordered_idx = 0
        
        # Place order on the non-ordered supplier
        new_suppliers = []
        for i, s in enumerate(suppliers):
            new_suppliers.append({
                "name": s["name"],
                "code": s.get("code"),
                "initial_price": s.get("initial_price"),
                "final_price": s.get("final_price"),
                "is_ordered": i == non_ordered_idx,
                "ordered_date": "2026-03-05" if i == non_ordered_idx else None
            })
        
        target_supplier = suppliers[non_ordered_idx]
        response = requests.put(f"{BASE_URL}/api/capex-requests/{self.request_id}", 
                               headers=self.headers, 
                               json={
                                   "suppliers": new_suppliers,
                                   "vendor_name": target_supplier["name"],
                                   "vendor_code": target_supplier.get("code")
                               })
        assert response.status_code == 200
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        data = response.json()
        
        ordered_count = sum(1 for s in data["suppliers"] if s.get("is_ordered"))
        assert ordered_count == 1, f"Should have exactly 1 ordered supplier, found {ordered_count}"
        assert data["vendor_name"] == target_supplier["name"], "vendor_name should be updated"
        print(f"✓ Place Order works - ordered supplier: {target_supplier['name']}")
    
    def test_cancel_order_clears_vendor(self):
        """Test canceling order clears vendor_name and vendor_code"""
        # First ensure there's an ordered supplier
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        data = response.json()
        suppliers = data.get("suppliers", [])
        
        if not any(s.get("is_ordered") for s in suppliers):
            # Place an order first
            if len(suppliers) > 0:
                new_suppliers = [{"name": s["name"], "code": s.get("code"), "initial_price": s.get("initial_price"),
                                "final_price": s.get("final_price"), "is_ordered": i == 0} for i, s in enumerate(suppliers)]
                requests.put(f"{BASE_URL}/api/capex-requests/{self.request_id}", 
                            headers=self.headers, 
                            json={"suppliers": new_suppliers, "vendor_name": suppliers[0]["name"], "vendor_code": suppliers[0].get("code")})
        
        # Now cancel the order
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        data = response.json()
        suppliers = data.get("suppliers", [])
        
        new_suppliers = [{"name": s["name"], "code": s.get("code"), "initial_price": s.get("initial_price"),
                        "final_price": s.get("final_price"), "is_ordered": False, "ordered_date": None} for s in suppliers]
        
        response = requests.put(f"{BASE_URL}/api/capex-requests/{self.request_id}", 
                               headers=self.headers, 
                               json={"suppliers": new_suppliers, "vendor_name": None, "vendor_code": None})
        assert response.status_code == 200
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/capex-requests/{self.request_id}", headers=self.headers)
        data = response.json()
        
        ordered_count = sum(1 for s in data["suppliers"] if s.get("is_ordered"))
        assert ordered_count == 0, f"Should have 0 ordered suppliers after cancel, found {ordered_count}"
        assert data.get("vendor_name") is None, "vendor_name should be cleared"
        assert data.get("vendor_code") is None, "vendor_code should be cleared"
        print("✓ Cancel Order works - vendor_name and vendor_code cleared")
        
        # Restore original state - order Supplier A
        new_suppliers = [{"name": s["name"], "code": s.get("code"), "initial_price": s.get("initial_price"),
                        "final_price": s.get("final_price"), "is_ordered": s["name"] == "Supplier A", 
                        "ordered_date": "2026-03-05" if s["name"] == "Supplier A" else None} for s in suppliers]
        requests.put(f"{BASE_URL}/api/capex-requests/{self.request_id}", 
                    headers=self.headers, 
                    json={"suppliers": new_suppliers, "vendor_name": "Supplier A", "vendor_code": "SA001"})


class TestSampleRequestPickupDetails:
    """Test sample request pickup details update by buyer"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as buyer and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.capex_request_id = "BAG-BB-002"
    
    def test_get_sample_requests(self):
        """Test getting sample requests for a capex request"""
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={self.capex_request_id}", 
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of sample requests"
        print(f"✓ Found {len(data)} sample request(s) for {self.capex_request_id}")
        
        if len(data) > 0:
            sample = data[0]
            assert "id" in sample, "Sample should have id"
            assert "status" in sample, "Sample should have status"
            assert "pickup_date" in sample, "Sample should have pickup_date field"
            assert "dispatch_date" in sample, "Sample should have dispatch_date field"
            assert "dispatch_reference" in sample, "Sample should have dispatch_reference field"
            print(f"✓ Sample {sample['id']} has all required fields")
    
    def test_update_pickup_date(self):
        """Test buyer can update pickup_date"""
        # Get sample request
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={self.capex_request_id}", 
                               headers=self.headers)
        assert response.status_code == 200
        samples = response.json()
        
        if len(samples) == 0:
            pytest.skip("No sample requests found")
        
        sample_id = samples[0]["id"]
        
        # Update pickup_date
        test_date = "2026-03-10"
        response = requests.put(f"{BASE_URL}/api/sample-requests/{sample_id}/pickup", 
                               headers=self.headers,
                               json={"pickup_date": test_date})
        assert response.status_code == 200, f"Failed to update pickup_date: {response.text}"
        
        # Verify update
        data = response.json()
        assert data.get("pickup_date") == test_date, f"pickup_date should be {test_date}"
        assert data.get("status") == "Picked Up", "Status should be 'Picked Up'"
        print(f"✓ pickup_date updated to {test_date}, status changed to 'Picked Up'")
    
    def test_update_dispatch_date(self):
        """Test buyer can update dispatch_date"""
        # Get sample request
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={self.capex_request_id}", 
                               headers=self.headers)
        samples = response.json()
        
        if len(samples) == 0:
            pytest.skip("No sample requests found")
        
        sample_id = samples[0]["id"]
        
        # Update dispatch_date
        test_date = "2026-03-12"
        response = requests.put(f"{BASE_URL}/api/sample-requests/{sample_id}/pickup", 
                               headers=self.headers,
                               json={"dispatch_date": test_date})
        assert response.status_code == 200, f"Failed to update dispatch_date: {response.text}"
        
        # Verify update
        data = response.json()
        assert data.get("dispatch_date") == test_date, f"dispatch_date should be {test_date}"
        assert data.get("status") == "Dispatched", "Status should be 'Dispatched'"
        print(f"✓ dispatch_date updated to {test_date}, status changed to 'Dispatched'")
    
    def test_update_dispatch_reference(self):
        """Test buyer can update dispatch_reference"""
        # Get sample request
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={self.capex_request_id}", 
                               headers=self.headers)
        samples = response.json()
        
        if len(samples) == 0:
            pytest.skip("No sample requests found")
        
        sample_id = samples[0]["id"]
        
        # Update dispatch_reference along with dispatch_date
        test_ref = "AWB-TEST-12345"
        test_date = "2026-03-12"
        response = requests.put(f"{BASE_URL}/api/sample-requests/{sample_id}/pickup", 
                               headers=self.headers,
                               json={"dispatch_date": test_date, "dispatch_reference": test_ref})
        assert response.status_code == 200, f"Failed to update dispatch_reference: {response.text}"
        
        # Verify update
        data = response.json()
        assert data.get("dispatch_reference") == test_ref, f"dispatch_reference should be {test_ref}"
        print(f"✓ dispatch_reference updated to {test_ref}")
    
    def test_update_all_pickup_fields_together(self):
        """Test buyer can update all pickup fields in one request"""
        # Get sample request
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={self.capex_request_id}", 
                               headers=self.headers)
        samples = response.json()
        
        if len(samples) == 0:
            pytest.skip("No sample requests found")
        
        sample_id = samples[0]["id"]
        
        # Update all fields
        update_data = {
            "pickup_date": "2026-03-15",
            "dispatch_date": "2026-03-16",
            "dispatch_reference": "AWB-COMBINED-TEST"
        }
        
        # Note: The API updates status based on the last field set
        # dispatch_date takes precedence over pickup_date
        response = requests.put(f"{BASE_URL}/api/sample-requests/{sample_id}/pickup", 
                               headers=self.headers,
                               json=update_data)
        assert response.status_code == 200, f"Failed to update pickup fields: {response.text}"
        
        # Verify update
        data = response.json()
        assert data.get("dispatch_date") == update_data["dispatch_date"]
        assert data.get("dispatch_reference") == update_data["dispatch_reference"]
        print(f"✓ All pickup fields updated successfully")
    
    def test_non_buyer_cannot_update_pickup(self):
        """Test that non-buyer roles cannot update pickup details"""
        # Login as a regular user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        
        if response.status_code != 200:
            pytest.skip("Test user not available")
        
        user_token = response.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get sample request
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={self.capex_request_id}", 
                               headers=self.headers)
        samples = response.json()
        
        if len(samples) == 0:
            pytest.skip("No sample requests found")
        
        sample_id = samples[0]["id"]
        
        # Try to update as non-buyer
        response = requests.put(f"{BASE_URL}/api/sample-requests/{sample_id}/pickup", 
                               headers=user_headers,
                               json={"pickup_date": "2026-03-20"})
        
        assert response.status_code == 403, f"Non-buyer should not be able to update pickup, got {response.status_code}"
        print("✓ Non-buyer correctly denied access to update pickup details")
    
    def test_reset_sample_to_pending(self):
        """Reset sample request to Pending status for future tests"""
        # Get sample request
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={self.capex_request_id}", 
                               headers=self.headers)
        samples = response.json()
        
        if len(samples) == 0:
            pytest.skip("No sample requests found")
        
        # Note: There's no direct API to reset status, but we can verify the current state
        sample = samples[0]
        print(f"✓ Sample {sample['id']} current status: {sample['status']}")
        print(f"  - pickup_date: {sample.get('pickup_date')}")
        print(f"  - dispatch_date: {sample.get('dispatch_date')}")
        print(f"  - dispatch_reference: {sample.get('dispatch_reference')}")


class TestSamplePickupEndpointValidation:
    """Test sample pickup endpoint validation and edge cases"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as buyer and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_invalid_sample_id_returns_404(self):
        """Test that invalid sample ID returns 404"""
        response = requests.put(f"{BASE_URL}/api/sample-requests/INVALID-ID/pickup", 
                               headers=self.headers,
                               json={"pickup_date": "2026-03-10"})
        assert response.status_code == 404, f"Expected 404 for invalid sample ID, got {response.status_code}"
        print("✓ Invalid sample ID correctly returns 404")
    
    def test_empty_update_body(self):
        """Test that empty update body is handled"""
        # Get a valid sample ID
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id=BAG-BB-002", 
                               headers=self.headers)
        samples = response.json()
        
        if len(samples) == 0:
            pytest.skip("No sample requests found")
        
        sample_id = samples[0]["id"]
        
        # Send empty body
        response = requests.put(f"{BASE_URL}/api/sample-requests/{sample_id}/pickup", 
                               headers=self.headers,
                               json={})
        # Should succeed but not change anything significant
        assert response.status_code == 200, f"Empty body should be accepted, got {response.status_code}"
        print("✓ Empty update body handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
