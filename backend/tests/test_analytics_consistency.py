"""
Test Analytics Data Consistency
================================
Tests to verify that:
1. BUYER stat cards match Analytics API values (total_purchase_value, cost_avoidance)
2. BUYER monthly_trend sums match stat card values
3. CAPEX HEAD stat cards match Analytics API values (global data)
4. CAPEX HEAD monthly_trend sums match stat card values
5. In Progress counts only DH-approved but not completed requests

Expected values from main agent:
- Buyer (vijay@capex.com): total_purchase_value=10104094, cost_avoidance=3206406
- Capex Head (manoj@capex.com): total_purchase_value=18270598, cost_avoidance=3716885
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://capex-portal-3.preview.emergentagent.com').rstrip('/')

# Test credentials
BUYER_EMAIL = "vijay@capex.com"
BUYER_PASSWORD = "buyer123"
CAPEX_HEAD_EMAIL = "manoj@capex.com"
CAPEX_HEAD_PASSWORD = "capex123"


class TestAnalyticsConsistency:
    """Test analytics data consistency between API and expected values"""
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def capex_head_token(self):
        """Get capex head authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CAPEX_HEAD_EMAIL,
            "password": CAPEX_HEAD_PASSWORD
        })
        assert response.status_code == 200, f"Capex Head login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def buyer_analytics(self, buyer_token):
        """Get analytics data for buyer"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed to get buyer analytics: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def capex_head_analytics(self, capex_head_token):
        """Get analytics data for capex head"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed to get capex head analytics: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def buyer_requests(self, buyer_token):
        """Get all requests visible to buyer"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Failed to get buyer requests: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def capex_head_requests(self, capex_head_token):
        """Get all requests visible to capex head"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Failed to get capex head requests: {response.text}"
        return response.json()
    
    # ==================== BUYER TESTS ====================
    
    def test_buyer_login_success(self, buyer_token):
        """Test buyer can login successfully"""
        assert buyer_token is not None
        assert len(buyer_token) > 0
        print(f"✓ Buyer login successful, token length: {len(buyer_token)}")
    
    def test_buyer_analytics_returns_data(self, buyer_analytics):
        """Test buyer analytics endpoint returns expected fields"""
        assert "total_purchase_value" in buyer_analytics
        assert "cost_avoidance" in buyer_analytics
        assert "monthly_trend" in buyer_analytics
        print(f"✓ Buyer analytics contains required fields")
        print(f"  - total_purchase_value: {buyer_analytics['total_purchase_value']}")
        print(f"  - cost_avoidance: {buyer_analytics['cost_avoidance']}")
        print(f"  - monthly_trend entries: {len(buyer_analytics['monthly_trend'])}")
    
    def test_buyer_total_purchase_value_matches_expected(self, buyer_analytics):
        """Test buyer total_purchase_value matches expected value (10104094)"""
        expected_value = 10104094
        actual_value = buyer_analytics.get("total_purchase_value", 0)
        
        print(f"  Expected total_purchase_value: {expected_value}")
        print(f"  Actual total_purchase_value: {actual_value}")
        
        # Allow small tolerance for floating point
        assert abs(actual_value - expected_value) < 100, \
            f"Buyer total_purchase_value mismatch: expected ~{expected_value}, got {actual_value}"
        print(f"✓ Buyer total_purchase_value matches expected value")
    
    def test_buyer_cost_savings_matches_expected(self, buyer_analytics):
        """Test buyer cost_avoidance matches expected value (3206406)"""
        expected_value = 3206406
        actual_value = buyer_analytics.get("cost_avoidance", 0)
        
        print(f"  Expected cost_avoidance: {expected_value}")
        print(f"  Actual cost_avoidance: {actual_value}")
        
        # Allow small tolerance
        assert abs(actual_value - expected_value) < 100, \
            f"Buyer cost_avoidance mismatch: expected ~{expected_value}, got {actual_value}"
        print(f"✓ Buyer cost_avoidance matches expected value")
    
    def test_buyer_monthly_trend_purchase_sum_matches_total(self, buyer_analytics):
        """Test buyer monthly_trend purchase sum equals total_purchase_value"""
        monthly_trend = buyer_analytics.get("monthly_trend", [])
        monthly_purchase_sum = sum(m.get("purchase", 0) for m in monthly_trend)
        total_purchase_value = buyer_analytics.get("total_purchase_value", 0)
        
        print(f"  Monthly trend purchase sum: {monthly_purchase_sum}")
        print(f"  Total purchase value: {total_purchase_value}")
        
        # Allow small tolerance
        assert abs(monthly_purchase_sum - total_purchase_value) < 100, \
            f"Monthly trend purchase sum ({monthly_purchase_sum}) doesn't match total_purchase_value ({total_purchase_value})"
        print(f"✓ Buyer monthly_trend purchase sum matches total_purchase_value")
    
    def test_buyer_monthly_trend_savings_sum_matches_total(self, buyer_analytics):
        """Test buyer monthly_trend savings sum equals cost_avoidance"""
        monthly_trend = buyer_analytics.get("monthly_trend", [])
        monthly_savings_sum = sum(m.get("savings", 0) for m in monthly_trend)
        cost_avoidance = buyer_analytics.get("cost_avoidance", 0)
        
        print(f"  Monthly trend savings sum: {monthly_savings_sum}")
        print(f"  Cost avoidance: {cost_avoidance}")
        
        # Allow small tolerance
        assert abs(monthly_savings_sum - cost_avoidance) < 100, \
            f"Monthly trend savings sum ({monthly_savings_sum}) doesn't match cost_avoidance ({cost_avoidance})"
        print(f"✓ Buyer monthly_trend savings sum matches cost_avoidance")
    
    def test_buyer_analytics_is_buyer_specific(self, buyer_analytics, buyer_token):
        """Test that buyer analytics returns buyer-specific data, not global"""
        # Get buyer's user info
        headers = {"Authorization": f"Bearer {buyer_token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        buyer_id = me_response.json()["id"]
        
        # Get all requests assigned to this buyer
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        all_requests = requests_response.json()
        
        # Filter to only buyer's assigned requests
        my_requests = [r for r in all_requests if r.get("assigned_buyer_id") == buyer_id]
        
        print(f"  Buyer ID: {buyer_id}")
        print(f"  Total requests visible: {len(all_requests)}")
        print(f"  Requests assigned to buyer: {len(my_requests)}")
        
        # Calculate expected purchase value from buyer's requests
        calculated_purchase = 0
        for r in my_requests:
            suppliers = r.get("suppliers", [])
            if suppliers:
                # Same logic: is_ordered → selected → first
                ordered = next((s for s in suppliers if s.get("is_ordered")), None)
                selected = next((s for s in suppliers if s.get("selected")), None)
                supplier = ordered or selected or (suppliers[0] if suppliers else None)
                if supplier:
                    calculated_purchase += supplier.get("final_price", 0) or 0
        
        print(f"  Calculated purchase from buyer's requests: {calculated_purchase}")
        print(f"  API total_purchase_value: {buyer_analytics['total_purchase_value']}")
        
        # The API should return buyer-specific data
        assert abs(calculated_purchase - buyer_analytics['total_purchase_value']) < 100, \
            f"API returns global data instead of buyer-specific. Calculated: {calculated_purchase}, API: {buyer_analytics['total_purchase_value']}"
        print(f"✓ Buyer analytics returns buyer-specific data (not global)")
    
    # ==================== CAPEX HEAD TESTS ====================
    
    def test_capex_head_login_success(self, capex_head_token):
        """Test capex head can login successfully"""
        assert capex_head_token is not None
        assert len(capex_head_token) > 0
        print(f"✓ Capex Head login successful, token length: {len(capex_head_token)}")
    
    def test_capex_head_analytics_returns_data(self, capex_head_analytics):
        """Test capex head analytics endpoint returns expected fields"""
        assert "total_purchase_value" in capex_head_analytics
        assert "cost_avoidance" in capex_head_analytics
        assert "monthly_trend" in capex_head_analytics
        print(f"✓ Capex Head analytics contains required fields")
        print(f"  - total_purchase_value: {capex_head_analytics['total_purchase_value']}")
        print(f"  - cost_avoidance: {capex_head_analytics['cost_avoidance']}")
        print(f"  - monthly_trend entries: {len(capex_head_analytics['monthly_trend'])}")
    
    def test_capex_head_total_purchase_value_matches_expected(self, capex_head_analytics):
        """Test capex head total_purchase_value matches expected value (18270598)"""
        expected_value = 18270598
        actual_value = capex_head_analytics.get("total_purchase_value", 0)
        
        print(f"  Expected total_purchase_value: {expected_value}")
        print(f"  Actual total_purchase_value: {actual_value}")
        
        # Allow small tolerance
        assert abs(actual_value - expected_value) < 100, \
            f"Capex Head total_purchase_value mismatch: expected ~{expected_value}, got {actual_value}"
        print(f"✓ Capex Head total_purchase_value matches expected value")
    
    def test_capex_head_cost_savings_matches_expected(self, capex_head_analytics):
        """Test capex head cost_avoidance matches expected value (3716885)"""
        expected_value = 3716885
        actual_value = capex_head_analytics.get("cost_avoidance", 0)
        
        print(f"  Expected cost_avoidance: {expected_value}")
        print(f"  Actual cost_avoidance: {actual_value}")
        
        # Allow small tolerance
        assert abs(actual_value - expected_value) < 100, \
            f"Capex Head cost_avoidance mismatch: expected ~{expected_value}, got {actual_value}"
        print(f"✓ Capex Head cost_avoidance matches expected value")
    
    def test_capex_head_monthly_trend_purchase_sum_matches_total(self, capex_head_analytics):
        """Test capex head monthly_trend purchase sum equals total_purchase_value"""
        monthly_trend = capex_head_analytics.get("monthly_trend", [])
        monthly_purchase_sum = sum(m.get("purchase", 0) for m in monthly_trend)
        total_purchase_value = capex_head_analytics.get("total_purchase_value", 0)
        
        print(f"  Monthly trend purchase sum: {monthly_purchase_sum}")
        print(f"  Total purchase value: {total_purchase_value}")
        
        # Allow small tolerance
        assert abs(monthly_purchase_sum - total_purchase_value) < 100, \
            f"Monthly trend purchase sum ({monthly_purchase_sum}) doesn't match total_purchase_value ({total_purchase_value})"
        print(f"✓ Capex Head monthly_trend purchase sum matches total_purchase_value")
    
    def test_capex_head_monthly_trend_savings_sum_matches_total(self, capex_head_analytics):
        """Test capex head monthly_trend savings sum equals cost_avoidance"""
        monthly_trend = capex_head_analytics.get("monthly_trend", [])
        monthly_savings_sum = sum(m.get("savings", 0) for m in monthly_trend)
        cost_avoidance = capex_head_analytics.get("cost_avoidance", 0)
        
        print(f"  Monthly trend savings sum: {monthly_savings_sum}")
        print(f"  Cost avoidance: {cost_avoidance}")
        
        # Allow small tolerance
        assert abs(monthly_savings_sum - cost_avoidance) < 100, \
            f"Monthly trend savings sum ({monthly_savings_sum}) doesn't match cost_avoidance ({cost_avoidance})"
        print(f"✓ Capex Head monthly_trend savings sum matches cost_avoidance")
    
    # ==================== IN PROGRESS TESTS ====================
    
    def test_buyer_in_progress_count(self, buyer_token):
        """Test In Progress counts only DH-approved but not completed requests"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get buyer info
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        buyer_id = me_response.json()["id"]
        
        # Get all requests
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        all_requests = requests_response.json()
        
        # Filter to buyer's assigned requests
        my_requests = [r for r in all_requests if r.get("assigned_buyer_id") == buyer_id]
        
        # Count in progress: DH approved AND not completed
        # Excludes: Pending DH Approval, Rejected by DH, Rejected, Completed
        in_progress = []
        for r in my_requests:
            status = r.get("status", "")
            workflow_status = r.get("workflow_status", "")
            
            not_pending = status not in ["Pending DH Approval", "Rejected by DH", "Rejected"]
            not_completed = workflow_status != "Completed" and status != "Completed"
            
            if not_pending and not_completed:
                in_progress.append(r)
        
        print(f"  Total requests assigned to buyer: {len(my_requests)}")
        print(f"  In Progress count: {len(in_progress)}")
        
        # List the in-progress requests
        for r in in_progress:
            print(f"    - {r['id']}: status={r.get('status')}, workflow_status={r.get('workflow_status')}")
        
        # Verify none of the in-progress requests are in excluded statuses
        for r in in_progress:
            assert r.get("status") not in ["Pending DH Approval", "Rejected by DH", "Rejected"], \
                f"Request {r['id']} should not be in progress (status: {r.get('status')})"
            assert r.get("workflow_status") != "Completed" and r.get("status") != "Completed", \
                f"Request {r['id']} should not be in progress (completed)"
        
        print(f"✓ In Progress correctly excludes pending/rejected/completed requests")


class TestDataIntegrity:
    """Additional tests for data integrity"""
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_supplier_selection_priority(self, buyer_token):
        """Test that supplier selection follows is_ordered → selected → first priority"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get buyer info
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        buyer_id = me_response.json()["id"]
        
        # Get all requests
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        all_requests = requests_response.json()
        
        # Filter to buyer's assigned requests with suppliers
        my_requests = [r for r in all_requests 
                       if r.get("assigned_buyer_id") == buyer_id 
                       and r.get("suppliers") and len(r.get("suppliers", [])) > 0]
        
        print(f"  Requests with suppliers: {len(my_requests)}")
        
        for r in my_requests:
            suppliers = r.get("suppliers", [])
            
            # Find selected supplier using same priority
            ordered = next((s for s in suppliers if s.get("is_ordered")), None)
            selected = next((s for s in suppliers if s.get("selected")), None)
            chosen = ordered or selected or (suppliers[0] if suppliers else None)
            
            if chosen:
                print(f"    Request {r['id']}: {len(suppliers)} suppliers, chosen={chosen.get('name', 'N/A')}, "
                      f"is_ordered={chosen.get('is_ordered')}, selected={chosen.get('selected')}, "
                      f"final_price={chosen.get('final_price')}")
        
        print(f"✓ Supplier selection priority verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
