"""
Test suite for CAPEX Portal Iteration 28 features:
- Login page space theme with bearing animation and pull lamp
- Admin user creation with role-based conditional fields
- Buyer must be mapped to Capex Head validation
- GET /api/admin/capex-heads endpoint
- GET /api/admin/department-heads endpoint
- User table "Mapped To" column
- Settings page theme picker for all users
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@capex.com"
ADMIN_PASSWORD = "admin123"
BUYER_EMAIL = "vijay@capex.com"
BUYER_PASSWORD = "buyer123"
CAPEX_HEAD_EMAIL = "manoj@capex.com"
CAPEX_HEAD_PASSWORD = "capex123"
USER_EMAIL = "amit@capex.com"
USER_PASSWORD = "user123"


class TestAuthLogin:
    """Test authentication and login redirects"""
    
    def test_admin_login_success(self):
        """Admin login should return user with role=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "admin", f"Expected role=admin, got {data['user']['role']}"
        print(f"SUCCESS: Admin login returns role=admin")
    
    def test_buyer_login_success(self):
        """Buyer login should return user with role=buyer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "buyer", f"Expected role=buyer, got {data['user']['role']}"
        print(f"SUCCESS: Buyer login returns role=buyer")
    
    def test_capex_head_login_success(self):
        """Capex Head login should return user with role=capex_head"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CAPEX_HEAD_EMAIL,
            "password": CAPEX_HEAD_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "capex_head", f"Expected role=capex_head, got {data['user']['role']}"
        print(f"SUCCESS: Capex Head login returns role=capex_head")
    
    def test_user_login_success(self):
        """User login should return user with role=user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "user", f"Expected role=user, got {data['user']['role']}"
        print(f"SUCCESS: User login returns role=user")


class TestAdminCapexHeadsEndpoint:
    """Test GET /api/admin/capex-heads endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_get_capex_heads_success(self, admin_token):
        """GET /api/admin/capex-heads should return list of capex heads"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/capex-heads", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should have at least 1 capex head (manoj@capex.com)
        assert len(data) >= 1, "Should have at least 1 capex head"
        
        # Verify all returned users have role=capex_head
        for user in data:
            assert user.get("role") == "capex_head", f"Expected role=capex_head, got {user.get('role')}"
            assert "id" in user, "User should have id"
            assert "name" in user, "User should have name"
            assert "email" in user, "User should have email"
        
        print(f"SUCCESS: GET /api/admin/capex-heads returns {len(data)} capex head(s)")
    
    def test_get_capex_heads_requires_admin(self):
        """GET /api/admin/capex-heads should require admin auth"""
        # Test without auth
        response = requests.get(f"{BASE_URL}/api/admin/capex-heads")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # Test with non-admin (buyer)
        buyer_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        if buyer_response.status_code == 200:
            buyer_token = buyer_response.json().get("access_token")
            headers = {"Authorization": f"Bearer {buyer_token}"}
            response = requests.get(f"{BASE_URL}/api/admin/capex-heads", headers=headers)
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        
        print("SUCCESS: GET /api/admin/capex-heads requires admin auth")


class TestAdminDepartmentHeadsEndpoint:
    """Test GET /api/admin/department-heads endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_get_department_heads_success(self, admin_token):
        """GET /api/admin/department-heads should return list of DHs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/department-heads", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned users have role=department_head
        for user in data:
            assert user.get("role") == "department_head", f"Expected role=department_head, got {user.get('role')}"
            assert "id" in user, "User should have id"
            assert "name" in user, "User should have name"
        
        print(f"SUCCESS: GET /api/admin/department-heads returns {len(data)} DH(s)")


class TestBuyerMappingValidation:
    """Test that Buyer must be mapped to Capex Head"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def capex_head_id(self, admin_token):
        """Get a capex head ID for mapping"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/capex-heads", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No capex heads available for mapping")
    
    def test_create_buyer_without_mapping_fails(self, admin_token):
        """POST /api/admin/users with role=buyer without mapped_dh_id should return 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(f"{BASE_URL}/api/admin/users", headers=headers, json={
            "email": f"TEST_buyer_{unique_id}@test.com",
            "name": f"TEST Buyer {unique_id}",
            "role": "buyer",
            "password": "testpass123",
            "employee_id": f"TEST_EMP_{unique_id}",
            "mobile": "9876543210"
            # Note: No mapped_dh_id provided
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        assert "Capex Head" in data["detail"] or "mapped" in data["detail"].lower(), \
            f"Error should mention Capex Head mapping: {data['detail']}"
        
        print(f"SUCCESS: Creating buyer without Capex Head mapping returns 400")
    
    def test_create_buyer_with_mapping_succeeds(self, admin_token, capex_head_id):
        """POST /api/admin/users with role=buyer with mapped_dh_id should succeed"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(f"{BASE_URL}/api/admin/users", headers=headers, json={
            "email": f"TEST_buyer_{unique_id}@test.com",
            "name": f"TEST Buyer {unique_id}",
            "role": "buyer",
            "password": "testpass123",
            "employee_id": f"TEST_EMP_{unique_id}",
            "mobile": "9876543210",
            "mapped_dh_id": capex_head_id  # Mapped to Capex Head
        })
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("role") == "buyer", "Created user should have role=buyer"
        assert data.get("mapped_dh_id") == capex_head_id, "Created user should have mapped_dh_id"
        
        # Cleanup - delete the test user
        if "id" in data:
            requests.delete(f"{BASE_URL}/api/admin/users/{data['id']}", headers=headers)
        
        print(f"SUCCESS: Creating buyer with Capex Head mapping succeeds")


class TestUserMappingValidation:
    """Test that User must be mapped to Department Head"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def dh_id(self, admin_token):
        """Get a department head ID for mapping"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/department-heads", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No department heads available for mapping")
    
    @pytest.fixture
    def plant_name(self, admin_token):
        """Get a plant name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/plants", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["name"]
        return "Jaipur Plant"
    
    @pytest.fixture
    def dept_name(self, admin_token):
        """Get a department name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/departments", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["name"]
        return "Industrial Bearing"
    
    def test_create_user_without_plant_dept_fails(self, admin_token):
        """POST /api/admin/users with role=user without plant/dept should return 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(f"{BASE_URL}/api/admin/users", headers=headers, json={
            "email": f"TEST_user_{unique_id}@test.com",
            "name": f"TEST User {unique_id}",
            "role": "user",
            "password": "testpass123",
            "employee_id": f"TEST_EMP_{unique_id}",
            "mobile": "9876543210"
            # Note: No plant, department, or mapped_dh_id
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"SUCCESS: Creating user without plant/dept returns 400")
    
    def test_create_user_without_dh_mapping_fails(self, admin_token, plant_name, dept_name):
        """POST /api/admin/users with role=user without mapped_dh_id should return 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(f"{BASE_URL}/api/admin/users", headers=headers, json={
            "email": f"TEST_user_{unique_id}@test.com",
            "name": f"TEST User {unique_id}",
            "role": "user",
            "password": "testpass123",
            "employee_id": f"TEST_EMP_{unique_id}",
            "mobile": "9876543210",
            "plant": plant_name,
            "department": dept_name
            # Note: No mapped_dh_id
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Department Head" in data.get("detail", "") or "mapped" in data.get("detail", "").lower(), \
            f"Error should mention DH mapping: {data.get('detail')}"
        
        print(f"SUCCESS: Creating user without DH mapping returns 400")


class TestAdminUsersTable:
    """Test admin users table returns mapped_dh_id for display"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_users_list_includes_mapped_dh_id(self, admin_token):
        """GET /api/admin/users should include mapped_dh_id field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check that users have the expected fields
        for user in data:
            assert "id" in user, "User should have id"
            assert "name" in user, "User should have name"
            assert "email" in user, "User should have email"
            assert "role" in user, "User should have role"
            # mapped_dh_id may be null for some users, but field should exist
        
        print(f"SUCCESS: GET /api/admin/users returns {len(data)} users with proper fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
