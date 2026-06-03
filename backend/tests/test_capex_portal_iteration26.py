"""
CAPEX Portal Iteration 26 Tests
Testing:
1. Login Page: Cosmos theme, NO demo credentials, NO AES/JWT/RBAC, NO bearing text
2. Login redirects: admin -> /admin, buyer/user -> /dashboard
3. Settings Page: Theme section says 'Theme is managed by Admin'
4. Admin Dashboard: Themes tab, Plants/Departments/Users CRUD
5. Sidebar: Buyer login - NO Users tab
6. Under Preparation Flow: Dialog with date picker
7. Ready for Dispatch Flow: Dialog with material fields, packing, gate pass
8. Buyer Decision Flow: Job Work Challan vs Gate Pass
9. Backend APIs for sample preparation and pickup
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@capex.com", "password": "admin123"}
BUYER_CREDS = {"email": "vijay@capex.com", "password": "buyer123"}
USER_CREDS = {"email": "amit@capex.com", "password": "user123"}
CAPEX_HEAD_CREDS = {"email": "manoj@capex.com", "password": "capex123"}
DEPT_HEAD_CREDS = {"email": "rajesh@capex.com", "password": "dh123"}


class TestAuthLogin:
    """Test authentication and login endpoints"""
    
    def test_admin_login_success(self):
        """Admin login should succeed and return admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@capex.com"
        print("PASS: Admin login successful, role=admin")
    
    def test_buyer_login_success(self):
        """Buyer login should succeed and return buyer role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "buyer"
        assert data["user"]["email"] == "vijay@capex.com"
        print("PASS: Buyer login successful, role=buyer")
    
    def test_user_login_success(self):
        """User login should succeed and return user role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "user"
        assert data["user"]["email"] == "amit@capex.com"
        print("PASS: User login successful, role=user")
    
    def test_capex_head_login_success(self):
        """Capex Head login should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CAPEX_HEAD_CREDS)
        assert response.status_code == 200, f"Capex Head login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "capex_head"
        print("PASS: Capex Head login successful")
    
    def test_dept_head_login_success(self):
        """Department Head login should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEPT_HEAD_CREDS)
        assert response.status_code == 200, f"Dept Head login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "department_head"
        print("PASS: Department Head login successful")
    
    def test_invalid_login_fails(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid login correctly returns 401")


class TestAdminAPIs:
    """Test admin-only APIs"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        return response.json()["access_token"]
    
    def test_admin_stats_success(self, admin_token):
        """GET /api/admin/stats should work for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        data = response.json()
        assert "total_users" in data
        assert "total_requests" in data
        assert "total_plants" in data
        assert "total_departments" in data
        print(f"PASS: Admin stats - {data['total_users']} users, {data['total_requests']} requests")
    
    def test_admin_plants_list(self, admin_token):
        """GET /api/admin/plants should return plants list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/plants", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin plants - {len(data)} plants found")
    
    def test_admin_departments_list(self, admin_token):
        """GET /api/admin/departments should return departments list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/departments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin departments - {len(data)} departments found")
    
    def test_admin_users_list(self, admin_token):
        """GET /api/admin/users should return users list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin users - {len(data)} users found")
    
    def test_non_admin_blocked_from_admin_stats(self, buyer_token):
        """Non-admin should be blocked from admin APIs"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Non-admin correctly blocked from admin stats")


class TestSamplePreparationAPIs:
    """Test sample preparation and pickup APIs"""
    
    @pytest.fixture
    def user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        return response.json()["access_token"]
    
    def test_get_sample_requests(self, user_token):
        """GET /api/sample-requests should work for user"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Sample requests - {len(data)} samples found")
        return data
    
    def test_preparation_under_preparation_with_date(self, user_token):
        """PUT /api/sample-requests/{id}/preparation with Under Preparation and date"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First get a sample
        samples_response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        samples = samples_response.json()
        
        if not samples:
            pytest.skip("No sample requests available for testing")
        
        sample_id = samples[0]["id"]
        
        # Update to Under Preparation with expected readiness date
        update_data = {
            "readiness_status": "Under Preparation",
            "expected_readiness_date": "2026-02-15"
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{sample_id}/preparation",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200, f"Under Preparation update failed: {response.text}"
        data = response.json()
        assert data["readiness_status"] == "Under Preparation"
        print(f"PASS: Sample {sample_id} marked as Under Preparation with date")
    
    def test_preparation_ready_for_pickup_with_items(self, user_token):
        """PUT /api/sample-requests/{id}/preparation with Ready for Pickup and items"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First get a sample
        samples_response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        samples = samples_response.json()
        
        if not samples:
            pytest.skip("No sample requests available for testing")
        
        sample_id = samples[0]["id"]
        
        # Update to Ready for Pickup with preparation items
        update_data = {
            "readiness_status": "Ready for Pickup",
            "preparation_items": [
                {
                    "description": "Test Material",
                    "material_code": "MAT-001",
                    "number_of_samples": 2,
                    "type_of_packing": "Wooden"
                }
            ],
            "gate_pass_available": False
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{sample_id}/preparation",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200, f"Ready for Pickup update failed: {response.text}"
        data = response.json()
        assert data["readiness_status"] == "Ready for Pickup"
        assert data["status"] == "Sample Ready for Dispatch"
        print(f"PASS: Sample {sample_id} marked as Ready for Dispatch with items")
    
    def test_buyer_decision_gate_pass(self, buyer_token):
        """PUT /api/sample-requests/{id}/pickup with buyer_decision=Gate Pass"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # First get a sample that's ready for dispatch
        samples_response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        samples = samples_response.json()
        
        ready_samples = [s for s in samples if s.get("status") == "Sample Ready for Dispatch"]
        if not ready_samples:
            pytest.skip("No samples ready for dispatch to test buyer decision")
        
        sample_id = ready_samples[0]["id"]
        
        # Update with buyer decision
        update_data = {
            "buyer_decision": "Gate Pass"
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{sample_id}/pickup",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200, f"Buyer decision update failed: {response.text}"
        data = response.json()
        assert data["buyer_decision"] == "Gate Pass"
        print(f"PASS: Buyer decision 'Gate Pass' recorded for sample {sample_id}")
    
    def test_buyer_blocked_from_preparation_api(self, buyer_token):
        """Buyer should be blocked from preparation API"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # First get a sample
        samples_response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        samples = samples_response.json()
        
        if not samples:
            pytest.skip("No sample requests available for testing")
        
        sample_id = samples[0]["id"]
        
        # Try to update preparation (should fail for buyer)
        update_data = {
            "readiness_status": "Under Preparation"
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{sample_id}/preparation",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Buyer correctly blocked from preparation API")
    
    def test_user_blocked_from_pickup_api(self, user_token):
        """User should be blocked from pickup API"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # First get a sample
        samples_response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        samples = samples_response.json()
        
        if not samples:
            pytest.skip("No sample requests available for testing")
        
        sample_id = samples[0]["id"]
        
        # Try to update pickup (should fail for user)
        update_data = {
            "buyer_decision": "Gate Pass"
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{sample_id}/pickup",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: User correctly blocked from pickup API")


class TestCapexRequestsAPIs:
    """Test capex requests APIs"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        return response.json()["access_token"]
    
    def test_get_capex_requests(self, buyer_token):
        """GET /api/capex-requests should work"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Capex requests - {len(data)} requests found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
