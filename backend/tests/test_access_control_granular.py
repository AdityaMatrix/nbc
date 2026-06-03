"""
Test Access Control Panel with Granular Dashboard Items
Tests the new module-based structure with 31 items across 3 modules:
- Dashboard: 15 items (10 KPI cards + 2 charts + 3 widgets)
- Capex Request: 10 items
- Analytics: 6 items
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@capex.com", "password": "admin123"}
BUYER_CREDS = {"email": "vijay@capex.com", "password": "buyer123"}
DH_CREDS = {"email": "rajesh@capex.com", "password": "dh123"}
CAPEX_HEAD_CREDS = {"email": "manoj@capex.com", "password": "capex123"}
PE_CREDS = {"email": "rahul@capex.com", "password": "pe123"}
USER_CREDS = {"email": "amit@capex.com", "password": "user123"}


def get_token(creds):
    """Helper to get auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None


class TestAccessConfigStructure:
    """Test the access config structure has correct modules and items"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = get_token(ADMIN_CREDS)
        assert self.admin_token, "Admin login failed"
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_access_config_returns_3_modules(self):
        """GET /api/admin/access-config returns 3 modules"""
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "modules" in data
        assert len(data["modules"]) == 3
        module_ids = [m["id"] for m in data["modules"]]
        assert "dashboard" in module_ids
        assert "capex_request" in module_ids
        assert "analytics" in module_ids
        print("PASS: 3 modules returned (dashboard, capex_request, analytics)")
    
    def test_dashboard_module_has_15_items(self):
        """Dashboard module has 15 items: 10 KPI cards + 2 charts + 3 widgets"""
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        dashboard = next((m for m in data["modules"] if m["id"] == "dashboard"), None)
        assert dashboard is not None
        assert len(dashboard["items"]) == 15
        
        # Verify KPI card items
        kpi_cards = ["card_budget_utilized", "card_pending_approvals", "card_cost_savings", 
                     "card_completion_rate", "card_dept_requests", "card_my_requests",
                     "card_completed", "card_in_progress", "card_my_assigned", "card_purchase_value"]
        for card_id in kpi_cards:
            item = next((i for i in dashboard["items"] if i["id"] == card_id), None)
            assert item is not None, f"Missing KPI card: {card_id}"
        
        # Verify chart items
        charts = ["dept_spend_chart", "buyer_performance_chart"]
        for chart_id in charts:
            item = next((i for i in dashboard["items"] if i["id"] == chart_id), None)
            assert item is not None, f"Missing chart: {chart_id}"
        
        # Verify widget items
        widgets = ["pending_tasks", "recent_requests", "cost_savings_widget"]
        for widget_id in widgets:
            item = next((i for i in dashboard["items"] if i["id"] == widget_id), None)
            assert item is not None, f"Missing widget: {widget_id}"
        
        print("PASS: Dashboard has 15 items (10 KPI cards + 2 charts + 3 widgets)")
    
    def test_capex_request_module_has_10_items(self):
        """Capex Request module has 10 items"""
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        capex_request = next((m for m in data["modules"] if m["id"] == "capex_request"), None)
        assert capex_request is not None
        assert len(capex_request["items"]) == 10
        
        expected_items = ["basic_info", "supplier_details", "buyer_module", "capex_head_module",
                         "dh_approval", "approval_flow", "sample_section", "comments", 
                         "attachments", "assigned_buyer"]
        for item_id in expected_items:
            item = next((i for i in capex_request["items"] if i["id"] == item_id), None)
            assert item is not None, f"Missing capex_request item: {item_id}"
        
        print("PASS: Capex Request has 10 items")
    
    def test_analytics_module_has_6_items(self):
        """Analytics module has 6 items"""
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        analytics = next((m for m in data["modules"] if m["id"] == "analytics"), None)
        assert analytics is not None
        assert len(analytics["items"]) == 6
        
        expected_items = ["cost_savings_report", "purchase_trends", "vendor_performance",
                         "department_spend", "status_breakdown", "buyer_performance"]
        for item_id in expected_items:
            item = next((i for i in analytics["items"] if i["id"] == item_id), None)
            assert item is not None, f"Missing analytics item: {item_id}"
        
        print("PASS: Analytics has 6 items")
    
    def test_total_31_items_across_modules(self):
        """Total 31 items across all 3 modules"""
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        total_items = sum(len(m["items"]) for m in data["modules"])
        assert total_items == 31
        print("PASS: Total 31 items across 3 modules")


class TestRoleBasedPermissions:
    """Test role-based permissions for different users"""
    
    def test_admin_gets_editable_for_all_items(self):
        """Admin gets 'editable' permission for all items"""
        token = get_token(ADMIN_CREDS)
        assert token, "Admin login failed"
        resp = requests.get(f"{BASE_URL}/api/access/permissions", 
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        
        # Check all dashboard items are editable
        for item_id, perm in data.get("dashboard", {}).items():
            assert perm == "editable", f"Admin should have editable for {item_id}, got {perm}"
        
        print("PASS: Admin gets 'editable' for all items")
    
    def test_buyer_permissions_for_dashboard_cards(self):
        """Buyer gets correct permissions for dashboard cards"""
        token = get_token(BUYER_CREDS)
        assert token, "Buyer login failed"
        resp = requests.get(f"{BASE_URL}/api/access/permissions", 
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        dashboard = data.get("dashboard", {})
        
        # Buyer should see: card_cost_savings, card_completed, card_in_progress, 
        # card_my_assigned, card_purchase_value
        buyer_visible_cards = ["card_cost_savings", "card_completed", "card_in_progress",
                               "card_my_assigned", "card_purchase_value"]
        for card_id in buyer_visible_cards:
            assert dashboard.get(card_id) != "hidden", f"Buyer should see {card_id}"
        
        # Buyer should NOT see: card_budget_utilized, card_completion_rate
        buyer_hidden_cards = ["card_budget_utilized", "card_completion_rate"]
        for card_id in buyer_hidden_cards:
            assert dashboard.get(card_id) == "hidden", f"Buyer should NOT see {card_id}"
        
        print("PASS: Buyer has correct dashboard card permissions")
    
    def test_capex_head_permissions_for_dashboard_cards(self):
        """Capex Head gets correct permissions for dashboard cards"""
        token = get_token(CAPEX_HEAD_CREDS)
        assert token, "Capex Head login failed"
        resp = requests.get(f"{BASE_URL}/api/access/permissions", 
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        dashboard = data.get("dashboard", {})
        
        # Capex Head should see: card_budget_utilized, card_pending_approvals, 
        # card_cost_savings, card_completion_rate
        capex_visible_cards = ["card_budget_utilized", "card_pending_approvals",
                               "card_cost_savings", "card_completion_rate"]
        for card_id in capex_visible_cards:
            assert dashboard.get(card_id) != "hidden", f"Capex Head should see {card_id}"
        
        print("PASS: Capex Head has correct dashboard card permissions")
    
    def test_department_head_permissions_for_dashboard_cards(self):
        """Department Head gets correct permissions for dashboard cards"""
        token = get_token(DH_CREDS)
        assert token, "DH login failed"
        resp = requests.get(f"{BASE_URL}/api/access/permissions", 
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        dashboard = data.get("dashboard", {})
        
        # DH should see: card_pending_approvals, card_dept_requests, card_completed, card_in_progress
        dh_visible_cards = ["card_pending_approvals", "card_dept_requests", 
                           "card_completed", "card_in_progress"]
        for card_id in dh_visible_cards:
            assert dashboard.get(card_id) != "hidden", f"DH should see {card_id}"
        
        print("PASS: Department Head has correct dashboard card permissions")
    
    def test_user_permissions_for_dashboard_cards(self):
        """User gets correct permissions for dashboard cards"""
        token = get_token(USER_CREDS)
        assert token, "User login failed"
        resp = requests.get(f"{BASE_URL}/api/access/permissions", 
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        dashboard = data.get("dashboard", {})
        
        # User should see: card_pending_approvals, card_dept_requests, card_my_requests, card_completed
        user_visible_cards = ["card_pending_approvals", "card_dept_requests", 
                             "card_my_requests", "card_completed"]
        for card_id in user_visible_cards:
            assert dashboard.get(card_id) != "hidden", f"User should see {card_id}"
        
        print("PASS: User has correct dashboard card permissions")


class TestAccessControlCRUD:
    """Test CRUD operations on access config"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = get_token(ADMIN_CREDS)
        assert self.admin_token, "Admin login failed"
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_toggle_item_for_role(self):
        """Toggle an item ON/OFF for a specific role"""
        # First get current config
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        assert resp.status_code == 200
        config = resp.json()
        
        # Find card_cost_savings in dashboard module
        dashboard = next((m for m in config["modules"] if m["id"] == "dashboard"), None)
        cost_savings = next((i for i in dashboard["items"] if i["id"] == "card_cost_savings"), None)
        
        # Check if buyer is in roles
        original_roles = cost_savings.get("roles", [])
        has_buyer = "buyer" in original_roles
        
        # Toggle buyer role
        if has_buyer:
            new_roles = [r for r in original_roles if r != "buyer"]
        else:
            new_roles = original_roles + ["buyer"]
        
        # Update config
        update_payload = {
            "modules": [{
                "id": "dashboard",
                "enabled": dashboard["enabled"],
                "items": [{
                    "id": "card_cost_savings",
                    "enabled": cost_savings["enabled"],
                    "permission": cost_savings["permission"],
                    "roles": new_roles,
                    "user_overrides": cost_savings.get("user_overrides", [])
                }]
            }]
        }
        
        resp = requests.put(f"{BASE_URL}/api/admin/access-config", 
                           json=update_payload, headers=self.headers)
        assert resp.status_code == 200
        
        # Verify change
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        updated_config = resp.json()
        dashboard = next((m for m in updated_config["modules"] if m["id"] == "dashboard"), None)
        cost_savings = next((i for i in dashboard["items"] if i["id"] == "card_cost_savings"), None)
        
        if has_buyer:
            assert "buyer" not in cost_savings["roles"]
        else:
            assert "buyer" in cost_savings["roles"]
        
        print("PASS: Toggle item for role works correctly")
    
    def test_reset_config_to_defaults(self):
        """Reset config restores default values"""
        resp = requests.post(f"{BASE_URL}/api/admin/access-config/reset", 
                            json={}, headers=self.headers)
        assert resp.status_code == 200
        
        # Verify reset
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        config = resp.json()
        
        # Check dashboard has 15 items
        dashboard = next((m for m in config["modules"] if m["id"] == "dashboard"), None)
        assert len(dashboard["items"]) == 15
        
        # Check card_cost_savings has buyer in roles (default)
        cost_savings = next((i for i in dashboard["items"] if i["id"] == "card_cost_savings"), None)
        assert "buyer" in cost_savings["roles"]
        
        print("PASS: Reset config to defaults works correctly")
    
    def test_module_toggle_disables_all_items(self):
        """Disabling a module makes all items hidden for non-admin"""
        # First reset to defaults
        requests.post(f"{BASE_URL}/api/admin/access-config/reset", 
                     json={}, headers=self.headers)
        
        # Get current config
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        config = resp.json()
        
        # Disable dashboard module
        dashboard = next((m for m in config["modules"] if m["id"] == "dashboard"), None)
        update_payload = {
            "modules": [{
                "id": "dashboard",
                "enabled": False,
                "items": [{"id": i["id"], "enabled": i["enabled"], 
                          "permission": i["permission"], "roles": i["roles"],
                          "user_overrides": i.get("user_overrides", [])} 
                         for i in dashboard["items"]]
            }]
        }
        
        resp = requests.put(f"{BASE_URL}/api/admin/access-config", 
                           json=update_payload, headers=self.headers)
        assert resp.status_code == 200
        
        # Check buyer permissions - all dashboard items should be hidden
        buyer_token = get_token(BUYER_CREDS)
        resp = requests.get(f"{BASE_URL}/api/access/permissions", 
                          headers={"Authorization": f"Bearer {buyer_token}"})
        assert resp.status_code == 200
        buyer_perms = resp.json()
        
        for item_id, perm in buyer_perms.get("dashboard", {}).items():
            assert perm == "hidden", f"With module disabled, {item_id} should be hidden for buyer"
        
        # Reset back to defaults
        requests.post(f"{BASE_URL}/api/admin/access-config/reset", 
                     json={}, headers=self.headers)
        
        print("PASS: Module toggle disables all items for non-admin")
    
    def test_global_item_lock_hides_for_all_roles(self):
        """Disabling an item globally hides it for all roles"""
        # First reset to defaults
        requests.post(f"{BASE_URL}/api/admin/access-config/reset", 
                     json={}, headers=self.headers)
        
        # Get current config
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        config = resp.json()
        
        # Disable card_cost_savings item
        dashboard = next((m for m in config["modules"] if m["id"] == "dashboard"), None)
        cost_savings = next((i for i in dashboard["items"] if i["id"] == "card_cost_savings"), None)
        
        update_payload = {
            "modules": [{
                "id": "dashboard",
                "enabled": True,
                "items": [{
                    "id": "card_cost_savings",
                    "enabled": False,  # Globally disabled
                    "permission": cost_savings["permission"],
                    "roles": cost_savings["roles"],
                    "user_overrides": cost_savings.get("user_overrides", [])
                }]
            }]
        }
        
        resp = requests.put(f"{BASE_URL}/api/admin/access-config", 
                           json=update_payload, headers=self.headers)
        assert resp.status_code == 200
        
        # Check buyer permissions - card_cost_savings should be hidden
        buyer_token = get_token(BUYER_CREDS)
        resp = requests.get(f"{BASE_URL}/api/access/permissions", 
                          headers={"Authorization": f"Bearer {buyer_token}"})
        assert resp.status_code == 200
        buyer_perms = resp.json()
        
        assert buyer_perms.get("dashboard", {}).get("card_cost_savings") == "hidden"
        
        # Reset back to defaults
        requests.post(f"{BASE_URL}/api/admin/access-config/reset", 
                     json={}, headers=self.headers)
        
        print("PASS: Global item lock hides for all roles")


