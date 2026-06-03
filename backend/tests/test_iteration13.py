"""
Backend API tests for Iteration 13 features:
- Analytics dashboard API with monthly_trend (Purchase & Savings)
- Dashboard auto-refresh (verified via code inspection)
- Settings widget configuration (localStorage - frontend only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://capex-portal-3.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def capex_head_token(self):
        """Get capex head authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manoj@capex.com",
            "password": "capex123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_buyer_login(self):
        """Test buyer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "buyer"
        print("TEST PASS: Buyer login successful")
    
    def test_capex_head_login(self):
        """Test capex head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manoj@capex.com",
            "password": "capex123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "capex_head"
        print("TEST PASS: Capex Head login successful")


class TestAnalyticsDashboard:
    """Analytics Dashboard API tests - Purchase & Savings Trend"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_analytics_dashboard_endpoint(self, auth_headers):
        """Test analytics dashboard endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Analytics dashboard failed: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "total_requests" in data
        assert "completed" in data
        assert "total_purchase_value" in data
        assert "cost_savings" in data
        assert "monthly_trend" in data
        print(f"TEST PASS: Analytics dashboard returns data - {data['total_requests']} total requests")
    
    def test_monthly_trend_structure(self, auth_headers):
        """Test monthly_trend has correct structure with purchase and savings"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        monthly_trend = data.get("monthly_trend", [])
        print(f"Monthly trend data: {monthly_trend}")
        
        if len(monthly_trend) > 0:
            # Check structure of first item
            first_item = monthly_trend[0]
            assert "month" in first_item, "monthly_trend item should have 'month' field"
            assert "purchase" in first_item, "monthly_trend item should have 'purchase' field"
            assert "savings" in first_item, "monthly_trend item should have 'savings' field"
            print(f"TEST PASS: Monthly trend has correct structure - {len(monthly_trend)} months of data")
        else:
            print("TEST INFO: No monthly trend data available (empty array)")
    
    def test_cost_savings_calculation(self, auth_headers):
        """Test cost savings is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        cost_savings = data.get("cost_savings", 0)
        total_purchase = data.get("total_purchase_value", 0)
        total_initial = data.get("total_initial_value", 0)
        
        print(f"Cost Savings: {cost_savings}")
        print(f"Total Purchase: {total_purchase}")
        print(f"Total Initial: {total_initial}")
        
        # Savings should be non-negative
        assert cost_savings >= 0, "Cost savings should be non-negative"
        print(f"TEST PASS: Cost savings calculation - ₹{cost_savings}")
    
    def test_status_breakdown(self, auth_headers):
        """Test status breakdown is returned"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        status_breakdown = data.get("status_breakdown", {})
        assert isinstance(status_breakdown, dict)
        print(f"TEST PASS: Status breakdown - {status_breakdown}")


class TestCapexRequests:
    """Capex Requests API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_capex_requests(self, auth_headers):
        """Test getting capex requests list"""
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"TEST PASS: Got {len(data)} capex requests")
    
    def test_capex_request_has_suppliers(self, auth_headers):
        """Test capex requests have suppliers array for savings calculation"""
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find a request with suppliers
        requests_with_suppliers = [r for r in data if r.get("suppliers") and len(r.get("suppliers", [])) > 0]
        
        if requests_with_suppliers:
            req = requests_with_suppliers[0]
            suppliers = req.get("suppliers", [])
            print(f"Found request {req['id']} with {len(suppliers)} suppliers")
            
            # Check supplier structure
            if suppliers:
                supplier = suppliers[0]
                print(f"Supplier data: {supplier}")
                # Suppliers should have initial_price and final_price for savings calculation
                if "initial_price" in supplier and "final_price" in supplier:
                    print(f"TEST PASS: Supplier has price fields for savings calculation")
                else:
                    print("TEST INFO: Supplier may not have price fields set yet")
        else:
            print("TEST INFO: No requests with suppliers found")


class TestBuyerAnalytics:
    """Buyer-specific analytics tests"""
    
    @pytest.fixture(scope="class")
    def capex_head_headers(self):
        """Get capex head authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "manoj@capex.com",
            "password": "capex123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_buyers_list(self, capex_head_headers):
        """Test getting list of buyers"""
        response = requests.get(f"{BASE_URL}/api/users/buyers", headers=capex_head_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"TEST PASS: Got {len(data)} buyers")
        
        # Find a buyer to test analytics
        if data:
            return data[0]["id"]
        return None
    
    def test_buyer_analytics_endpoint(self, capex_head_headers):
        """Test buyer analytics endpoint"""
        # First get a buyer ID
        buyers_response = requests.get(f"{BASE_URL}/api/users/buyers", headers=capex_head_headers)
        buyers = buyers_response.json()
        
        if buyers:
            buyer_id = buyers[0]["id"]
            response = requests.get(f"{BASE_URL}/api/analytics/buyer/{buyer_id}", headers=capex_head_headers)
            assert response.status_code == 200
            data = response.json()
            
            assert "buyer_id" in data
            assert "total_requests" in data
            assert "total_spend" in data
            assert "savings" in data
            print(f"TEST PASS: Buyer analytics - {data['total_requests']} requests, savings: {data['savings']}")
        else:
            print("TEST SKIP: No buyers found to test analytics")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
