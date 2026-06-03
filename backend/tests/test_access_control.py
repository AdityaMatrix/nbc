"""
Test Module-Based Access Control Feature for CAPEX Portal
Tests:
- GET /api/admin/access-config (admin only) - returns 3 modules (dashboard=6, capex_request=10, analytics=6)
- GET /api/access/permissions (any authenticated user) - returns resolved permissions per module
- PUT /api/admin/access-config (admin only) - saves module updates
- POST /api/admin/access-config/reset (admin only) - resets to defaults
- Non-admin users get 403 on admin endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@capex.com", "password": "admin123"}
BUYER_CREDS = {"email": "vijay@capex.com", "password": "buyer123"}
CAPEX_HEAD_CREDS = {"email": "manoj@capex.com", "password": "capex123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def buyer_token():
    """Get buyer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Buyer login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def capex_head_token():
    """Get capex head authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CAPEX_HEAD_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Capex head login failed: {response.status_code} - {response.text}")


class TestAdminAccessConfig:
    """Tests for admin access config endpoints - Module-based structure"""

    def test_get_access_config_as_admin(self, admin_token):
        """Admin should get full access config with 3 modules"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify new module-based structure
        assert "modules" in data, "Missing 'modules' key in response"
        assert len(data["modules"]) == 3, f"Expected 3 modules, got {len(data['modules'])}"
        
        # Verify module IDs
        module_ids = [m["id"] for m in data["modules"]]
        assert "dashboard" in module_ids, "Missing dashboard module"
        assert "capex_request" in module_ids, "Missing capex_request module"
        assert "analytics" in module_ids, "Missing analytics module"
        
        # Verify item counts per module
        for module in data["modules"]:
            if module["id"] == "dashboard":
                assert len(module["items"]) == 6, f"Dashboard should have 6 items, got {len(module['items'])}"
            elif module["id"] == "capex_request":
                assert len(module["items"]) == 10, f"Capex Request should have 10 items, got {len(module['items'])}"
            elif module["id"] == "analytics":
                assert len(module["items"]) == 6, f"Analytics should have 6 items, got {len(module['items'])}"
        
        # Verify each item has required fields
        for module in data["modules"]:
            assert "id" in module
            assert "name" in module
            assert "enabled" in module
            assert "items" in module
            for item in module["items"]:
                assert "id" in item
                assert "name" in item
                assert "enabled" in item
                assert "roles" in item
                assert "permission" in item
        
        print(f"✓ Admin access config returned with 3 modules: dashboard(6), capex_request(10), analytics(6)")

    def test_get_access_config_as_buyer_returns_403(self, buyer_token):
        """Non-admin (buyer) should get 403 when accessing admin config"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Buyer correctly gets 403 when accessing admin config")

    def test_get_access_config_as_capex_head_returns_403(self, capex_head_token):
        """Non-admin (capex_head) should get 403 when accessing admin config"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Capex head correctly gets 403 when accessing admin config")

    def test_update_access_config_as_admin(self, admin_token):
        """Admin should be able to update access config with module-based structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        assert get_response.status_code == 200
        current_config = get_response.json()
        
        # Find dashboard module and toggle first item
        dashboard_module = next((m for m in current_config["modules"] if m["id"] == "dashboard"), None)
        assert dashboard_module is not None, "Dashboard module not found"
        
        first_item = dashboard_module["items"][0]
        original_enabled = first_item["enabled"]
        
        # Prepare update payload with new module structure
        update_payload = {
            "modules": [{
                "id": "dashboard",
                "enabled": dashboard_module["enabled"],
                "items": [{
                    "id": first_item["id"],
                    "enabled": not original_enabled,
                    "permission": first_item["permission"],
                    "roles": first_item["roles"],
                    "user_overrides": first_item.get("user_overrides", [])
                }]
            }]
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/access-config", json=update_payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the update
        updated_data = response.json()
        updated_dashboard = next((m for m in updated_data["modules"] if m["id"] == "dashboard"), None)
        updated_item = next((it for it in updated_dashboard["items"] if it["id"] == first_item["id"]), None)
        assert updated_item is not None
        assert updated_item["enabled"] == (not original_enabled), "Enabled status was not updated"
        
        # Revert the change
        revert_payload = {
            "modules": [{
                "id": "dashboard",
                "enabled": dashboard_module["enabled"],
                "items": [{
                    "id": first_item["id"],
                    "enabled": original_enabled,
                    "permission": first_item["permission"],
                    "roles": first_item["roles"],
                    "user_overrides": first_item.get("user_overrides", [])
                }]
            }]
        }
        requests.put(f"{BASE_URL}/api/admin/access-config", json=revert_payload, headers=headers)
        
        print("✓ Admin successfully updated access config with module-based structure")

    def test_update_access_config_as_buyer_returns_403(self, buyer_token):
        """Non-admin (buyer) should get 403 when updating admin config"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        update_payload = {
            "modules": [{
                "id": "dashboard",
                "enabled": False,
                "items": [{
                    "id": "stats_cards",
                    "enabled": False,
                    "permission": "hidden",
                    "roles": ["admin"],
                    "user_overrides": []
                }]
            }]
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/access-config", json=update_payload, headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Buyer correctly gets 403 when updating admin config")

    def test_reset_access_config_as_admin(self, admin_token):
        """Admin should be able to reset access config to defaults"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/admin/access-config/reset", json={}, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "reset" in data["message"].lower() or "default" in data["message"].lower()
        
        print("✓ Admin successfully reset access config to defaults")

    def test_reset_access_config_as_buyer_returns_403(self, buyer_token):
        """Non-admin (buyer) should get 403 when resetting admin config"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        response = requests.post(f"{BASE_URL}/api/admin/access-config/reset", json={}, headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Buyer correctly gets 403 when resetting admin config")


