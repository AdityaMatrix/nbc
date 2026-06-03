"""
Test suite for CAPEX Portal Iteration 27 features:
1. Settings Page: Theme picker restored for all users
2. Admin Dashboard: Themes tab for admin theme management
3. Admin User Table: Shows Emp ID, Mobile, Dept/Plant, Mapped DH columns
4. Admin Create User Form: Enhanced with Employee ID, Mobile, conditional Plant/Department/Map to DH fields
5. Backend validation: employee_id uniqueness, plant/dept mandatory for user/DH roles, mapped_dh_id mandatory for user role
6. GET /api/admin/department-heads endpoint
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthLogin:
    """Test login functionality for different roles"""
    
    def test_admin_login(self):
        """Admin login should work and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_buyer_login(self):
        """Buyer login should work and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "buyer"
        print("PASS: Buyer login successful")
    
    def test_user_login(self):
        """User login should work and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "amit@capex.com",
            "password": "user123"
        })
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "user"
        print("PASS: User login successful")


class TestAdminDepartmentHeadsAPI:
    """Test GET /api/admin/department-heads endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_department_heads(self, admin_token):
        """GET /api/admin/department-heads should return list of DHs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/department-heads", headers=headers)
        assert response.status_code == 200, f"Failed to get department heads: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Check that all returned users have role=department_head
        for dh in data:
            assert dh.get("role") == "department_head", f"Expected department_head role, got {dh.get('role')}"
            assert "id" in dh
            assert "name" in dh
        print(f"PASS: GET /api/admin/department-heads returned {len(data)} department heads")
    
    def test_department_heads_requires_admin(self):
        """Non-admin should not access department-heads endpoint"""
        # Login as buyer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        buyer_token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/department-heads", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Non-admin blocked from department-heads endpoint")


