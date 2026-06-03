import requests
import sys
from datetime import datetime
import json

class CapexPortalTester:
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
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_seed_users(self):
        """Test seeding default users"""
        return self.run_test("Seed Default Users", "POST", "seed-users", 200)

    def test_login(self, email, password, role_name):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login as {role_name} ({email})",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response['user']
            print(f"   ✓ Logged in as {self.current_user['name']} ({self.current_user['role']})")
            return True
        return False

    def test_get_me(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_dashboard_analytics(self):
        """Test dashboard analytics"""
        return self.run_test("Dashboard Analytics", "GET", "analytics/dashboard", 200)

    def test_get_capex_requests(self):
        """Test getting capex requests"""
        return self.run_test("Get Capex Requests", "GET", "capex-requests", 200)

    def test_create_capex_request(self):
        """Test creating a capex request"""
        if not self.current_user:
            self.log_test("Create Capex Request", False, "No user logged in")
            return False, {}
            
        request_data = {
            "plant": "Jaipur",
            "department": "Railway Bearing",
            "requirement_description": "Test automation equipment for quality improvement",
            "requirement_type": "New",
            "cea_required": True,
            "justification": "Improve production efficiency and quality control"
        }
        
        return self.run_test("Create Capex Request", "POST", "capex-requests", 201, request_data)

    def test_get_notifications(self):
        """Test getting notifications"""
        return self.run_test("Get Notifications", "GET", "notifications", 200)

    def test_reference_data(self):
        """Test reference data endpoints"""
        tests = [
            ("Get Plants", "GET", "reference/plants", 200),
            ("Get Departments", "GET", "reference/departments", 200),
            ("Get Statuses", "GET", "reference/statuses", 200)
        ]
        
        all_passed = True
        for name, method, endpoint, status in tests:
            success, _ = self.run_test(name, method, endpoint, status)
            if not success:
                all_passed = False
        
        return all_passed

    def logout(self):
        """Clear authentication"""
        self.token = None
        self.current_user = None

def main():
    print("🚀 Starting Capex Portal Backend API Testing")
    print("=" * 60)
    
    tester = CapexPortalTester()
    
    # Test credentials from the review request
    test_accounts = [
        ("manoj@capex.com", "capex123", "Capex Head"),
        ("vijay@capex.com", "buyer123", "Buyer"),
        ("rajesh@capex.com", "depthead123", "Department Head"),
        ("amit@capex.com", "user123", "User")
    ]
    
    # 1. Health Check
    print("\n📋 BASIC CONNECTIVITY TESTS")
    print("-" * 40)
    tester.test_health_check()
    
    # 2. Seed users (might already exist)
    print("\n📋 USER SETUP TESTS")
    print("-" * 40)
    tester.test_seed_users()
    
    # 3. Test login for each role
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 40)
    
    login_results = {}
    for email, password, role in test_accounts:
        success = tester.test_login(email, password, role)
        login_results[role] = success
        
        if success:
            # Test authenticated endpoints
            tester.test_get_me()
            tester.test_dashboard_analytics()
            tester.test_get_capex_requests()
            tester.test_get_notifications()
            
            # Test creating request (only for user roles)
            if role in ["User", "Department Head"]:
                tester.test_create_capex_request()
        
        tester.logout()
        print()
    
    # 4. Test reference data (no auth required)
    print("\n📋 REFERENCE DATA TESTS")
    print("-" * 40)
    tester.test_reference_data()
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print login summary
    print(f"\n🔐 LOGIN RESULTS:")
    for role, success in login_results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"   {role}: {status}")
    
    # Print failed tests
    failed_tests = [t for t in tester.test_results if not t['success']]
    if failed_tests:
        print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   • {test['test']}: {test['details']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())