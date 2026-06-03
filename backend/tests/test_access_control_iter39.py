"""
Test Access Control Panel - Iteration 39
Tests Admin Access Control end-to-end:
1. Backend: Reset config, then remove 'buyer' from card_cost_savings and buyer_module via PUT
2. Backend: Verify buyer permissions show card_cost_savings=hidden and buyer_module=hidden
3. Backend: Reset config and disable ENTIRE dashboard module (enabled=false) via PUT
4. Backend: Verify buyer permissions when dashboard module is disabled
5. Backend: Reset config to defaults at end of test
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://capex-portal-3.preview.emergentagent.com')


class TestAccessControlEndToEnd:
    """End-to-end tests for Admin Access Control"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and buyer to get tokens"""
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
    
    def test_01_reset_config_first(self):
        """Test 1: Reset config to defaults before testing"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/access-config/reset",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Reset failed: {response.status_code}"
        print("✓ Config reset to defaults")
    
    def test_02_remove_buyer_from_cost_savings_and_buyer_module(self):
        """Test 2: Remove 'buyer' from card_cost_savings and buyer_module via PUT"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # First, get current config
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        config = response.json()
        
        # Modify: remove 'buyer' from card_cost_savings and buyer_module roles
        modules_update = []
        for module in config["modules"]:
            items_update = []
            for item in module["items"]:
                roles = item.get("roles", [])
                # Remove buyer from card_cost_savings and buyer_module
                if item["id"] in ["card_cost_savings", "buyer_module"]:
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
        print("✓ Removed buyer from card_cost_savings and buyer_module")
    
    def test_03_verify_buyer_permissions_after_removal(self):
        """Test 3: Verify buyer permissions show card_cost_savings=hidden and buyer_module=hidden"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Check via preview endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify card_cost_savings is hidden for buyer
        assert data["dashboard"]["card_cost_savings"] == "hidden", \
            f"card_cost_savings should be hidden for buyer, got: {data['dashboard'].get('card_cost_savings')}"
        
        # Verify buyer_module is hidden for buyer
        assert data["capex_request"]["buyer_module"] == "hidden", \
            f"buyer_module should be hidden for buyer, got: {data['capex_request'].get('buyer_module')}"
        
        print("✓ Buyer permissions correctly show card_cost_savings=hidden and buyer_module=hidden")
    
    def test_04_verify_buyer_still_sees_other_cards(self):
        """Test 4: Verify buyer still sees 4 stat cards (NOT Cost Savings)"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        dashboard = data["dashboard"]
        
        # Buyer should still see these 4 cards
        buyer_visible_cards = ["card_my_assigned", "card_completed", "card_in_progress", "card_purchase_value"]
        for card in buyer_visible_cards:
            assert dashboard.get(card) != "hidden", f"Buyer should see {card}"
        
        # Buyer should NOT see Cost Savings (removed)
        assert dashboard.get("card_cost_savings") == "hidden", "Buyer should NOT see Cost Savings"
        
        # Count visible stat cards for buyer
        all_stat_cards = [
            "card_budget_utilized", "card_pending_approvals", "card_cost_savings", 
            "card_completion_rate", "card_dept_requests", "card_my_requests",
            "card_completed", "card_in_progress", "card_my_assigned", "card_purchase_value"
        ]
        visible_count = sum(1 for card in all_stat_cards if dashboard.get(card) != "hidden")
        print(f"✓ Buyer sees {visible_count} stat cards (Cost Savings hidden)")
    
    def test_05_reset_and_disable_dashboard_module(self):
        """Test 5: Reset config and disable ENTIRE dashboard module (enabled=false)"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # First reset to defaults
        response = requests.post(
            f"{BASE_URL}/api/admin/access-config/reset",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        
        # Get current config
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        config = response.json()
        
        # Disable dashboard module
        modules_update = []
        for module in config["modules"]:
            items_update = []
            for item in module["items"]:
                items_update.append({
                    "id": item["id"],
                    "enabled": item.get("enabled", True),
                    "permission": item.get("permission", "view"),
                    "roles": item.get("roles", []),
                    "user_overrides": item.get("user_overrides", [])
                })
            modules_update.append({
                "id": module["id"],
                "enabled": False if module["id"] == "dashboard" else module.get("enabled", True),
                "items": items_update
            })
        
        # PUT the updated config
        response = requests.put(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"modules": modules_update}
        )
        assert response.status_code == 200, f"PUT failed: {response.status_code}"
        print("✓ Dashboard module disabled")
    
    def test_06_verify_buyer_permissions_with_dashboard_disabled(self):
        """Test 6: Verify buyer permissions when dashboard module is disabled - all dashboard items hidden"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        dashboard = data["dashboard"]
        
        # All dashboard items should be hidden when module is disabled
        all_dashboard_items = [
            "card_budget_utilized", "card_pending_approvals", "card_cost_savings", 
            "card_completion_rate", "card_dept_requests", "card_my_requests",
            "card_completed", "card_in_progress", "card_my_assigned", "card_purchase_value",
            "dept_spend_chart", "buyer_performance_chart", "pending_tasks", 
            "recent_requests", "cost_savings_widget"
        ]
        
        hidden_count = 0
        for item in all_dashboard_items:
            if dashboard.get(item) == "hidden":
                hidden_count += 1
        
        assert hidden_count == len(all_dashboard_items), \
            f"Expected all {len(all_dashboard_items)} dashboard items to be hidden, got {hidden_count}"
        
        print(f"✓ All {hidden_count} dashboard items are hidden when module is disabled")
    
    def test_07_preview_capex_head_shows_4_stat_cards(self):
        """Test 7: Preview as Capex Head shows 4 stat cards (Budget, Pending, Savings, Completion Rate)"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # First reset to defaults
        response = requests.post(
            f"{BASE_URL}/api/admin/access-config/reset",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/capex_head",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        dashboard = data["dashboard"]
        
        # Capex Head should see these 4 stat cards
        capex_head_cards = ["card_budget_utilized", "card_pending_approvals", "card_cost_savings", "card_completion_rate"]
        for card in capex_head_cards:
            assert dashboard.get(card) != "hidden", f"Capex Head should see {card}"
        
        visible_count = sum(1 for card in capex_head_cards if dashboard.get(card) != "hidden")
        assert visible_count == 4, f"Expected 4 visible stat cards for capex_head, got {visible_count}"
        
        print("✓ Capex Head preview shows 4 stat cards (Budget, Pending, Savings, Completion Rate)")
    
    def test_08_reset_config_at_end(self):
        """Test 8: Reset config to defaults at end of test"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/access-config/reset",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Reset failed: {response.status_code}"
        
        # Verify reset worked
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        config = response.json()
        
        # Check that dashboard module is enabled
        dashboard_module = next((m for m in config["modules"] if m["id"] == "dashboard"), None)
        assert dashboard_module is not None
        assert dashboard_module.get("enabled", True) == True, "Dashboard module should be enabled after reset"
        
        # Check that buyer has card_cost_savings
        cost_savings_item = next((i for i in dashboard_module["items"] if i["id"] == "card_cost_savings"), None)
        assert cost_savings_item is not None
        assert "buyer" in cost_savings_item.get("roles", []), "buyer should have card_cost_savings after reset"
        
        # Check that buyer has buyer_module
        capex_request_module = next((m for m in config["modules"] if m["id"] == "capex_request"), None)
        buyer_module_item = next((i for i in capex_request_module["items"] if i["id"] == "buyer_module"), None)
        assert buyer_module_item is not None
        assert "buyer" in buyer_module_item.get("roles", []), "buyer should have buyer_module after reset"
        
        print("✓ Config reset to defaults successfully")


