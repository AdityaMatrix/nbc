"""
Test suite for verifying all API endpoints work correctly after backend refactoring.
The backend was refactored from a single 2539-line server.py into modular route files.
This test verifies all routes are properly connected and functional.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_CREDENTIALS = {
    "capex_head": {"email": "manoj@capex.com", "password": "capex123"},
    "buyer": {"email": "vijay@capex.com", "password": "buyer123"},
    "department_head": {"email": "rajesh@capex.com", "password": "depthead123"},
    "process_engineer": {"email": "rahul@capex.com", "password": "process123"},
    "user": {"email": "amit@capex.com", "password": "user123"},
}


class TestHealthEndpoint:
    """Test health check endpoint - routes/server.py"""
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")


class TestAuthRoutes:
    """Test authentication endpoints - routes/auth.py"""
    
    def test_login_capex_head(self):
        """Test Capex Head login"""
        creds = TEST_CREDENTIALS["capex_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        assert response.status_code == 200, f"Capex Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == creds["email"]
        assert data["user"]["role"] == "capex_head"
        print(f"✓ Capex Head login passed: {data['user']['name']}")
        return data["access_token"]
    
    def test_login_buyer(self):
        """Test Buyer login"""
        creds = TEST_CREDENTIALS["buyer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "buyer"
        print(f"✓ Buyer login passed: {data['user']['name']}")
        return data["access_token"]
    
    def test_login_department_head(self):
        """Test Department Head login"""
        creds = TEST_CREDENTIALS["department_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        assert response.status_code == 200, f"DH login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "department_head"
        print(f"✓ Department Head login passed: {data['user']['name']}")
        return data["access_token"]
    
    def test_login_process_engineer(self):
        """Test Process Engineer login"""
        creds = TEST_CREDENTIALS["process_engineer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        assert response.status_code == 200, f"PE login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "process_engineering"
        print(f"✓ Process Engineer login passed: {data['user']['name']}")
        return data["access_token"]
    
    def test_login_user(self):
        """Test User login"""
        creds = TEST_CREDENTIALS["user"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "user"
        print(f"✓ User login passed: {data['user']['name']}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint"""
        # First login
        creds = TEST_CREDENTIALS["capex_head"]
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        token = login_resp.json()["access_token"]
        
        # Then get current user
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert data["email"] == creds["email"]
        print(f"✓ Auth/me endpoint passed: {data['name']}")


