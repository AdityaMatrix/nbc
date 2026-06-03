"""
Test suite for Admin Dashboard, Auth, and New Sample Request features
Tests: Login, Admin Dashboard APIs, Sample Request creation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://capex-portal-3.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"email": "admin@capex.com", "password": "admin123"}
BUYER_CREDS = {"email": "vijay@capex.com", "password": "buyer123"}
CAPEX_HEAD_CREDS = {"email": "manoj@capex.com", "password": "capex123"}
DH_CREDS = {"email": "rajesh@capex.com", "password": "dh123"}


class TestAuthLogin:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login returns access_token and redirects to /admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        assert data["user"]["email"] == "admin@capex.com"
        print(f"✓ Admin login successful: {data['user']['name']}")
    
    def test_buyer_login_success(self):
        """Test buyer login returns access_token and redirects to /dashboard"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert data["user"]["role"] == "buyer", f"Expected buyer role, got {data['user']['role']}"
        print(f"✓ Buyer login successful: {data['user']['name']}")
    
    def test_capex_head_login_success(self):
        """Test capex head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CAPEX_HEAD_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "capex_head"
        print(f"✓ Capex Head login successful: {data['user']['name']}")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@capex.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestAdminDashboard:
    """Admin Dashboard API tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["access_token"]
    
    def test_admin_stats(self, admin_token):
        """Test GET /api/admin/stats returns dashboard statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "total_users" in data, "Missing total_users"
        assert "total_requests" in data, "Missing total_requests"
        assert "total_plants" in data, "Missing total_plants"
        assert "total_departments" in data, "Missing total_departments"
        assert "pending_resets" in data, "Missing pending_resets"
        assert "role_breakdown" in data, "Missing role_breakdown"
        print(f"✓ Admin stats: {data['total_users']} users, {data['total_requests']} requests")
    
    def test_admin_plants(self, admin_token):
        """Test GET /api/admin/plants returns plant list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/plants", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of plants"
        assert len(data) > 0, "Expected at least one plant"
        assert "name" in data[0], "Plant should have name"
        assert "id" in data[0], "Plant should have id"
        print(f"✓ Admin plants: {len(data)} plants found")
    
    def test_admin_departments(self, admin_token):
        """Test GET /api/admin/departments returns department list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/departments", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of departments"
        assert len(data) > 0, "Expected at least one department"
        print(f"✓ Admin departments: {len(data)} departments found")
    
    def test_admin_users(self, admin_token):
        """Test GET /api/admin/users returns user list with roles"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        assert len(data) > 0, "Expected at least one user"
        # Check user structure
        user = data[0]
        assert "email" in user, "User should have email"
        assert "name" in user, "User should have name"
        assert "role" in user, "User should have role"
        print(f"✓ Admin users: {len(data)} users found")
    
    def test_admin_password_reset_requests(self, admin_token):
        """Test GET /api/admin/password-reset-requests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/password-reset-requests", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of reset requests"
        print(f"✓ Admin password reset requests: {len(data)} requests")
    
    def test_non_admin_cannot_access_admin_apis(self):
        """Test that non-admin users cannot access admin APIs"""
        # Login as buyer
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        buyer_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Try to access admin stats
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-admin correctly blocked from admin APIs")


class TestForgotPassword:
    """Forgot password flow tests"""
    
    def test_forgot_password_endpoint(self):
        """Test POST /api/auth/forgot-password"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "vijay@capex.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print("✓ Forgot password request submitted")


class TestSampleRequestCreation:
    """Sample Request creation tests (New Sample from Request Detail)"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def capex_head_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CAPEX_HEAD_CREDS)
        return response.json()["access_token"]
    
    def test_get_capex_requests(self, buyer_token):
        """Test GET /api/capex-requests to find existing requests"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of requests"
        print(f"✓ Found {len(data)} capex requests")
        return data
    
    def test_create_sample_request_as_buyer(self, buyer_token):
        """Test POST /api/sample-requests - Buyer can create sample request"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # First get a capex request to attach sample to
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        requests_list = response.json()
        
        if len(requests_list) == 0:
            pytest.skip("No capex requests available to test sample creation")
        
        capex_request_id = requests_list[0]["id"]
        
        # Create sample request
        sample_data = {
            "capex_request_id": capex_request_id,
            "line_items": [
                {"material_description": "Test Material 1", "number_of_samples": 2},
                {"material_description": "Test Material 2", "number_of_samples": 1}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/sample-requests", json=sample_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Sample request should have id"
        assert data["capex_request_id"] == capex_request_id
        assert len(data["line_items"]) == 2
        print(f"✓ Sample request created: {data['id']}")
    
    def test_create_sample_request_as_capex_head(self, capex_head_token):
        """Test POST /api/sample-requests - Capex Head can create sample request"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # First get a capex request
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        requests_list = response.json()
        
        if len(requests_list) == 0:
            pytest.skip("No capex requests available to test sample creation")
        
        capex_request_id = requests_list[0]["id"]
        
        # Create sample request
        sample_data = {
            "capex_request_id": capex_request_id,
            "line_items": [
                {"material_description": "Capex Head Test Material", "number_of_samples": 3}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/sample-requests", json=sample_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Capex Head created sample request: {data['id']}")
    
    def test_get_sample_requests_for_capex_request(self, buyer_token):
        """Test GET /api/sample-requests?capex_request_id=X"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get a capex request
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        requests_list = response.json()
        
        if len(requests_list) == 0:
            pytest.skip("No capex requests available")
        
        capex_request_id = requests_list[0]["id"]
        
        # Get sample requests for this capex request
        response = requests.get(f"{BASE_URL}/api/sample-requests?capex_request_id={capex_request_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of sample requests"
        print(f"✓ Found {len(data)} sample requests for capex request {capex_request_id}")


class TestGoogleAuthEndpoint:
    """Google Auth endpoint tests"""
    
    def test_google_login_endpoint_exists(self):
        """Test POST /api/auth/google-login endpoint exists"""
        # This should return 400 without proper data, not 404
        response = requests.post(f"{BASE_URL}/api/auth/google-login", json={})
        # Should be 400 (bad request) not 404 (not found)
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Google login endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
