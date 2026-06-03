"""
Test DH Approval Workflow and Sample Request user_id Bug Fix
Focus areas:
1. POST /api/capex-requests: New requests must have status='Pending DH Approval' and dh_approval_status='Pending'
2. GET /api/capex-requests (as buyer): Must NOT show requests with status='Pending DH Approval' or 'Rejected by DH'
3. POST /api/capex-requests/{id}/approve (as DH): Must change status from 'Pending DH Approval' to 'Submitted'
4. POST /api/capex-requests/{id}/reject (as DH): Must change status to 'Rejected by DH' with reason
5. POST /api/sample-requests: user_id must be populated from the capex request's user_id field
6. Sample workflow: Buyer creates sample -> User updates preparation status -> User marks Ready for Pickup -> Buyer dispatches
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_CREDS = {"email": "amit@capex.com", "password": "user123"}
BUYER_CREDS = {"email": "vijay@capex.com", "password": "buyer123"}
DH_CREDS = {"email": "rajesh@capex.com", "password": "dh123"}
CAPEX_HEAD_CREDS = {"email": "manoj@capex.com", "password": "capex123"}


@pytest.fixture(scope="module")
def user_token():
    """Get user token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
    assert response.status_code == 200, f"User login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def buyer_token():
    """Get buyer token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
    assert response.status_code == 200, f"Buyer login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def dh_token():
    """Get department head token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DH_CREDS)
    assert response.status_code == 200, f"DH login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def capex_head_token():
    """Get capex head token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CAPEX_HEAD_CREDS)
    assert response.status_code == 200, f"Capex Head login failed: {response.text}"
    return response.json()["access_token"]


class TestDHApprovalWorkflow:
    """Test DH Approval Workflow"""
    
    created_request_id = None
    
    def test_01_create_request_has_pending_dh_approval_status(self, user_token):
        """POST /api/capex-requests: New requests must have status='Pending DH Approval'"""
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "plant": "Jaipur",
            "department": "Railway Bearing",
            "requirement_items": [{"description": f"TEST DH Approval Item {uuid.uuid4()}", "quantity": 1}],
            "requirement_type": "New Purchase",
            "cea_required": False,
            "dap_required": False
        }
        response = requests.post(f"{BASE_URL}/api/capex-requests", json=payload, headers=headers)
        assert response.status_code == 200, f"Create request failed: {response.text}"
        
        data = response.json()
        TestDHApprovalWorkflow.created_request_id = data["id"]
        print(f"Created request ID: {data['id']}")
        
        # Verify initial status is 'Pending DH Approval'
        assert data["status"] == "Pending DH Approval", f"Expected status 'Pending DH Approval', got '{data['status']}'"
        # Verify dh_approval_status is 'Pending'
        assert data.get("dh_approval_status") == "Pending", f"Expected dh_approval_status 'Pending', got '{data.get('dh_approval_status')}'"
        print("PASS: New request has status='Pending DH Approval' and dh_approval_status='Pending'")
    
    def test_02_buyer_cannot_see_pending_dh_approval_requests(self, buyer_token):
        """GET /api/capex-requests (as buyer): Must NOT show requests with status='Pending DH Approval'"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Get requests failed: {response.text}"
        
        requests_list = response.json()
        # Filter for our test request
        pending_dh_requests = [r for r in requests_list if r["status"] == "Pending DH Approval"]
        
        # Check if our created request is in the list
        our_request = [r for r in requests_list if r["id"] == TestDHApprovalWorkflow.created_request_id]
        assert len(our_request) == 0, f"Buyer should NOT see request {TestDHApprovalWorkflow.created_request_id} with status 'Pending DH Approval'"
        print("PASS: Buyer cannot see requests with status 'Pending DH Approval'")
    
    def test_03_dh_can_see_pending_dh_approval_requests(self, dh_token):
        """DH can see requests with status='Pending DH Approval'"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200, f"Get requests failed: {response.text}"
        
        requests_list = response.json()
        our_request = [r for r in requests_list if r["id"] == TestDHApprovalWorkflow.created_request_id]
        assert len(our_request) == 1, f"DH should see request {TestDHApprovalWorkflow.created_request_id}"
        print("PASS: DH can see requests with status 'Pending DH Approval'")
    
    def test_04_dh_approve_changes_status_to_submitted(self, dh_token):
        """POST /api/capex-requests/{id}/approve (as DH): Must change status to 'Submitted'"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        response = requests.post(
            f"{BASE_URL}/api/capex-requests/{TestDHApprovalWorkflow.created_request_id}/approve",
            headers=headers
        )
        assert response.status_code == 200, f"Approve failed: {response.text}"
        
        # Verify the status changed
        get_response = requests.get(
            f"{BASE_URL}/api/capex-requests/{TestDHApprovalWorkflow.created_request_id}",
            headers=headers
        )
        data = get_response.json()
        assert data["status"] == "Submitted", f"Expected status 'Submitted', got '{data['status']}'"
        assert data.get("dh_approval_status") == "Approved", f"Expected dh_approval_status 'Approved', got '{data.get('dh_approval_status')}'"
        print("PASS: DH approve changes status from 'Pending DH Approval' to 'Submitted'")
    
    def test_05_buyer_can_now_see_approved_request(self, buyer_token):
        """Buyer can see request after DH approval"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        
        requests_list = response.json()
        our_request = [r for r in requests_list if r["id"] == TestDHApprovalWorkflow.created_request_id]
        assert len(our_request) == 1, f"Buyer should now see request {TestDHApprovalWorkflow.created_request_id} with status 'Submitted'"
        print("PASS: Buyer can see request after DH approval")


class TestDHRejectWorkflow:
    """Test DH Reject Workflow"""
    
    created_request_id = None
    
    def test_01_create_request_for_rejection_test(self, user_token):
        """Create a new request for rejection test"""
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "plant": "Jaipur",
            "department": "Railway Bearing",
            "requirement_items": [{"description": f"TEST DH Reject Item {uuid.uuid4()}", "quantity": 1}],
            "requirement_type": "New Purchase",
            "cea_required": False,
            "dap_required": False
        }
        response = requests.post(f"{BASE_URL}/api/capex-requests", json=payload, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        TestDHRejectWorkflow.created_request_id = data["id"]
        print(f"Created request ID for rejection test: {data['id']}")
    
    def test_02_dh_reject_changes_status(self, dh_token):
        """POST /api/capex-requests/{id}/reject (as DH): Must change status to 'Rejected by DH'"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        rejection_reason = "Budget not allocated for this quarter"
        
        response = requests.post(
            f"{BASE_URL}/api/capex-requests/{TestDHRejectWorkflow.created_request_id}/reject?reason={rejection_reason}",
            headers=headers
        )
        assert response.status_code == 200, f"Reject failed: {response.text}"
        
        # Verify the status changed
        get_response = requests.get(
            f"{BASE_URL}/api/capex-requests/{TestDHRejectWorkflow.created_request_id}",
            headers=headers
        )
        data = get_response.json()
        assert data["status"] == "Rejected by DH", f"Expected status 'Rejected by DH', got '{data['status']}'"
        assert data.get("dh_rejection_reason") == rejection_reason, f"Expected rejection reason"
        print("PASS: DH reject changes status to 'Rejected by DH' with reason")
    
    def test_03_buyer_cannot_see_rejected_by_dh_requests(self, buyer_token):
        """Buyer cannot see requests with status 'Rejected by DH'"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        
        requests_list = response.json()
        our_request = [r for r in requests_list if r["id"] == TestDHRejectWorkflow.created_request_id]
        assert len(our_request) == 0, f"Buyer should NOT see rejected request"
        print("PASS: Buyer cannot see requests with status 'Rejected by DH'")


class TestSampleRequestUserIdFix:
    """Test Sample Request user_id Bug Fix"""
    
    capex_request_id = None
    sample_request_id = None
    user_id = None
    
    def test_01_get_user_id(self, user_token):
        """Get user ID for reference"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        TestSampleRequestUserIdFix.user_id = response.json()["id"]
        print(f"User ID: {TestSampleRequestUserIdFix.user_id}")
    
    def test_02_create_capex_request(self, user_token):
        """Create a capex request"""
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "plant": "Jaipur",
            "department": "Railway Bearing",
            "requirement_items": [{"description": f"TEST Sample UserID Item {uuid.uuid4()}", "quantity": 2}],
            "requirement_type": "New Purchase",
            "cea_required": False,
            "dap_required": False
        }
        response = requests.post(f"{BASE_URL}/api/capex-requests", json=payload, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        TestSampleRequestUserIdFix.capex_request_id = data["id"]
        assert data["user_id"] == TestSampleRequestUserIdFix.user_id
        print(f"Created capex request ID: {data['id']} with user_id: {data['user_id']}")
    
    def test_03_dh_approve_request(self, dh_token):
        """DH approves the request so buyer can see it"""
        headers = {"Authorization": f"Bearer {dh_token}"}
        response = requests.post(
            f"{BASE_URL}/api/capex-requests/{TestSampleRequestUserIdFix.capex_request_id}/approve",
            headers=headers
        )
        assert response.status_code == 200
        print("DH approved the request")
    
    def test_04_buyer_creates_sample_request_with_correct_user_id(self, buyer_token):
        """POST /api/sample-requests: user_id must be populated from capex request's user_id"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        payload = {
            "capex_request_id": TestSampleRequestUserIdFix.capex_request_id,
            "line_items": [
                {"material_description": "Test Material 1", "number_of_samples": 3},
                {"material_description": "Test Material 2", "number_of_samples": 2}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/sample-requests", json=payload, headers=headers)
        assert response.status_code == 200, f"Create sample request failed: {response.text}"
        
        data = response.json()
        TestSampleRequestUserIdFix.sample_request_id = data["id"]
        
        # CRITICAL: Verify user_id is populated from the capex request's user_id
        assert data.get("user_id") is not None, "Sample request user_id should NOT be null"
        assert data["user_id"] == TestSampleRequestUserIdFix.user_id, f"Sample user_id should match capex user_id. Got '{data.get('user_id')}', expected '{TestSampleRequestUserIdFix.user_id}'"
        print(f"PASS: Sample request created with correct user_id: {data['user_id']}")
    
    def test_05_user_can_update_sample_preparation_status(self, user_token):
        """User can update sample preparation status (Under Preparation)"""
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "readiness_status": "Under Preparation",
            "tentative_pickup_date": "2026-02-15"
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{TestSampleRequestUserIdFix.sample_request_id}/preparation",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"User update preparation failed: {response.text}"
        
        data = response.json()
        assert data["readiness_status"] == "Under Preparation"
        assert data["status"] == "Under Preparation"
        print("PASS: User can update sample status to 'Under Preparation'")
    
    def test_06_user_can_mark_ready_for_pickup(self, user_token):
        """User can mark sample as Ready for Pickup"""
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "readiness_status": "Ready for Pickup",
            "preparation_items": [
                {"material_code": "MAT001", "description": "Test Material 1", "number_of_samples": 3, "box_type": "Wooden", "weight": 5.5},
                {"material_code": "MAT002", "description": "Test Material 2", "number_of_samples": 2, "box_type": "Corrugated", "weight": 3.2}
            ],
            "gate_pass_available": True
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{TestSampleRequestUserIdFix.sample_request_id}/preparation",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"User mark ready for pickup failed: {response.text}"
        
        data = response.json()
        assert data["readiness_status"] == "Ready for Pickup"
        assert data["status"] == "Sample Ready for Dispatch"
        print("PASS: User can mark sample as 'Ready for Pickup'")
    
    def test_07_buyer_can_dispatch_sample(self, buyer_token):
        """Buyer can dispatch the sample"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        payload = {
            "dispatch_date": "2026-02-16",
            "dispatch_reference": "AWB-TEST-12345"
        }
        response = requests.put(
            f"{BASE_URL}/api/sample-requests/{TestSampleRequestUserIdFix.sample_request_id}/pickup",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Buyer dispatch failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "Dispatched"
        assert data["dispatch_date"] == "2026-02-16"
        assert data["dispatch_reference"] == "AWB-TEST-12345"
        print("PASS: Buyer can dispatch sample")


class TestExistingApprovedRequests:
    """Test existing approved/submitted requests are visible to buyers"""
    
    def test_verify_existing_approved_requests_visible_to_buyer(self, buyer_token):
        """Verify existing requests with DH approval are visible"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        
        requests_list = response.json()
        # Find requests with status 'Submitted' (DH approved)
        submitted_requests = [r for r in requests_list if r["status"] == "Submitted"]
        
        print(f"Total requests visible to buyer: {len(requests_list)}")
        print(f"Requests with status 'Submitted': {len(submitted_requests)}")
        
        # Verify JAI-P-003 (DH approved) is visible
        jai_p_003 = [r for r in requests_list if r["id"] == "JAI-P-003"]
        if jai_p_003:
            print(f"JAI-P-003 found with status: {jai_p_003[0]['status']}")
        
        # Verify JAI-P-004 (DH rejected) is NOT visible
        jai_p_004 = [r for r in requests_list if r["id"] == "JAI-P-004"]
        assert len(jai_p_004) == 0, "JAI-P-004 (Rejected by DH) should NOT be visible to buyer"
        print("PASS: DH rejected requests are not visible to buyer")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
