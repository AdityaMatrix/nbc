"""
Test Access Control Panel - Iteration 38
Tests backend APIs for access control, preview mode, and permissions
"""
import pytest
import requests

BASE_URL = "https://capex-portal-3.preview.emergentagent.com"

class TestAccessControlConfig:
    """Tests for /api/admin/access-config endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin to get token"""
        self.admin_token = None
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
    
    def test_get_access_config_returns_3_modules(self):
        """Test 1: GET /api/admin/access-config returns 3 modules with 31 items total"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify 3 modules
        assert "modules" in data, "Missing modules key"
        modules = data["modules"]
        assert len(modules) == 3, f"Expected 3 modules, got {len(modules)}"
        
        # Verify module IDs
        module_ids = [m["id"] for m in modules]
        assert "dashboard" in module_ids, "Missing dashboard module"
        assert "capex_request" in module_ids, "Missing capex_request module"
        assert "analytics" in module_ids, "Missing analytics module"
        
        # Count total items
        total_items = sum(len(m.get("items", [])) for m in modules)
        assert total_items == 31, f"Expected 31 items total, got {total_items}"
        print(f"✓ Access config has 3 modules with {total_items} items")


class TestBuyerPermissions:
    """Tests for buyer role permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as buyer to get token"""
        self.buyer_token = None
        
        # Login as buyer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        if response.status_code == 200:
            self.buyer_token = response.json().get("access_token")
    
    def test_buyer_permissions_endpoint(self):
        """Test 2: GET /api/access/permissions for buyer returns correct visible/hidden items"""
        if not self.buyer_token:
            pytest.skip("Buyer login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/access/permissions",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify dashboard permissions for buyer
        assert "dashboard" in data, "Missing dashboard module"
        dashboard = data["dashboard"]
        
        # Buyer should see these cards
        assert dashboard.get("card_cost_savings") != "hidden", "Buyer should see Cost Savings"
        assert dashboard.get("card_my_assigned") != "hidden", "Buyer should see My Assigned"
        assert dashboard.get("card_completed") != "hidden", "Buyer should see Completed"
        assert dashboard.get("card_in_progress") != "hidden", "Buyer should see In Progress"
        assert dashboard.get("card_purchase_value") != "hidden", "Buyer should see Purchase Value"
        
        # Buyer should NOT see these cards (capex_head only)
        assert dashboard.get("card_budget_utilized") == "hidden", "Buyer should NOT see Budget Utilized"
        assert dashboard.get("card_completion_rate") == "hidden", "Buyer should NOT see Completion Rate"
        
        print("✓ Buyer permissions are correct")


class TestPreviewModeAPI:
    """Tests for /api/admin/access-config/preview/{role_id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and buyer"""
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
        """Test 4: GET /api/admin/access-config/preview/buyer returns correct buyer permissions"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify dashboard permissions for buyer preview
        assert "dashboard" in data, "Missing dashboard module"
        dashboard = data["dashboard"]
        
        # Buyer should see these cards
        assert dashboard.get("card_cost_savings") != "hidden", "Buyer preview should see Cost Savings"
        assert dashboard.get("card_my_assigned") != "hidden", "Buyer preview should see My Assigned"
        assert dashboard.get("card_completed") != "hidden", "Buyer preview should see Completed"
        assert dashboard.get("card_in_progress") != "hidden", "Buyer preview should see In Progress"
        assert dashboard.get("card_purchase_value") != "hidden", "Buyer preview should see Purchase Value"
        
        # Buyer should NOT see these cards
        assert dashboard.get("card_budget_utilized") == "hidden", "Buyer preview should NOT see Budget Utilized"
        assert dashboard.get("card_completion_rate") == "hidden", "Buyer preview should NOT see Completion Rate"
        
        print("✓ Preview buyer permissions are correct")
    
    def test_preview_capex_head_permissions(self):
        """Test 5: GET /api/admin/access-config/preview/capex_head returns correct capex_head permissions (4 stat cards visible)"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/capex_head",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify dashboard permissions for capex_head preview
        assert "dashboard" in data, "Missing dashboard module"
        dashboard = data["dashboard"]
        
        # Capex Head should see these 4 stat cards
        assert dashboard.get("card_budget_utilized") != "hidden", "Capex Head should see Budget Utilized"
        assert dashboard.get("card_pending_approvals") != "hidden", "Capex Head should see Pending Approvals"
        assert dashboard.get("card_cost_savings") != "hidden", "Capex Head should see Cost Savings"
        assert dashboard.get("card_completion_rate") != "hidden", "Capex Head should see Completion Rate"
        
        # Count visible stat cards for capex_head
        stat_cards = ["card_budget_utilized", "card_pending_approvals", "card_cost_savings", "card_completion_rate"]
        visible_count = sum(1 for card in stat_cards if dashboard.get(card) != "hidden")
        assert visible_count == 4, f"Expected 4 visible stat cards for capex_head, got {visible_count}"
        
        print("✓ Preview capex_head permissions are correct (4 stat cards visible)")
    
    def test_preview_requires_admin(self):
        """Test: Non-admin gets 403 on preview endpoint"""
        if not self.buyer_token:
            pytest.skip("Buyer login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Preview endpoint correctly requires admin access")


class TestAccessConfigUpdate:
    """Tests for updating access config"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.admin_token = None
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
    
    def test_toggle_item_for_role(self):
        """Test 3: Admin removes 'buyer' from card_cost_savings via PUT → buyer permissions show card_cost_savings as hidden"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # First, get current config
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        config = response.json()
        
        # Modify: remove 'buyer' from card_cost_savings roles
        modules_update = []
        for module in config["modules"]:
            items_update = []
            for item in module["items"]:
                roles = item.get("roles", [])
                if item["id"] == "card_cost_savings":
                    # Remove buyer from roles
                    roles = [r for r in roles if r != "buyer"]
                items_update.append({
                    "id": item["id"],
                    "enabled": item.get("enabled", True),
                    "permission": item.get("permission", "view"),
                    "roles": roles,
                    "user_overrides": item.get("user_overrides", [])
                })
            modules_update.append({
                "id": module["id"],
                "enabled": module.get("enabled", True),
                "items": items_update
            })
        
        # PUT the updated config
        response = requests.put(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"modules": modules_update}
        )
        assert response.status_code == 200, f"PUT failed: {response.status_code}"
        
        # Verify: preview buyer should now show card_cost_savings as hidden
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["dashboard"]["card_cost_savings"] == "hidden", "card_cost_savings should be hidden for buyer after toggle"
        print("✓ Toggle item for role works correctly")
        
        # Reset to defaults
        response = requests.post(
            f"{BASE_URL}/api/admin/access-config/reset",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, "Reset failed"
        print("✓ Reset to defaults successful")


class TestResetToDefaults:
    """Tests for reset functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.admin_token = None
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
    
    def test_reset_restores_defaults(self):
        """Test 13: Reset to defaults restores all items"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Reset to defaults
        response = requests.post(
            f"{BASE_URL}/api/admin/access-config/reset",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Reset failed: {response.status_code}"
        
        # Verify config is back to defaults
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        config = response.json()
        
        # Check that buyer has card_cost_savings
        dashboard_module = next((m for m in config["modules"] if m["id"] == "dashboard"), None)
        assert dashboard_module is not None
        
        cost_savings_item = next((i for i in dashboard_module["items"] if i["id"] == "card_cost_savings"), None)
        assert cost_savings_item is not None
        assert "buyer" in cost_savings_item.get("roles", []), "buyer should have card_cost_savings after reset"
        
        print("✓ Reset to defaults restores all items correctly")
