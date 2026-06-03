"""
Test Access Control Preview Mode API
Tests the preview endpoint and role-based permissions for preview mode feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPreviewModeAPI:
    """Tests for /api/admin/access-config/preview/{role_id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin to get token"""
        self.admin_token = None
        self.buyer_token = None
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
        
        # Login as buyer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        if response.status_code == 200:
            self.buyer_token = response.json().get("access_token")
    
    def test_preview_buyer_permissions(self):
        """Test GET /api/admin/access-config/preview/buyer returns correct permissions"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify structure - should have dashboard, capex_request, analytics modules
        assert "dashboard" in data, "Missing dashboard module"
        assert "capex_request" in data, "Missing capex_request module"
        assert "analytics" in data, "Missing analytics module"
        
        # Buyer should have access to these dashboard cards
        dashboard = data["dashboard"]
        assert dashboard.get("card_cost_savings") != "hidden", "Buyer should see Cost Savings"
        assert dashboard.get("card_my_assigned") != "hidden", "Buyer should see My Assigned"
        assert dashboard.get("card_completed") != "hidden", "Buyer should see Completed"
        assert dashboard.get("card_in_progress") != "hidden", "Buyer should see In Progress"
        assert dashboard.get("card_purchase_value") != "hidden", "Buyer should see Purchase Value"
        
        # Buyer should NOT have access to these (Capex Head only)
        assert dashboard.get("card_budget_utilized") == "hidden", "Buyer should NOT see Budget Utilized"
        assert dashboard.get("card_completion_rate") == "hidden", "Buyer should NOT see Completion Rate"
        
        print(f"Buyer preview permissions: {data}")
    
    def test_preview_user_permissions(self):
        """Test GET /api/admin/access-config/preview/user returns correct permissions"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/user",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # User should have access to these
        dashboard = data["dashboard"]
        assert dashboard.get("card_dept_requests") != "hidden", "User should see Dept Requests"
        assert dashboard.get("card_my_requests") != "hidden", "User should see My Requests"
        assert dashboard.get("card_pending_approvals") != "hidden", "User should see Pending Approvals"
        assert dashboard.get("card_completed") != "hidden", "User should see Completed"
        
        # User should NOT have access to buyer-specific cards
        assert dashboard.get("card_my_assigned") == "hidden", "User should NOT see My Assigned"
        assert dashboard.get("card_purchase_value") == "hidden", "User should NOT see Purchase Value"
        
        print(f"User preview permissions: {data}")
    
    def test_preview_capex_head_permissions(self):
        """Test GET /api/admin/access-config/preview/capex_head returns correct permissions"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/capex_head",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Capex Head should have access to executive dashboard cards
        dashboard = data["dashboard"]
        assert dashboard.get("card_budget_utilized") != "hidden", "Capex Head should see Budget Utilized"
        assert dashboard.get("card_pending_approvals") != "hidden", "Capex Head should see Pending Approvals"
        assert dashboard.get("card_cost_savings") != "hidden", "Capex Head should see Cost Savings"
        assert dashboard.get("card_completion_rate") != "hidden", "Capex Head should see Completion Rate"
        
        # Capex Head should see analytics charts
        assert dashboard.get("dept_spend_chart") != "hidden", "Capex Head should see Dept Spend Chart"
        assert dashboard.get("buyer_performance_chart") != "hidden", "Capex Head should see Buyer Performance Chart"
        
        print(f"Capex Head preview permissions: {data}")
    
    def test_preview_department_head_permissions(self):
        """Test GET /api/admin/access-config/preview/department_head returns correct permissions"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/department_head",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # DH should have access to department-level cards
        dashboard = data["dashboard"]
        assert dashboard.get("card_dept_requests") != "hidden", "DH should see Dept Requests"
        assert dashboard.get("card_completed") != "hidden", "DH should see Completed"
        assert dashboard.get("card_in_progress") != "hidden", "DH should see In Progress"
        assert dashboard.get("card_pending_approvals") != "hidden", "DH should see Pending Approvals"
        
        # DH should NOT see buyer-specific cards
        assert dashboard.get("card_my_assigned") == "hidden", "DH should NOT see My Assigned"
        assert dashboard.get("card_purchase_value") == "hidden", "DH should NOT see Purchase Value"
        
        print(f"Department Head preview permissions: {data}")
    
    def test_preview_requires_admin(self):
        """Test that preview endpoint requires admin role"""
        if not self.buyer_token:
            pytest.skip("Buyer login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Non-admin correctly denied access to preview endpoint")
    
    def test_preview_invalid_role(self):
        """Test preview with invalid role returns empty permissions"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/invalid_role",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Invalid role should have all items hidden
        dashboard = data.get("dashboard", {})
        for item_id, perm in dashboard.items():
            assert perm == "hidden", f"Invalid role should have {item_id} hidden"
        
        print("Invalid role correctly gets all items hidden")


class TestAccessControlConfig:
    """Tests for access control configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.admin_token = None
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
    
    def test_get_access_config(self):
        """Test GET /api/admin/access-config returns full config"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "modules" in data
        assert len(data["modules"]) == 3, "Should have 3 modules"
        
        module_ids = [m["id"] for m in data["modules"]]
        assert "dashboard" in module_ids
        assert "capex_request" in module_ids
        assert "analytics" in module_ids
        
        # Verify dashboard has expected items
        dashboard = next(m for m in data["modules"] if m["id"] == "dashboard")
        item_ids = [i["id"] for i in dashboard["items"]]
        
        expected_cards = [
            "card_budget_utilized", "card_pending_approvals", "card_cost_savings",
            "card_completion_rate", "card_dept_requests", "card_my_requests",
            "card_completed", "card_in_progress", "card_my_assigned", "card_purchase_value"
        ]
        for card in expected_cards:
            assert card in item_ids, f"Missing {card} in dashboard items"
        
        print(f"Access config has {len(data['modules'])} modules with correct structure")
    
    def test_reset_access_config(self):
        """Test POST /api/admin/access-config/reset restores defaults"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/access-config/reset",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("Access config reset successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