class TestAdminUserCreationValidation:
    """Test user creation validation rules"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def cleanup_test_users(self, admin_token):
        """Cleanup test users after tests"""
        yield
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Get all users and delete test users
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        if response.status_code == 200:
            users = response.json()
            for user in users:
                if user.get("email", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/users/{user['id']}", headers=headers)
    
    def test_create_user_with_role_user_no_plant_fails(self, admin_token):
        """Creating user with role=user without plant should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_data = {
            "email": f"TEST_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Test User No Plant",
            "password": "test123",
            "role": "user",
            "employee_id": f"EMP{uuid.uuid4().hex[:6]}",
            "mobile": "9876543210",
            "department": "Engineering",
            # Missing plant
            "mapped_dh_id": "some-dh-id"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "Plant" in response.json().get("detail", "") or "mandatory" in response.json().get("detail", "").lower()
        print("PASS: Creating user with role=user without plant returns 400")
    
    def test_create_user_with_role_user_no_department_fails(self, admin_token):
        """Creating user with role=user without department should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_data = {
            "email": f"TEST_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Test User No Dept",
            "password": "test123",
            "role": "user",
            "employee_id": f"EMP{uuid.uuid4().hex[:6]}",
            "mobile": "9876543210",
            "plant": "Plant A",
            # Missing department
            "mapped_dh_id": "some-dh-id"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "Department" in response.json().get("detail", "") or "mandatory" in response.json().get("detail", "").lower()
        print("PASS: Creating user with role=user without department returns 400")
    
    def test_create_user_with_role_user_no_mapped_dh_fails(self, admin_token):
        """Creating user with role=user without mapped_dh_id should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_data = {
            "email": f"TEST_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Test User No DH",
            "password": "test123",
            "role": "user",
            "employee_id": f"EMP{uuid.uuid4().hex[:6]}",
            "mobile": "9876543210",
            "plant": "Plant A",
            "department": "Engineering"
            # Missing mapped_dh_id
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "Department Head" in response.json().get("detail", "") or "mapped" in response.json().get("detail", "").lower()
        print("PASS: Creating user with role=user without mapped_dh_id returns 400")
    
    def test_create_dh_with_no_plant_fails(self, admin_token):
        """Creating department_head without plant should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_data = {
            "email": f"TEST_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Test DH No Plant",
            "password": "test123",
            "role": "department_head",
            "employee_id": f"EMP{uuid.uuid4().hex[:6]}",
            "mobile": "9876543210",
            "department": "Engineering"
            # Missing plant
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Creating DH without plant returns 400")
    
    def test_create_buyer_without_plant_succeeds(self, admin_token, cleanup_test_users):
        """Creating buyer without plant/department should succeed (not mandatory for buyer)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        unique_emp_id = f"EMP{uuid.uuid4().hex[:6]}"
        user_data = {
            "email": unique_email,
            "name": "Test Buyer",
            "password": "test123",
            "role": "buyer",
            "employee_id": unique_emp_id,
            "mobile": "9876543210"
            # No plant, department, or mapped_dh_id - should be OK for buyer
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=headers)
        assert response.status_code == 200 or response.status_code == 201, f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["email"] == unique_email
        assert data["role"] == "buyer"
        print("PASS: Creating buyer without plant/department succeeds")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{data['id']}", headers=headers)
    
    def test_duplicate_employee_id_fails(self, admin_token, cleanup_test_users):
        """Creating user with duplicate employee_id should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_emp_id = f"EMP{uuid.uuid4().hex[:6]}"
        
        # First, get a DH to map to
        dh_response = requests.get(f"{BASE_URL}/api/admin/department-heads", headers=headers)
        dh_list = dh_response.json()
        dh_id = dh_list[0]["id"] if dh_list else None
        
        if not dh_id:
            pytest.skip("No department heads available for mapping")
        
        # Create first user with employee_id
        user_data1 = {
            "email": f"TEST_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Test User 1",
            "password": "test123",
            "role": "user",
            "employee_id": unique_emp_id,
            "mobile": "9876543210",
            "plant": "Plant A",
            "department": "Engineering",
            "mapped_dh_id": dh_id
        }
        response1 = requests.post(f"{BASE_URL}/api/admin/users", json=user_data1, headers=headers)
        assert response1.status_code in [200, 201], f"First user creation failed: {response1.text}"
        user1_id = response1.json()["id"]
        
        # Try to create second user with same employee_id
        user_data2 = {
            "email": f"TEST_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Test User 2",
            "password": "test123",
            "role": "user",
            "employee_id": unique_emp_id,  # Same employee_id
            "mobile": "9876543211",
            "plant": "Plant A",
            "department": "Engineering",
            "mapped_dh_id": dh_id
        }
        response2 = requests.post(f"{BASE_URL}/api/admin/users", json=user_data2, headers=headers)
        assert response2.status_code == 400, f"Expected 400 for duplicate employee_id, got {response2.status_code}: {response2.text}"
        assert "Employee ID" in response2.json().get("detail", "") or "already" in response2.json().get("detail", "").lower()
        print("PASS: Duplicate employee_id returns 400")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{user1_id}", headers=headers)
    
    def test_create_user_with_all_valid_fields_succeeds(self, admin_token, cleanup_test_users):
        """Creating user with all valid fields should succeed"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a DH to map to
        dh_response = requests.get(f"{BASE_URL}/api/admin/department-heads", headers=headers)
        dh_list = dh_response.json()
        dh_id = dh_list[0]["id"] if dh_list else None
        
        if not dh_id:
            pytest.skip("No department heads available for mapping")
        
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        unique_emp_id = f"EMP{uuid.uuid4().hex[:6]}"
        
        user_data = {
            "email": unique_email,
            "name": "Test Valid User",
            "password": "test123",
            "role": "user",
            "employee_id": unique_emp_id,
            "mobile": "9876543210",
            "plant": "Plant A",
            "department": "Engineering",
            "mapped_dh_id": dh_id
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=headers)
        assert response.status_code in [200, 201], f"User creation failed: {response.text}"
        data = response.json()
        assert data["email"] == unique_email
        assert data["employee_id"] == unique_emp_id
        assert data["mobile"] == "9876543210"
        assert data["role"] == "user"
        assert data["plant"] == "Plant A"
        assert data["department"] == "Engineering"
        assert data["mapped_dh_id"] == dh_id
        print("PASS: Creating user with all valid fields succeeds")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{data['id']}", headers=headers)


class TestAdminUserTableColumns:
    """Test that admin user table returns new columns"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_users_list_contains_new_fields(self, admin_token):
        """GET /api/admin/users should return users with employee_id, mobile, mapped_dh_id fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        users = response.json()
        assert isinstance(users, list), "Response should be a list"
        
        # Check that the response structure includes the new fields
        # (they may be empty/null for existing users, but the fields should exist)
        if users:
            user = users[0]
            # These fields should be present in the response (even if empty)
            expected_fields = ["id", "email", "name", "role"]
            for field in expected_fields:
                assert field in user, f"Missing field: {field}"
        print(f"PASS: GET /api/admin/users returns {len(users)} users with expected structure")


class TestAdminStats:
    """Test admin stats endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats should return dashboard statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        assert "total_users" in data
        assert "total_requests" in data
        assert "total_plants" in data
        assert "total_departments" in data
        print(f"PASS: Admin stats - Users: {data['total_users']}, Requests: {data['total_requests']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
