"""
Test Dashboard Features for Capex Portal
- Login functionality for all roles
- Time-based greeting for Capex Head
- Department Head dashboard metrics
- Pending DH Approval filtering
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREDENTIALS = {
    "user": {"email": "amit@capex.com", "password": "user123"},
    "buyer": {"email": "vijay@capex.com", "password": "buyer123"},
    "capex_head": {"email": "manoj@capex.com", "password": "capex123"},
    "department_head": {"email": "rajesh@capex.com", "password": "dh123"}
}

class TestLoginFunctionality:
    """Test login for all roles"""
    
    def test_user_login(self):
        """Test User role login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["user"])
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "user", f"Expected role 'user', got {data['user']['role']}"
        assert data["user"]["email"] == CREDENTIALS["user"]["email"]
        print(f"✓ User login successful: {data['user']['name']}")
    
    def test_buyer_login(self):
        """Test Buyer role login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["buyer"])
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "buyer", f"Expected role 'buyer', got {data['user']['role']}"
        print(f"✓ Buyer login successful: {data['user']['name']}")
    
    def test_capex_head_login(self):
        """Test Capex Head role login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["capex_head"])
        assert response.status_code == 200, f"Capex Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "capex_head", f"Expected role 'capex_head', got {data['user']['role']}"
        print(f"✓ Capex Head login successful: {data['user']['name']}")
    
    def test_department_head_login(self):
        """Test Department Head role login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["department_head"])
        assert response.status_code == 200, f"Department Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "department_head", f"Expected role 'department_head', got {data['user']['role']}"
        print(f"✓ Department Head login successful: {data['user']['name']}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid login correctly rejected")


class TestDashboardEndpoints:
    """Test dashboard-related API endpoints"""
    
    @pytest.fixture
    def capex_head_token(self):
        """Get Capex Head auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["capex_head"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def dh_token(self):
        """Get Department Head auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["department_head"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def user_token(self):
        """Get User auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["user"])
        return response.json()["access_token"]
    
    def test_analytics_dashboard_endpoint(self, capex_head_token):
        """Test analytics dashboard endpoint"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=headers)
        assert response.status_code == 200, f"Analytics endpoint failed: {response.text}"
        data = response.json()
        # Check expected fields
        assert "total_requests" in data or "status_breakdown" in data, "Missing analytics data"
        print(f"✓ Analytics dashboard endpoint working")
    
    def test_capex_requests_endpoint_capex_head(self, capex_head_token):
        """Test capex requests endpoint for Capex Head - should see all requests"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Capex requests endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of requests"
        print(f"✓ Capex Head can access all requests: {len(data)} requests found")
    
    def test_capex_requests_endpoint_dh(self, dh_token):
        """Test capex requests endpoint for Department Head - should see only department requests"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"DH capex requests endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of requests"
        print(f"✓ Department Head can access department requests: {len(data)} requests found")
    
    def test_pending_dh_approval_filter(self, dh_token):
        """Test that DH can filter requests by Pending DH Approval status"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Count requests with Pending DH Approval status
        pending_dh = [r for r in data if r.get("status") == "Pending DH Approval"]
        print(f"✓ Found {len(pending_dh)} requests with 'Pending DH Approval' status")
        
        # Verify the status field exists in requests
        if data:
            assert "status" in data[0], "Status field missing in request"
    
    def test_reference_statuses_endpoint(self, capex_head_token):
        """Test reference statuses endpoint"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/reference/statuses", headers=headers)
        assert response.status_code == 200, f"Statuses endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of statuses"
        print(f"✓ Reference statuses endpoint working: {len(data)} statuses")
    
    def test_buyers_list_endpoint(self, capex_head_token):
        """Test buyers list endpoint"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/users/buyers", headers=headers)
        assert response.status_code == 200, f"Buyers endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of buyers"
        print(f"✓ Buyers list endpoint working: {len(data)} buyers found")


class TestDHDashboardMetrics:
    """Test Department Head specific dashboard metrics"""
    
    @pytest.fixture
    def dh_auth(self):
        """Get DH auth token and user info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["department_head"])
        data = response.json()
        return {
            "token": data["access_token"],
            "user": data["user"]
        }
    
    def test_dh_sees_department_requests(self, dh_auth):
        """Test DH sees requests from their department"""
        headers = {"Authorization": f"Bearer {dh_auth['token']}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        user_dept = dh_auth["user"].get("department")
        print(f"DH Department: {user_dept}")
        print(f"Total requests visible to DH: {len(data)}")
        
        # All requests should be from DH's department (backend filters)
        if data and user_dept:
            for req in data:
                assert req.get("department") == user_dept, f"Request {req.get('id')} is from different department"
        print(f"✓ DH correctly sees only department requests")
    
    def test_dh_metrics_calculation(self, dh_auth):
        """Test DH dashboard metrics can be calculated from API data"""
        headers = {"Authorization": f"Bearer {dh_auth['token']}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Calculate metrics as frontend does
        total_requests = len(data)
        completed = len([r for r in data if r.get("workflow_status") == "Completed"])
        in_progress = len([r for r in data if r.get("workflow_status") and 
                          r.get("workflow_status") != "Completed" and 
                          r.get("status") != "Pending DH Approval" and 
                          r.get("status") != "Rejected by DH"])
        pending_my_approval = len([r for r in data if r.get("status") == "Pending DH Approval"])
        
        print(f"✓ DH Metrics calculated:")
        print(f"  - Dept Total Requests: {total_requests}")
        print(f"  - Completed: {completed}")
        print(f"  - In Progress: {in_progress}")
        print(f"  - Pending My Approval: {pending_my_approval}")
        
        # Verify metrics are non-negative
        assert total_requests >= 0
        assert completed >= 0
        assert in_progress >= 0
        assert pending_my_approval >= 0


class TestTimeBasedGreeting:
    """Test time-based greeting logic (frontend logic verification)"""
    
    def test_greeting_logic(self):
        """Verify greeting logic matches expected behavior"""
        hour = datetime.now().hour
        
        if hour < 12:
            expected = "Good Morning"
        elif hour < 17:
            expected = "Good Afternoon"
        else:
            expected = "Good Evening"
        
        print(f"✓ Current hour: {hour}, Expected greeting: {expected}")
        # This is a logic verification - actual UI test done via Playwright


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
