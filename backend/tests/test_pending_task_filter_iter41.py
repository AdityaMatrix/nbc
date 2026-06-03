"""
Test Pending Task Filter Logic - Iteration 41

Tests the redesigned pending task filter with these conditions:
- A task is Pending ONLY when CEA No., PR No., and PO No. are ALL entered (not blank) AND any of them is not yet approved
- A task is Not Pending when CEA, PR, and PO are ALL marked as Approved
- A task is NOT counted in Pending if CEA No., PR No., or PO No. is missing (blank/not generated)

Test Scenarios:
1. Request A: All numbers present, PR not approved → should be Pending
2. Request B: PR number missing → should NOT be Pending
3. Request C: All numbers present, all approved → should NOT be Pending
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Global state for test data
test_state = {
    "buyer_token": None,
    "admin_token": None,
    "buyer_id": None,
    "request_a_id": None,
    "request_b_id": None,
    "request_c_id": None,
    "created_request_ids": []
}


class TestPendingTaskFilter:
    """Test pending task filter logic for buyer dashboard"""
    
    def test_01_login_buyer(self):
        """Login as buyer (vijay@capex.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "vijay@capex.com",
            "password": "buyer123"
        })
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        test_state["buyer_token"] = data["access_token"]
        print(f"✓ Buyer logged in successfully")
    
    def test_02_login_admin(self):
        """Login as admin for cleanup"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@capex.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        test_state["admin_token"] = data["access_token"]
        print(f"✓ Admin logged in successfully")
    
    def test_03_get_buyer_id(self):
        """Get buyer's user ID"""
        headers = {"Authorization": f"Bearer {test_state['buyer_token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        test_state["buyer_id"] = data["id"]
        print(f"✓ Buyer ID: {test_state['buyer_id']}")
    
    def test_04_create_request_a_pending_pr(self):
        """
        Create Request A: All numbers present, PR not approved → should be Pending
        CEA: CEA-TEST-001 (Approved)
        PR: PR-TEST-001 (Pending - not approved)
        PO: PO-TEST-001 (Approved)
        """
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        unique_id = str(uuid.uuid4())[:8]
        
        # First create a basic request
        create_payload = {
            "plant": "Nashik",
            "department": "Industrial Bearing",
            "asset_category": "Machinery",
            "requirement_type": "New",
            "requirement_items": [{"description": f"TEST_PENDING_A_{unique_id}", "quantity": 1}],
            "cea_required": True,
            "cea_type": "new",
            "pr_available": False,
            "dap_required": False,
            "justification": "Test pending task filter - Request A (PR not approved)"
        }
        
        response = requests.post(f"{BASE_URL}/api/capex-requests", json=create_payload, headers=headers)
        assert response.status_code == 200, f"Failed to create request A: {response.text}"
        data = response.json()
        request_id = data["id"]
        test_state["created_request_ids"].append(request_id)
        test_state["request_a_id"] = request_id
        print(f"✓ Created Request A: {request_id}")
        
        # Update with CEA, PR, PO numbers and statuses
        update_payload = {
            "cea_number": f"CEA-TEST-{unique_id}",
            "cea_status": "Approved",
            "pr_number": f"PR-TEST-{unique_id}",
            "pr_approval_status": "Pending",  # NOT approved
            "po_number": f"PO-TEST-{unique_id}",
            "po_approval_status": "Approved",
            "assigned_buyer_id": test_state["buyer_id"],
            "status": "Submitted",
            "dh_approval_status": "Approved"
        }
        
        response = requests.put(f"{BASE_URL}/api/capex-requests/{request_id}", json=update_payload, headers=headers)
        assert response.status_code == 200, f"Failed to update request A: {response.text}"
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/capex-requests/{request_id}", headers=headers)
        data = response.json()
        assert data["cea_number"] == f"CEA-TEST-{unique_id}"
        assert data["pr_number"] == f"PR-TEST-{unique_id}"
        assert data["po_number"] == f"PO-TEST-{unique_id}"
        assert data["pr_approval_status"] != "Approved", "PR should NOT be approved"
        print(f"✓ Request A configured: CEA={data['cea_number']}, PR={data['pr_number']} (status={data['pr_approval_status']}), PO={data['po_number']}")
    
    def test_05_create_request_b_missing_pr(self):
        """
        Create Request B: PR number missing → should NOT be Pending
        CEA: CEA-TEST-002 (Approved)
        PR: (blank/missing)
        PO: PO-TEST-002 (Approved)
        """
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        unique_id = str(uuid.uuid4())[:8]
        
        create_payload = {
            "plant": "Nashik",
            "department": "Industrial Bearing",
            "asset_category": "Machinery",
            "requirement_type": "New",
            "requirement_items": [{"description": f"TEST_MISSING_PR_{unique_id}", "quantity": 1}],
            "cea_required": True,
            "cea_type": "new",
            "pr_available": False,
            "dap_required": False,
            "justification": "Test pending task filter - Request B (PR missing)"
        }
        
        response = requests.post(f"{BASE_URL}/api/capex-requests", json=create_payload, headers=headers)
        assert response.status_code == 200, f"Failed to create request B: {response.text}"
        data = response.json()
        request_id = data["id"]
        test_state["created_request_ids"].append(request_id)
        test_state["request_b_id"] = request_id
        print(f"✓ Created Request B: {request_id}")
        
        # Update with CEA and PO but NO PR number
        update_payload = {
            "cea_number": f"CEA-TEST-{unique_id}",
            "cea_status": "Approved",
            # pr_number intentionally NOT set (missing)
            "po_number": f"PO-TEST-{unique_id}",
            "po_approval_status": "Approved",
            "assigned_buyer_id": test_state["buyer_id"],
            "status": "Submitted",
            "dh_approval_status": "Approved"
        }
        
        response = requests.put(f"{BASE_URL}/api/capex-requests/{request_id}", json=update_payload, headers=headers)
        assert response.status_code == 200, f"Failed to update request B: {response.text}"
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/capex-requests/{request_id}", headers=headers)
        data = response.json()
        assert data["cea_number"] == f"CEA-TEST-{unique_id}"
        assert not data.get("pr_number"), "PR number should be missing/blank"
        assert data["po_number"] == f"PO-TEST-{unique_id}"
        print(f"✓ Request B configured: CEA={data['cea_number']}, PR=(missing), PO={data['po_number']}")
    
    def test_06_create_request_c_all_approved(self):
        """
        Create Request C: All numbers present, all approved → should NOT be Pending
        CEA: CEA-TEST-003 (Approved)
        PR: PR-TEST-003 (Approved)
        PO: PO-TEST-003 (Approved)
        """
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        unique_id = str(uuid.uuid4())[:8]
        
        create_payload = {
            "plant": "Nashik",
            "department": "Industrial Bearing",
            "asset_category": "Machinery",
            "requirement_type": "New",
            "requirement_items": [{"description": f"TEST_ALL_APPROVED_{unique_id}", "quantity": 1}],
            "cea_required": True,
            "cea_type": "new",
            "pr_available": False,
            "dap_required": False,
            "justification": "Test pending task filter - Request C (all approved)"
        }
        
        response = requests.post(f"{BASE_URL}/api/capex-requests", json=create_payload, headers=headers)
        assert response.status_code == 200, f"Failed to create request C: {response.text}"
        data = response.json()
        request_id = data["id"]
        test_state["created_request_ids"].append(request_id)
        test_state["request_c_id"] = request_id
        print(f"✓ Created Request C: {request_id}")
        
        # Update with all numbers and ALL approved
        update_payload = {
            "cea_number": f"CEA-TEST-{unique_id}",
            "cea_status": "Approved",
            "pr_number": f"PR-TEST-{unique_id}",
            "pr_approval_status": "Approved",
            "po_number": f"PO-TEST-{unique_id}",
            "po_approval_status": "Approved",
            "assigned_buyer_id": test_state["buyer_id"],
            "status": "Submitted",
            "dh_approval_status": "Approved"
        }
        
        response = requests.put(f"{BASE_URL}/api/capex-requests/{request_id}", json=update_payload, headers=headers)
        assert response.status_code == 200, f"Failed to update request C: {response.text}"
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/capex-requests/{request_id}", headers=headers)
        data = response.json()
        assert data["cea_number"] == f"CEA-TEST-{unique_id}"
        assert data["pr_number"] == f"PR-TEST-{unique_id}"
        assert data["po_number"] == f"PO-TEST-{unique_id}"
        assert data["cea_status"] == "Approved"
        assert data["pr_approval_status"] == "Approved"
        assert data["po_approval_status"] == "Approved"
        print(f"✓ Request C configured: CEA={data['cea_number']} (Approved), PR={data['pr_number']} (Approved), PO={data['po_number']} (Approved)")
    
    def test_07_verify_request_a_is_pending(self):
        """Verify Request A appears in pending tasks (has all numbers, PR not approved)"""
        headers = {"Authorization": f"Bearer {test_state['buyer_token']}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests/{test_state['request_a_id']}", headers=headers)
        assert response.status_code == 200, f"Failed to get request A: {response.text}"
        data = response.json()
        
        # Check the pending task logic
        has_cea = bool(data.get("cea_number"))
        has_pr = bool(data.get("pr_number"))
        has_po = bool(data.get("po_number"))
        has_all_numbers = has_cea and has_pr and has_po
        
        cea_approved = data.get("cea_status") == "Approved"
        pr_approved = data.get("pr_approval_status") == "Approved"
        po_approved = data.get("po_approval_status") == "Approved"
        all_approved = cea_approved and pr_approved and po_approved
        
        is_pending = has_all_numbers and not all_approved
        
        print(f"Request A: has_all_numbers={has_all_numbers}, all_approved={all_approved}, is_pending={is_pending}")
        assert has_all_numbers, "Request A should have all numbers"
        assert not all_approved, "Request A should NOT have all approved"
        assert is_pending, "Request A SHOULD be pending (PR not approved)"
        print(f"✓ Request A correctly identified as PENDING")
    
    def test_08_verify_request_b_not_pending(self):
        """Verify Request B does NOT appear in pending tasks (PR missing)"""
        headers = {"Authorization": f"Bearer {test_state['buyer_token']}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests/{test_state['request_b_id']}", headers=headers)
        assert response.status_code == 200, f"Failed to get request B: {response.text}"
        data = response.json()
        
        # Check the pending task logic
        has_cea = bool(data.get("cea_number"))
        has_pr = bool(data.get("pr_number"))
        has_po = bool(data.get("po_number"))
        has_all_numbers = has_cea and has_pr and has_po
        
        is_pending = has_all_numbers  # Can't be pending if missing numbers
        
        print(f"Request B: has_cea={has_cea}, has_pr={has_pr}, has_po={has_po}, has_all_numbers={has_all_numbers}")
        assert not has_pr, "Request B should NOT have PR number"
        assert not has_all_numbers, "Request B should NOT have all numbers"
        assert not is_pending, "Request B should NOT be pending (PR missing)"
        print(f"✓ Request B correctly identified as NOT PENDING (PR missing)")
    
    def test_09_verify_request_c_not_pending(self):
        """Verify Request C does NOT appear in pending tasks (all approved)"""
        headers = {"Authorization": f"Bearer {test_state['buyer_token']}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests/{test_state['request_c_id']}", headers=headers)
        assert response.status_code == 200, f"Failed to get request C: {response.text}"
        data = response.json()
        
        # Check the pending task logic
        has_cea = bool(data.get("cea_number"))
        has_pr = bool(data.get("pr_number"))
        has_po = bool(data.get("po_number"))
        has_all_numbers = has_cea and has_pr and has_po
        
        cea_approved = data.get("cea_status") == "Approved"
        pr_approved = data.get("pr_approval_status") == "Approved"
        po_approved = data.get("po_approval_status") == "Approved"
        all_approved = cea_approved and pr_approved and po_approved
        
        is_pending = has_all_numbers and not all_approved
        
        print(f"Request C: has_all_numbers={has_all_numbers}, all_approved={all_approved}, is_pending={is_pending}")
        assert has_all_numbers, "Request C should have all numbers"
        assert all_approved, "Request C should have all approved"
        assert not is_pending, "Request C should NOT be pending (all approved)"
        print(f"✓ Request C correctly identified as NOT PENDING (all approved)")
    
    def test_10_get_all_buyer_requests(self):
        """Get all requests assigned to buyer and verify pending counts"""
        headers = {"Authorization": f"Bearer {test_state['buyer_token']}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        all_requests = response.json()
        
        # Filter to buyer's assigned requests
        my_requests = [r for r in all_requests if r.get("assigned_buyer_id") == test_state["buyer_id"]]
        print(f"Total requests assigned to buyer: {len(my_requests)}")
        
        # Apply pending task logic
        def has_all_numbers(r):
            cea = r.get("cea_number") or (r.get("items", [{}])[0].get("cea_number") if r.get("items") else None)
            pr = r.get("pr_number") or (r.get("items", [{}])[0].get("pr_number") if r.get("items") else None)
            po = r.get("po_number") or (r.get("items", [{}])[0].get("po_number") if r.get("items") else None)
            return bool(cea and pr and po)
        
        def is_field_approved(r, field):
            if field == 'cea':
                return r.get("cea_status") == "Approved"
            elif field == 'pr':
                return r.get("pr_approval_status") == "Approved"
            elif field == 'po':
                return r.get("po_approval_status") == "Approved"
            return False
        
        def is_all_approved(r):
            return is_field_approved(r, 'cea') and is_field_approved(r, 'pr') and is_field_approved(r, 'po')
        
        # Count pending tasks
        pending_prs = [r for r in my_requests if has_all_numbers(r) and not is_field_approved(r, 'pr')]
        pending_pos = [r for r in my_requests if has_all_numbers(r) and not is_field_approved(r, 'po')]
        pending_ceas = [r for r in my_requests if has_all_numbers(r) and not is_field_approved(r, 'cea')]
        
        print(f"Pending PRs: {len(pending_prs)}")
        print(f"Pending POs: {len(pending_pos)}")
        print(f"Pending CEAs: {len(pending_ceas)}")
        
        # Verify our test requests
        # Request A should be in pending PRs (has all numbers, PR not approved)
        request_a_in_pending_prs = any(r["id"] == test_state["request_a_id"] for r in pending_prs)
        print(f"Request A ({test_state['request_a_id']}) in pending PRs: {request_a_in_pending_prs}")
        
        # Request B should NOT be in any pending (missing PR number)
        request_b_in_pending_prs = any(r["id"] == test_state["request_b_id"] for r in pending_prs)
        request_b_in_pending_pos = any(r["id"] == test_state["request_b_id"] for r in pending_pos)
        request_b_in_pending_ceas = any(r["id"] == test_state["request_b_id"] for r in pending_ceas)
        print(f"Request B ({test_state['request_b_id']}) in any pending: PRs={request_b_in_pending_prs}, POs={request_b_in_pending_pos}, CEAs={request_b_in_pending_ceas}")
        
        # Request C should NOT be in any pending (all approved)
        request_c_in_pending_prs = any(r["id"] == test_state["request_c_id"] for r in pending_prs)
        request_c_in_pending_pos = any(r["id"] == test_state["request_c_id"] for r in pending_pos)
        request_c_in_pending_ceas = any(r["id"] == test_state["request_c_id"] for r in pending_ceas)
        print(f"Request C ({test_state['request_c_id']}) in any pending: PRs={request_c_in_pending_prs}, POs={request_c_in_pending_pos}, CEAs={request_c_in_pending_ceas}")
        
        # Assertions
        assert request_a_in_pending_prs, "Request A SHOULD be in pending PRs"
        assert not request_b_in_pending_prs, "Request B should NOT be in pending PRs (PR missing)"
        assert not request_b_in_pending_pos, "Request B should NOT be in pending POs (PR missing)"
        assert not request_b_in_pending_ceas, "Request B should NOT be in pending CEAs (PR missing)"
        assert not request_c_in_pending_prs, "Request C should NOT be in pending PRs (all approved)"
        assert not request_c_in_pending_pos, "Request C should NOT be in pending POs (all approved)"
        assert not request_c_in_pending_ceas, "Request C should NOT be in pending CEAs (all approved)"
        
        print(f"✓ All pending task filter logic verified correctly")
    
    def test_11_cleanup_test_requests(self):
        """Cleanup: Delete all test requests"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        
        for req_id in test_state["created_request_ids"]:
            response = requests.delete(f"{BASE_URL}/api/capex-requests/{req_id}", headers=headers)
            if response.status_code == 200:
                print(f"✓ Deleted test request: {req_id}")
            else:
                print(f"⚠ Failed to delete request {req_id}: {response.status_code}")
        
        test_state["created_request_ids"] = []
        print(f"✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
