"""
CAPEX Portal Iteration 25 Tests
Testing: Login, Admin APIs, Sample Preparation API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthLogin:
    """Authentication endpoint tests"""
    
    def test_admin_login(self):
        """Test admin login returns token and redirects to /admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, role: {data['user']['role']}")
    
    def test_buyer_login(self):
        """Test buyer login returns token and redirects to /dashboard"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "buyer"
        print(f"✓ Buyer login successful, role: {data['user']['role']}")
    
    def test_capex_head_login(self):
        """Test capex head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manoj@capex.com",
            "password": "capex123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "capex_head"
        print(f"✓ Capex Head login successful")
    
    def test_dept_head_login(self):
        """Test department head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rajesh@capex.com",
            "password": "dh123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "department_head"
        print(f"✓ Department Head login successful")
    
    def test_user_login(self):
        """Test user login (amit@capex.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "amit@capex.com",
            "password": "user123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "user"
        print(f"✓ User login successful")
    
    def test_invalid_login(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@capex.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print(f"✓ Invalid login correctly returns 401")


class TestAdminAPIs:
    """Admin API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_admin_stats(self, admin_token):
        """Test GET /api/admin/stats returns stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_requests" in data
        assert "total_plants" in data
        assert "total_departments" in data
        print(f"✓ Admin stats: {data['total_users']} users, {data['total_requests']} requests")
    
    def test_admin_plants(self, admin_token):
        """Test GET /api/admin/plants returns plant list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/plants", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin plants: {len(data)} plants")
    
    def test_admin_departments(self, admin_token):
        """Test GET /api/admin/departments returns department list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/departments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin departments: {len(data)} departments")
    
    def test_admin_users(self, admin_token):
        """Test GET /api/admin/users returns user list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin users: {len(data)} users")
    
    def test_non_admin_blocked(self):
        """Test non-admin users are blocked from admin APIs"""
        # Login as buyer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        buyer_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Try to access admin stats
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403
        print(f"✓ Non-admin correctly blocked from admin APIs")


class TestSamplePreparationAPI:
    """Sample preparation API tests - for user/dept_head/process_eng roles"""
    
    @pytest.fixture
    def user_token(self):
        """Get user token (amit@capex.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "amit@capex.com",
            "password": "user123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        return response.json()["access_token"]
    
    def test_get_sample_requests(self, user_token):
        """Test GET /api/sample-requests returns sample list"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sample requests: {len(data)} samples found")
        return data
    
    def test_sample_preparation_endpoint_exists(self, user_token):
        """Test PUT /api/sample-requests/{id}/preparation endpoint exists"""
        headers = {"Authorization": f"Bearer {user_token}"}
        # First get sample requests
        response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        samples = response.json()
        
        if len(samples) > 0:
            sample_id = samples[0]["id"]
            # Test the preparation endpoint with Under Preparation status
            response = requests.put(
                f"{BASE_URL}/api/sample-requests/{sample_id}/preparation",
                headers=headers,
                json={"readiness_status": "Under Preparation"}
            )
            # Should be 200 or 403 (if role not allowed) - not 404
            assert response.status_code in [200, 403, 422]
            print(f"✓ Sample preparation endpoint exists, status: {response.status_code}")
        else:
            print("⚠ No samples found to test preparation endpoint")
            pytest.skip("No samples available for testing")
    
    def test_buyer_cannot_update_preparation(self, buyer_token):
        """Test buyer cannot update sample preparation (only user/dept_head/process_eng can)"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        # First get sample requests
        response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        samples = response.json()
        
        if len(samples) > 0:
            sample_id = samples[0]["id"]
            # Buyer should be blocked from preparation endpoint
            response = requests.put(
                f"{BASE_URL}/api/sample-requests/{sample_id}/preparation",
                headers=headers,
                json={"readiness_status": "Under Preparation"}
            )
            assert response.status_code == 403
            print(f"✓ Buyer correctly blocked from sample preparation")
        else:
            print("⚠ No samples found to test")
            pytest.skip("No samples available for testing")


class TestCapexRequests:
    """CAPEX Request API tests"""
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        return response.json()["access_token"]
    
    def test_get_capex_requests(self, buyer_token):
        """Test GET /api/capex-requests returns request list"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ CAPEX requests: {len(data)} requests found")
        return data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