class TestUserPermissions:
    """Tests for user permissions endpoint - Module-based structure"""

    def test_get_permissions_as_admin(self, admin_token):
        """Admin should get 'editable' for all items in all modules"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/access/permissions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify module-based structure
        assert "dashboard" in data, "Missing dashboard module in permissions"
        assert "capex_request" in data, "Missing capex_request module in permissions"
        assert "analytics" in data, "Missing analytics module in permissions"
        
        # Admin should have 'editable' for everything
        for module_key in ["dashboard", "capex_request", "analytics"]:
            for item_id, permission in data[module_key].items():
                assert permission == "editable", f"Admin should have 'editable' for {module_key}.{item_id}, got '{permission}'"
        
        print("✓ Admin correctly gets 'editable' for all items in all modules")

    def test_get_permissions_as_buyer(self, buyer_token):
        """Buyer should get resolved permissions based on role"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/access/permissions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify module-based structure
        assert "dashboard" in data
        assert "capex_request" in data
        assert "analytics" in data
        
        # Verify buyer_module is editable (buyer has access)
        buyer_module_perm = data["capex_request"].get("buyer_module")
        assert buyer_module_perm == "editable", f"Buyer should have 'editable' for buyer_module, got '{buyer_module_perm}'"
        
        # Verify capex_head_module is hidden (buyer doesn't have access)
        capex_head_module_perm = data["capex_request"].get("capex_head_module")
        assert capex_head_module_perm == "hidden", f"Buyer should have 'hidden' for capex_head_module, got '{capex_head_module_perm}'"
        
        # Verify buyer_performance_chart is hidden (only admin/capex_head)
        buyer_perf_chart = data["dashboard"].get("buyer_performance_chart")
        assert buyer_perf_chart == "hidden", f"Buyer should have 'hidden' for buyer_performance_chart, got '{buyer_perf_chart}'"
        
        print(f"✓ Buyer permissions resolved correctly: buyer_module={buyer_module_perm}, capex_head_module={capex_head_module_perm}")

    def test_get_permissions_as_capex_head(self, capex_head_token):
        """Capex head should get resolved permissions based on role"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/access/permissions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify capex_head_module is editable (capex_head has access)
        capex_head_module_perm = data["capex_request"].get("capex_head_module")
        assert capex_head_module_perm == "editable", f"Capex head should have 'editable' for capex_head_module, got '{capex_head_module_perm}'"
        
        # Verify buyer_module is editable (capex_head has access)
        buyer_module_perm = data["capex_request"].get("buyer_module")
        assert buyer_module_perm == "editable", f"Capex head should have 'editable' for buyer_module, got '{buyer_module_perm}'"
        
        # Verify buyer_performance_chart is visible (capex_head has access)
        buyer_perf_chart = data["dashboard"].get("buyer_performance_chart")
        assert buyer_perf_chart == "view", f"Capex head should have 'view' for buyer_performance_chart, got '{buyer_perf_chart}'"
        
        print(f"✓ Capex head permissions resolved correctly: capex_head_module={capex_head_module_perm}, buyer_module={buyer_module_perm}")

    def test_permissions_without_auth_returns_error(self):
        """Unauthenticated request should return 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/access/permissions")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}: {response.text}"
        print(f"✓ Unauthenticated request correctly returns {response.status_code}")