class TestCapexRequestsRoutes:
    """Test capex requests endpoints - routes/requests.py"""
    
    @pytest.fixture
    def capex_head_token(self):
        creds = TEST_CREDENTIALS["capex_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        creds = TEST_CREDENTIALS["buyer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def dh_token(self):
        creds = TEST_CREDENTIALS["department_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def user_token(self):
        creds = TEST_CREDENTIALS["user"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    def test_get_capex_requests_capex_head(self, capex_head_token):
        """Test GET /capex-requests as Capex Head (sees all)"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Capex Head sees {len(data)} requests")
        return data
    
    def test_get_capex_requests_buyer(self, buyer_token):
        """Test GET /capex-requests as Buyer (filtered view)"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Buyer sees {len(data)} requests")
    
    def test_get_capex_requests_dh(self, dh_token):
        """Test GET /capex-requests as Department Head (department filtered)"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Department Head sees {len(data)} requests")
    
    def test_get_capex_requests_user(self, user_token):
        """Test GET /capex-requests as User (own requests only)"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ User sees {len(data)} requests")


class TestAnalyticsRoutes:
    """Test analytics endpoints - routes/analytics.py"""
    
    @pytest.fixture
    def capex_head_token(self):
        creds = TEST_CREDENTIALS["capex_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        creds = TEST_CREDENTIALS["buyer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    def test_dashboard_analytics_capex_head(self, capex_head_token):
        """Test GET /analytics/dashboard as Capex Head"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_requests" in data
        assert "status_breakdown" in data
        assert "cost_savings" in data
        print(f"✓ Analytics dashboard passed: {data['total_requests']} total requests, savings: {data.get('cost_savings', 0)}")
    
    def test_dashboard_analytics_buyer(self, buyer_token):
        """Test GET /analytics/dashboard as Buyer"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_requests" in data
        print(f"✓ Buyer analytics passed: {data['total_requests']} requests")


class TestNotificationsRoutes:
    """Test notifications endpoints - routes/notifications.py"""
    
    @pytest.fixture
    def capex_head_token(self):
        creds = TEST_CREDENTIALS["capex_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        creds = TEST_CREDENTIALS["buyer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def dh_token(self):
        creds = TEST_CREDENTIALS["department_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    def test_get_notifications_capex_head(self, capex_head_token):
        """Test GET /notifications as Capex Head (includes dynamic notifications)"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Check for dynamic notifications
        dynamic_count = len([n for n in data if n.get("is_dynamic")])
        print(f"✓ Capex Head notifications: {len(data)} total, {dynamic_count} dynamic")
    
    def test_get_notifications_buyer(self, buyer_token):
        """Test GET /notifications as Buyer"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Buyer notifications: {len(data)} total")
    
    def test_get_notifications_dh(self, dh_token):
        """Test GET /notifications as Department Head"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ DH notifications: {len(data)} total")


class TestSampleRequestsRoutes:
    """Test sample requests endpoints - routes/samples.py"""
    
    @pytest.fixture
    def buyer_token(self):
        creds = TEST_CREDENTIALS["buyer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    def test_get_sample_requests(self, buyer_token):
        """Test GET /sample-requests"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/sample-requests", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sample requests: {len(data)} found")


class TestReferenceRoutes:
    """Test reference data endpoints - routes/reference.py (no auth required)"""
    
    def test_get_plants(self):
        """Test GET /reference/plants"""
        response = requests.get(f"{BASE_URL}/api/reference/plants")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Plants: {len(data)} found - {data[:3]}...")
    
    def test_get_departments(self):
        """Test GET /reference/departments"""
        response = requests.get(f"{BASE_URL}/api/reference/departments")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Departments: {len(data)} found")
    
    def test_get_cea_stages(self):
        """Test GET /reference/cea-stages"""
        response = requests.get(f"{BASE_URL}/api/reference/cea-stages")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ CEA stages: {len(data)} found")
    
    def test_get_workflow_stages(self):
        """Test GET /reference/workflow-stages"""
        response = requests.get(f"{BASE_URL}/api/reference/workflow-stages")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Workflow stages: {len(data)} found")


class TestUsersRoutes:
    """Test users endpoints - routes/users.py"""
    
    @pytest.fixture
    def capex_head_token(self):
        creds = TEST_CREDENTIALS["capex_head"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        creds = TEST_CREDENTIALS["buyer"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    @pytest.fixture
    def user_token(self):
        creds = TEST_CREDENTIALS["user"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        return response.json()["access_token"]
    
    def test_get_users_capex_head(self, capex_head_token):
        """Test GET /users as Capex Head (authorized)"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Users list (Capex Head): {len(data)} users")
    
    def test_get_users_buyer(self, buyer_token):
        """Test GET /users as Buyer (authorized)"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Users list (Buyer): {len(data)} users")
    
    def test_get_users_unauthorized(self, user_token):
        """Test GET /users as regular User (should be forbidden)"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Users list correctly forbidden for regular user")
    
    def test_get_buyers_list(self, capex_head_token):
        """Test GET /users/buyers"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/users/buyers", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned users should be buyers or capex_head
        for user in data:
            assert user["role"] in ["buyer", "capex_head"], f"Unexpected role: {user['role']}"
        print(f"✓ Buyers list: {len(data)} buyers/capex_heads")


class TestAllRolesCapexRequestsAccess:
    """Test that all 5 roles can access capex-requests endpoint correctly"""
    
    def test_all_roles_can_access_requests(self):
        """Verify all 5 roles can login and access capex-requests"""
        results = {}
        
        for role_name, creds in TEST_CREDENTIALS.items():
            # Login
            login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
            assert login_resp.status_code == 200, f"{role_name} login failed: {login_resp.text}"
            token = login_resp.json()["access_token"]
            
            # Get requests
            headers = {"Authorization": f"Bearer {token}"}
            req_resp = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
            assert req_resp.status_code == 200, f"{role_name} capex-requests failed: {req_resp.text}"
            
            results[role_name] = len(req_resp.json())
            print(f"✓ {role_name}: login OK, sees {results[role_name]} requests")
        
        print(f"\n✓ All 5 roles verified: {results}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