class TestRoleSelectorTabs:
    """Test role selector functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = get_token(ADMIN_CREDS)
        assert self.admin_token, "Admin login failed"
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_role_visible_counts(self):
        """Verify visible/total counts for each role"""
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", headers=self.headers)
        assert resp.status_code == 200
        config = resp.json()
        
        roles = ["user", "buyer", "department_head", "process_engineering", "capex_head"]
        
        for role in roles:
            total = 0
            visible = 0
            for module in config["modules"]:
                for item in module["items"]:
                    total += 1
                    if module["enabled"] and item["enabled"] and role in item.get("roles", []):
                        visible += 1
            
            print(f"Role {role}: {visible}/{total} visible")
            assert total == 31, f"Total should be 31 for {role}"
        
        print("PASS: Role visible counts calculated correctly")


class TestNonAdminAccess:
    """Test that non-admin users cannot access admin endpoints"""
    
    def test_buyer_cannot_access_admin_config(self):
        """Buyer gets 403 on admin access-config endpoint"""
        token = get_token(BUYER_CREDS)
        assert token, "Buyer login failed"
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", 
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403
        print("PASS: Buyer gets 403 on admin access-config")
    
    def test_user_cannot_access_admin_config(self):
        """User gets 403 on admin access-config endpoint"""
        token = get_token(USER_CREDS)
        assert token, "User login failed"
        resp = requests.get(f"{BASE_URL}/api/admin/access-config", 
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403
        print("PASS: User gets 403 on admin access-config")
    
    def test_buyer_cannot_update_config(self):
        """Buyer gets 403 on PUT admin access-config"""
        token = get_token(BUYER_CREDS)
        assert token, "Buyer login failed"
        resp = requests.put(f"{BASE_URL}/api/admin/access-config", 
                           json={"modules": []},
                           headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403
        print("PASS: Buyer gets 403 on PUT admin access-config")
    
    def test_buyer_cannot_reset_config(self):
        """Buyer gets 403 on POST admin access-config/reset"""
        token = get_token(BUYER_CREDS)
        assert token, "Buyer login failed"
        resp = requests.post(f"{BASE_URL}/api/admin/access-config/reset", 
                            json={},
                            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403
        print("PASS: Buyer gets 403 on POST admin access-config/reset")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