class TestModuleStructure:
    """Tests for module-based access config structure validation"""

    def test_dashboard_module_structure(self, admin_token):
        """Verify dashboard module has 6 items with correct IDs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        dashboard = next((m for m in data["modules"] if m["id"] == "dashboard"), None)
        assert dashboard is not None, "Dashboard module not found"
        assert len(dashboard["items"]) == 6, f"Expected 6 items, got {len(dashboard['items'])}"
        
        expected_ids = ["stats_cards", "dept_spend_chart", "buyer_performance_chart", "pending_tasks", "recent_requests", "cost_savings_widget"]
        actual_ids = [item["id"] for item in dashboard["items"]]
        
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing dashboard item: {expected_id}"
        
        print(f"✓ Dashboard module structure verified: {actual_ids}")

    def test_capex_request_module_structure(self, admin_token):
        """Verify capex_request module has 10 items with correct IDs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        capex_request = next((m for m in data["modules"] if m["id"] == "capex_request"), None)
        assert capex_request is not None, "Capex Request module not found"
        assert len(capex_request["items"]) == 10, f"Expected 10 items, got {len(capex_request['items'])}"
        
        expected_ids = ["basic_info", "supplier_details", "buyer_module", "capex_head_module", "dh_approval", 
                       "approval_flow", "sample_section", "comments", "attachments", "assigned_buyer"]
        actual_ids = [item["id"] for item in capex_request["items"]]
        
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing capex_request item: {expected_id}"
        
        print(f"✓ Capex Request module structure verified: {actual_ids}")

    def test_analytics_module_structure(self, admin_token):
        """Verify analytics module has 6 items with correct IDs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        analytics = next((m for m in data["modules"] if m["id"] == "analytics"), None)
        assert analytics is not None, "Analytics module not found"
        assert len(analytics["items"]) == 6, f"Expected 6 items, got {len(analytics['items'])}"
        
        expected_ids = ["cost_savings_report", "purchase_trends", "vendor_performance", "department_spend", "status_breakdown", "buyer_performance"]
        actual_ids = [item["id"] for item in analytics["items"]]
        
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing analytics item: {expected_id}"
        
        print(f"✓ Analytics module structure verified: {actual_ids}")

    def test_module_toggle_disables_all_items(self, admin_token):
        """Verify that disabling a module makes all items hidden for non-admin users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/admin/access-config", headers=headers)
        assert get_response.status_code == 200
        current_config = get_response.json()
        
        # Find analytics module
        analytics = next((m for m in current_config["modules"] if m["id"] == "analytics"), None)
        assert analytics is not None
        
        # Disable the analytics module
        update_payload = {
            "modules": [{
                "id": "analytics",
                "enabled": False,
                "items": [{"id": it["id"], "enabled": it["enabled"], "permission": it["permission"], 
                          "roles": it["roles"], "user_overrides": it.get("user_overrides", [])} 
                         for it in analytics["items"]]
            }]
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/access-config", json=update_payload, headers=headers)
        assert response.status_code == 200
        
        # Now check buyer permissions - all analytics items should be hidden
        buyer_response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        buyer_token = buyer_response.json().get("access_token")
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
        
        perm_response = requests.get(f"{BASE_URL}/api/access/permissions", headers=buyer_headers)
        assert perm_response.status_code == 200
        perms = perm_response.json()
        
        # All analytics items should be hidden when module is disabled
        for item_id, perm in perms["analytics"].items():
            assert perm == "hidden", f"Expected 'hidden' for analytics.{item_id} when module disabled, got '{perm}'"
        
        # Re-enable the module
        update_payload["modules"][0]["enabled"] = True
        requests.put(f"{BASE_URL}/api/admin/access-config", json=update_payload, headers=headers)
        
        print("✓ Module toggle correctly disables all items for non-admin users")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
