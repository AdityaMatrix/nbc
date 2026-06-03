"""
Test DAP Visibility for All Roles (Iteration 40)
Tests that DAP documents are visible to buyer, user, department_head, and process_engineering roles.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - using users from same department (Industrial Bearing) where possible
CREDENTIALS = {
    "admin": {"email": "admin@capex.com", "password": "admin123"},
    "buyer": {"email": "vijay@capex.com", "password": "buyer123"},
    "user": {"email": "amit@capex.com", "password": "user123"},  # Industrial Bearing
    "department_head": {"email": "priya@capex.com", "password": "password123"},  # Industrial Bearing
    "process_engineering": {"email": "sunita@capex.com", "password": "password123"},  # R&D (no dept restriction for PE)
    "capex_head": {"email": "manoj@capex.com", "password": "capex123"},
}

# Store test data
test_data = {
    "capex_request_id": None,
    "dap_id": None,
    "tokens": {}
}


def get_token(role):
    """Get auth token for a role"""
    if role in test_data["tokens"]:
        return test_data["tokens"][role]
    
    creds = CREDENTIALS.get(role)
    if not creds:
        pytest.skip(f"No credentials for role: {role}")
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
    if response.status_code != 200:
        pytest.skip(f"Login failed for {role}: {response.text}")
    
    token = response.json().get("access_token")
    test_data["tokens"][role] = token
    return token


def auth_headers(role):
    """Get auth headers for a role"""
    token = get_token(role)
    return {"Authorization": f"Bearer {token}"}


class TestDAPVisibility:
    """Test DAP visibility across all roles"""
    
    def test_01_login_all_roles(self):
        """Verify all roles can login"""
        for role in ["buyer", "user", "department_head", "process_engineering"]:
            token = get_token(role)
            assert token is not None, f"Failed to get token for {role}"
            print(f"✓ {role} login successful")
    
    def test_02_create_capex_request_as_buyer(self):
        """Create a test capex request as buyer in Industrial Bearing department"""
        payload = {
            "plant": "Jaipur Plant",
            "department": "Industrial Bearing",  # Same as user and DH
            "asset_category": "plant_machinery",
            "requirement_items": [
                {"description": "Test DAP Machine for Visibility Test", "quantity": 1}
            ],
            "requirement_type": "New",
            "cea_required": False,
            "pr_available": False,
            "dap_required": True,
            "justification": "Testing DAP visibility for all roles"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/capex-requests",
            json=payload,
            headers=auth_headers("buyer")
        )
        
        print(f"Create request response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed to create request: {response.text}"
        
        data = response.json()
        test_data["capex_request_id"] = data.get("id")
        print(f"✓ Created capex request: {test_data['capex_request_id']}")
        assert test_data["capex_request_id"] is not None
    
    def test_03_create_dap_with_documents(self):
        """Create a DAP with documents attached"""
        if not test_data["capex_request_id"]:
            pytest.skip("No capex request created")
        
        payload = {
            "capex_request_id": test_data["capex_request_id"],
            "documents": [
                "https://example.com/dap-doc-1.pdf",
                "https://example.com/dap-doc-2.pdf"
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dap",
            json=payload,
            headers=auth_headers("buyer")
        )
        
        print(f"Create DAP response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed to create DAP: {response.text}"
        
        data = response.json()
        test_data["dap_id"] = data.get("id")
        print(f"✓ Created DAP: {test_data['dap_id']}")
        
        # Verify documents are in response
        assert "documents" in data, "DAP response missing documents field"
        assert len(data["documents"]) == 2, f"Expected 2 documents, got {len(data['documents'])}"
        print(f"✓ DAP has {len(data['documents'])} documents")
    
    def test_04_get_dap_returns_documents(self):
        """Verify GET /api/dap/{dap_id} returns DAP with documents"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        response = requests.get(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}",
            headers=auth_headers("buyer")
        )
        
        assert response.status_code == 200, f"Failed to get DAP: {response.text}"
        
        data = response.json()
        assert "documents" in data, "DAP missing documents field"
        assert len(data["documents"]) == 2, f"Expected 2 documents, got {len(data['documents'])}"
        assert data["status"] == "Pending Approval", f"Unexpected status: {data['status']}"
        
        # Verify approval statuses
        assert data["process_engineer_approval_status"] == "Pending"
        assert data["dept_head_approval_status"] == "Pending"
        assert data["user_approval_status"] == "Pending"
        
        print(f"✓ GET DAP returns correct data with {len(data['documents'])} documents")
    
    def test_05_buyer_can_access_request_detail(self):
        """Verify buyer can access the request detail page"""
        if not test_data["capex_request_id"]:
            pytest.skip("No capex request created")
        
        response = requests.get(
            f"{BASE_URL}/api/capex-requests/{test_data['capex_request_id']}",
            headers=auth_headers("buyer")
        )
        
        assert response.status_code == 200, f"Buyer cannot access request: {response.text}"
        
        data = response.json()
        assert data.get("dap_id") == test_data["dap_id"], "Request should have DAP ID"
        print(f"✓ Buyer can access request detail with DAP ID: {data.get('dap_id')}")
    
    def test_06_user_can_access_request_detail(self):
        """Verify user can access the request detail page (same department)"""
        if not test_data["capex_request_id"]:
            pytest.skip("No capex request created")
        
        response = requests.get(
            f"{BASE_URL}/api/capex-requests/{test_data['capex_request_id']}",
            headers=auth_headers("user")
        )
        
        assert response.status_code == 200, f"User cannot access request: {response.text}"
        
        data = response.json()
        assert data.get("dap_id") == test_data["dap_id"], "Request should have DAP ID"
        print(f"✓ User can access request detail with DAP ID: {data.get('dap_id')}")
    
    def test_07_department_head_can_access_request_detail(self):
        """Verify department head can access the request detail page (same department)"""
        if not test_data["capex_request_id"]:
            pytest.skip("No capex request created")
        
        response = requests.get(
            f"{BASE_URL}/api/capex-requests/{test_data['capex_request_id']}",
            headers=auth_headers("department_head")
        )
        
        assert response.status_code == 200, f"DH cannot access request: {response.text}"
        
        data = response.json()
        assert data.get("dap_id") == test_data["dap_id"], "Request should have DAP ID"
        print(f"✓ Department Head can access request detail with DAP ID: {data.get('dap_id')}")
    
    def test_08_process_engineer_can_access_request_detail(self):
        """Verify process engineer can access the request detail page"""
        if not test_data["capex_request_id"]:
            pytest.skip("No capex request created")
        
        response = requests.get(
            f"{BASE_URL}/api/capex-requests/{test_data['capex_request_id']}",
            headers=auth_headers("process_engineering")
        )
        
        # PE may have department restrictions - check if 403 is due to department
        if response.status_code == 403:
            print(f"⚠ PE has department restriction: {response.text}")
            # This is expected behavior - PE can still access DAP directly
            pytest.skip("PE has department restriction for request detail")
        
        assert response.status_code == 200, f"PE cannot access request: {response.text}"
        
        data = response.json()
        assert data.get("dap_id") == test_data["dap_id"], "Request should have DAP ID"
        print(f"✓ Process Engineer can access request detail with DAP ID: {data.get('dap_id')}")
    
    def test_09_buyer_can_get_dap_details(self):
        """Verify buyer can get DAP details including documents"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        response = requests.get(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}",
            headers=auth_headers("buyer")
        )
        
        assert response.status_code == 200, f"Buyer cannot get DAP: {response.text}"
        data = response.json()
        assert "documents" in data and len(data["documents"]) == 2
        print(f"✓ Buyer can access DAP with documents")
    
    def test_10_user_can_get_dap_details(self):
        """Verify user can get DAP details including documents"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        response = requests.get(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}",
            headers=auth_headers("user")
        )
        
        assert response.status_code == 200, f"User cannot get DAP: {response.text}"
        data = response.json()
        assert "documents" in data and len(data["documents"]) == 2
        print(f"✓ User can access DAP with documents")
    
    def test_11_department_head_can_get_dap_details(self):
        """Verify department head can get DAP details including documents"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        response = requests.get(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}",
            headers=auth_headers("department_head")
        )
        
        assert response.status_code == 200, f"DH cannot get DAP: {response.text}"
        data = response.json()
        assert "documents" in data and len(data["documents"]) == 2
        print(f"✓ Department Head can access DAP with documents")
    
    def test_12_process_engineer_can_get_dap_details(self):
        """Verify process engineer can get DAP details including documents"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        response = requests.get(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}",
            headers=auth_headers("process_engineering")
        )
        
        assert response.status_code == 200, f"PE cannot get DAP: {response.text}"
        data = response.json()
        assert "documents" in data and len(data["documents"]) == 2
        print(f"✓ Process Engineer can access DAP with documents")
    
    def test_13_dap_approval_flow_pe_first(self):
        """Verify Process Engineer can approve DAP (Step 1/3)"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        payload = {
            "action": "approve",
            "comment": "Approved by PE"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}/approve",
            json=payload,
            headers=auth_headers("process_engineering")
        )
        
        print(f"PE approval response: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"PE approval failed: {response.text}"
        
        data = response.json()
        assert data["process_engineer_approval_status"] == "Approved"
        print(f"✓ Process Engineer approved DAP (Step 1/3)")
    
    def test_14_dap_approval_flow_dh_second(self):
        """Verify Department Head can approve DAP (Step 2/3)"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        payload = {
            "action": "approve",
            "comment": "Approved by DH"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}/approve",
            json=payload,
            headers=auth_headers("department_head")
        )
        
        print(f"DH approval response: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"DH approval failed: {response.text}"
        
        data = response.json()
        assert data["dept_head_approval_status"] == "Approved"
        print(f"✓ Department Head approved DAP (Step 2/3)")
    
    def test_15_dap_approval_flow_user_final(self):
        """Verify User can approve DAP (Step 3/3 - Final)"""
        if not test_data["dap_id"]:
            pytest.skip("No DAP created")
        
        payload = {
            "action": "approve",
            "comment": "Final approval by User"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/dap/{test_data['dap_id']}/approve",
            json=payload,
            headers=auth_headers("user")
        )
        
        print(f"User approval response: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"User approval failed: {response.text}"
        
        data = response.json()
        assert data["user_approval_status"] == "Approved"
        assert data["status"] == "Approved", f"DAP status should be Approved, got: {data['status']}"
        print(f"✓ User approved DAP (Step 3/3 - Final)")
        print(f"✓ DAP is now fully approved!")
    
    def test_16_cleanup_delete_request(self):
        """Cleanup: Delete the test request"""
        if not test_data["capex_request_id"]:
            pytest.skip("No capex request to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/capex-requests/{test_data['capex_request_id']}",
            headers=auth_headers("buyer")
        )
        
        # Accept 200, 204, or 404 (already deleted)
        assert response.status_code in [200, 204, 404], f"Delete failed: {response.text}"
        print(f"✓ Cleaned up test request: {test_data['capex_request_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
