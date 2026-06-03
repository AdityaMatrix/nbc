"""
CAPEX Portal Backend API Tests
Tests for: Login, Admin Dashboard, Sample Requests
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://capex-portal-3.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"email": "admin@capex.com", "password": "admin123"}
BUYER_CREDS = {"email": "vijay@capex.com", "password": "buyer123"}
CAPEX_HEAD_CREDS = {"email": "manoj@capex.com", "password": "capex123"}
DEPT_HEAD_CREDS = {"email": "rajesh@capex.com", "password": "dh123"}


class TestAuthLogin:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login returns token and correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        assert data["user"]["email"] == "admin@capex.com"
        print(f"✓ Admin login success: {data['user']['email']} with role {data['user']['role']}")
    
    def test_buyer_login_success(self):
        """Test buyer login returns token and correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "buyer"
        assert data["user"]["email"] == "vijay@capex.com"
        print(f"✓ Buyer login success: {data['user']['email']} with role {data['user']['role']}")
    
    def test_capex_head_login_success(self):
        """Test capex head login returns token and correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CAPEX_HEAD_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "capex_head"
        print(f"✓ Capex Head login success: {data['user']['email']}")
    
    def test_dept_head_login_success(self):
        """Test department head login returns token and correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEPT_HEAD_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "department_head"
        print(f"✓ Dept Head login success: {data['user']['email']}")
    
    def test_invalid_credentials_rejected(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@capex.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")


class TestAdminEndpoints:
    """Admin dashboard API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        return response.json()["access_token"]
    
    def test_admin_stats(self, admin_token):
        """Test GET /api/admin/stats returns dashboard statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify all expected fields
        assert "total_users" in data, "Missing total_users"
        assert "total_requests" in data, "Missing total_requests"
        assert "total_plants" in data, "Missing total_plants"
        assert "total_departments" in data, "Missing total_departments"
        assert "pending_resets" in data, "Missing pending_resets"
        assert "role_breakdown" in data, "Missing role_breakdown"
        print(f"✓ Admin stats: {data['total_users']} users, {data['total_requests']} requests, {data['total_plants']} plants")
    
    def test_admin_plants_list(self, admin_token):
        """Test GET /api/admin/plants returns plant list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/plants", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of plants"
        assert len(data) > 0, "Expected at least one plant"
        print(f"✓ Admin plants: {len(data)} plants found")
    
    def test_admin_departments_list(self, admin_token):
        """Test GET /api/admin/departments returns department list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/departments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin departments: {len(data)} departments found")
    
    def test_admin_users_list(self, admin_token):
        """Test GET /api/admin/users returns user list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one user"
        # Verify user structure
        user = data[0]
        assert "email" in user
        assert "role" in user
        print(f"✓ Admin users: {len(data)} users found")
    
    def test_admin_password_reset_requests(self, admin_token):
        """Test GET /api/admin/password-reset-requests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/password-reset-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin password reset requests: {len(data)} requests")
    
    def test_non_admin_blocked_from_admin_apis(self, buyer_token):
        """Test non-admin users cannot access admin endpoints"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-admin correctly blocked from admin APIs with 403")


class TestForgotPassword:
    """Forgot password flow tests"""
    
    def test_forgot_password_endpoint(self):
        """Test POST /api/auth/forgot-password"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "test@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Forgot password endpoint works")


class TestCapexRequests:
    """CAPEX request tests"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        return response.json()["access_token"]
    
    def test_get_capex_requests(self, buyer_token):
        """Test GET /api/capex-requests returns list"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ CAPEX requests: {len(data)} requests found")
        return data


class TestSampleRequests:
    """Sample request tests"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def capex_head_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CAPEX_HEAD_CREDS)
        return response.json()["access_token"]
    
    def test_get_sample_requests(self, buyer_token):
        """Test GET /api/sample-requests"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sample requests: {len(data)} found")


class TestGoogleLogin:
    """Google login endpoint test"""
    
    def test_google_login_endpoint_exists(self):
        """Test POST /api/auth/google-login endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/google-login", json={
            "email": "test@gmail.com",
            "name": "Test User",
            "google_id": "test123"
        })
        # Should return 200 (creates user) or 400 (validation error), not 404
        assert response.status_code in [200, 400, 422], f"Expected 200/400/422, got {response.status_code}"
        print(f"✓ Google login endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
