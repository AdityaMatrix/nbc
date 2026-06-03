import requests
import sys
import json
from datetime import datetime

class RoleBasedTester:
    def __init__(self, base_url="https://capex-portal-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.current_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def login(self, email, password, role_name):
        """Login and get token"""
        url = f"{self.base_url}/auth/login"
        try:
            response = requests.post(url, json={"email": email, "password": password}, timeout=30)
            if response.status_code == 200:
                data = response.json()
                self.token = data['access_token']
                self.current_user = data['user']
                print(f"\n🔐 Logged in as {self.current_user['name']} ({role_name})")
                return True
            else:
                print(f"❌ Login failed for {email}: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Login error for {email}: {str(e)}")
            return False

    def get_dashboard_analytics(self):
        """Get dashboard analytics and return data"""
        url = f"{self.base_url}/analytics/dashboard"
        headers = {'Authorization': f'Bearer {self.token}'}
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error getting analytics: {e}")
            return None

    def test_user_dashboard_no_pricing(self):
        """Test that User dashboard does NOT show pricing metrics"""
        analytics = self.get_dashboard_analytics()
        if not analytics:
            self.log_test("User Dashboard Analytics", False, "Failed to get analytics")
            return False

        # Check that financial fields are NOT present for user
        financial_fields = ['total_purchase_value', 'cost_avoidance', 'vendor_spend']
        has_financial_data = any(field in analytics for field in financial_fields)
        
        if has_financial_data:
            self.log_test("User Dashboard - No Pricing Data", False, f"Found financial data: {[f for f in financial_fields if f in analytics]}")
            return False
        
        # Check that required non-financial fields ARE present
        required_fields = ['total_requests', 'approved', 'completed', 'sample_requests_count']
        missing_fields = [f for f in required_fields if f not in analytics]
        
        if missing_fields:
            self.log_test("User Dashboard - Required Fields", False, f"Missing fields: {missing_fields}")
            return False
        
        self.log_test("User Dashboard - No Pricing Data", True, f"Correctly shows: {list(analytics.keys())}")
        return True

    def test_buyer_dashboard_has_pricing(self):
        """Test that Buyer dashboard DOES show pricing metrics"""
        analytics = self.get_dashboard_analytics()
        if not analytics:
            self.log_test("Buyer Dashboard Analytics", False, "Failed to get analytics")
            return False

        # Check that financial fields ARE present for buyer
        financial_fields = ['total_purchase_value', 'cost_avoidance']
        missing_financial = [f for f in financial_fields if f not in analytics]
        
        if missing_financial:
            self.log_test("Buyer Dashboard - Has Pricing Data", False, f"Missing financial data: {missing_financial}")
            return False
        
        self.log_test("Buyer Dashboard - Has Pricing Data", True, f"Correctly shows financial metrics")
        return True

    def test_capex_requests_data_filtering(self):
        """Test that capex requests are filtered based on role"""
        url = f"{self.base_url}/capex-requests"
        headers = {'Authorization': f'Bearer {self.token}'}
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                requests_data = response.json()
                
                if self.current_user['role'] == 'user':
                    # Check that financial fields are stripped for users
                    for req in requests_data:
                        financial_fields = ['initial_price', 'final_negotiated_price', 'vendor_code']
                        has_financial = any(field in req for field in financial_fields)
                        if has_financial:
                            self.log_test("User Capex Requests - No Financial Data", False, f"Found financial fields in request {req.get('id', 'unknown')}")
                            return False
                    
                    self.log_test("User Capex Requests - No Financial Data", True)
                    return True
                else:
                    # For non-user roles, financial data should be present (if available)
                    self.log_test("Non-User Capex Requests - Has Access", True)
                    return True
            else:
                self.log_test("Capex Requests API", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Capex Requests API", False, f"Error: {str(e)}")
            return False

    def test_sample_requests_access(self):
        """Test sample requests endpoint access"""
        url = f"{self.base_url}/sample-requests"
        headers = {'Authorization': f'Bearer {self.token}'}
        try:
            response = requests.get(url, headers=headers, timeout=30)
            success = response.status_code == 200
            self.log_test("Sample Requests Access", success, f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Sample Requests Access", False, f"Error: {str(e)}")
            return False

    def logout(self):
        """Clear authentication"""
        self.token = None
        self.current_user = None

def main():
    print("🚀 Testing Role-Based Access Control for Capex Portal")
    print("=" * 70)
    
    tester = RoleBasedTester()
    
    # Test accounts from review request
    test_scenarios = [
        {
            "email": "amit@capex.com",
            "password": "user123", 
            "role": "User",
            "tests": ["user_dashboard_no_pricing", "capex_requests_data_filtering", "sample_requests_access"]
        },
        {
            "email": "vijay@capex.com",
            "password": "buyer123",
            "role": "Buyer", 
            "tests": ["buyer_dashboard_has_pricing", "capex_requests_data_filtering", "sample_requests_access"]
        },
        {
            "email": "rajesh@capex.com",
            "password": "depthead123",
            "role": "Department Head",
            "tests": ["buyer_dashboard_has_pricing", "capex_requests_data_filtering", "sample_requests_access"]
        },
        {
            "email": "manoj@capex.com",
            "password": "capex123",
            "role": "Capex Head",
            "tests": ["buyer_dashboard_has_pricing", "capex_requests_data_filtering", "sample_requests_access"]
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n📋 TESTING {scenario['role'].upper()} ROLE")
        print("-" * 50)
        
        # Login
        if not tester.login(scenario["email"], scenario["password"], scenario["role"]):
            continue
        
        # Run role-specific tests
        for test_name in scenario["tests"]:
            if hasattr(tester, f"test_{test_name}"):
                getattr(tester, f"test_{test_name}")()
        
        tester.logout()
    
    # Print final results
    print("\n" + "=" * 70)
    print("📊 ROLE-BASED ACCESS CONTROL TEST RESULTS")
    print("=" * 70)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print failed tests
    failed_tests = [t for t in tester.test_results if not t['success']]
    if failed_tests:
        print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   • {test['test']}: {test['details']}")
    else:
        print(f"\n✅ ALL ROLE-BASED ACCESS TESTS PASSED!")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())