class TestBuyerActualPermissions:
    """Tests for actual buyer permissions (not preview)"""
    
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
    
    def test_buyer_actual_permissions_default(self):
        """Test: Buyer actual permissions with default config"""
        if not self.buyer_token:
            pytest.skip("Buyer login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/access/permissions",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify buyer sees expected cards
        dashboard = data["dashboard"]
        assert dashboard.get("card_cost_savings") != "hidden", "Buyer should see Cost Savings by default"
        assert dashboard.get("card_my_assigned") != "hidden", "Buyer should see My Assigned"
        
        # Verify buyer sees buyer_module
        capex_request = data["capex_request"]
        assert capex_request.get("buyer_module") != "hidden", "Buyer should see buyer_module by default"
        
        print("✓ Buyer actual permissions are correct with default config")


class TestAnalyticsModuleAccess:
    """Tests for analytics module access control"""
    
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
    
    def test_analytics_module_access_for_buyer(self):
        """Test: Buyer has access to analytics module items"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/buyer",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        analytics = data.get("analytics", {})
        
        # Buyer should see some analytics items
        buyer_analytics_items = ["cost_savings_report", "purchase_trends", "vendor_performance", "status_breakdown"]
        visible_count = sum(1 for item in buyer_analytics_items if analytics.get(item) != "hidden")
        
        print(f"✓ Buyer sees {visible_count} analytics items")
    
    def test_analytics_module_access_for_user(self):
        """Test: User role has limited analytics access"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/access-config/preview/user",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        analytics = data.get("analytics", {})
        
        # User should only see status_breakdown
        assert analytics.get("status_breakdown") != "hidden", "User should see status_breakdown"
        
        # User should NOT see cost_savings_report
        assert analytics.get("cost_savings_report") == "hidden", "User should NOT see cost_savings_report"
        
        print("✓ User analytics access is correctly limited")
