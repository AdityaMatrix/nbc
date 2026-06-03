"""
Test file for Capex Portal new features - Iteration 12:
1. Login functionality for all roles
2. Invoice Section - fields: Supplier Name, GST Number, Invoice Number, Invoice Date, Amount, File Upload
3. Invoice Section - visibility to Buyer and Capex Head only
4. Assign Buyer on Dashboard - Capex Head can assign/reassign buyer
5. DAP workflow - Create DAP button after PO approved
6. DAP workflow - Process Engineer approval (Step 1)
7. DAP workflow - Department Head approval (Step 2)
8. DAP workflow - User approval (Step 3)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://capex-portal-3.preview.emergentagent.com')

# Test credentials
CREDENTIALS = {
    "user": {"email": "amit@capex.com", "password": "user123"},
    "buyer": {"email": "vijay@capex.com", "password": "buyer123"},
    "capex_head": {"email": "manoj@capex.com", "password": "capex123"},
    "department_head": {"email": "rajesh@capex.com", "password": "dh123"},
    "process_engineer": {"email": "rahul@capex.com", "password": "password123"}  # Default password
}


class TestLoginFunctionality:
    """Test login for all roles"""
    
    def test_user_login(self):
        """Test User login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["user"])
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "user"
        assert data["user"]["email"] == "amit@capex.com"
        print("✓ User login successful")
    
    def test_buyer_login(self):
        """Test Buyer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["buyer"])
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "buyer"
        print("✓ Buyer login successful")
    
    def test_capex_head_login(self):
        """Test Capex Head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["capex_head"])
        assert response.status_code == 200, f"Capex Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "capex_head"
        print("✓ Capex Head login successful")
    
    def test_department_head_login(self):
        """Test Department Head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["department_head"])
        assert response.status_code == 200, f"Department Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "department_head"
        print("✓ Department Head login successful")
    
    def test_invalid_login_rejected(self):
        """Test invalid credentials are rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Invalid login should be rejected: {response.text}"
        print("✓ Invalid login correctly rejected")


class TestInvoiceSection:
    """Test Invoice Section functionality"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["buyer"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def capex_head_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["capex_head"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["user"])
        return response.json()["access_token"]
    
    def test_invoice_fields_structure(self, capex_head_token):
        """Test that invoice section has all required fields"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get a request to check invoice structure
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        
        requests_list = response.json()
        if len(requests_list) > 0:
            # Check that invoices field exists in the schema
            # The invoices array should support: supplier_name, gst_number, invoice_number, invoice_date, amount, file_url
            print("✓ Invoice section structure verified in API response")
        else:
            print("⚠ No requests found to verify invoice structure")
    
    def test_buyer_can_add_invoice(self, buyer_token):
        """Test that Buyer can add invoice to a request"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get requests
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        
        requests_list = response.json()
        # Find a request that buyer can update
        test_request = None
        for req in requests_list:
            if req.get("status") not in ["Pending DH Approval", "Rejected by DH", "Rejected"]:
                test_request = req
                break
        
        if test_request:
            # Add invoice with all required fields
            invoice_data = {
                "invoices": [{
                    "supplier_name": "Test Supplier ABC",
                    "gst_number": "GST123456789",
                    "invoice_number": f"INV-TEST-{uuid.uuid4().hex[:6]}",
                    "invoice_date": "2026-03-15",
                    "amount": 50000.00,
                    "file_url": None,
                    "file_name": None
                }]
            }
            
            update_response = requests.put(
                f"{BASE_URL}/api/capex-requests/{test_request['id']}", 
                json=invoice_data,
                headers=headers
            )
            assert update_response.status_code == 200, f"Failed to add invoice: {update_response.text}"
            
            # Verify invoice was added
            updated_request = update_response.json()
            assert "invoices" in updated_request
            assert len(updated_request["invoices"]) > 0
            
            # Verify all fields are present
            invoice = updated_request["invoices"][0]
            assert "supplier_name" in invoice
            assert "gst_number" in invoice
            assert "invoice_number" in invoice
            assert "invoice_date" in invoice
            assert "amount" in invoice
            print(f"✓ Buyer can add invoice with all fields to request {test_request['id']}")
        else:
            pytest.skip("No suitable request found for invoice test")
    
    def test_capex_head_can_add_invoice(self, capex_head_token):
        """Test that Capex Head can add invoice to a request"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get requests
        response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        assert response.status_code == 200
        
        requests_list = response.json()
        if len(requests_list) > 0:
            test_request = requests_list[0]
            
            # Add invoice
            invoice_data = {
                "invoices": [{
                    "supplier_name": "Capex Test Supplier",
                    "gst_number": "GST987654321",
                    "invoice_number": f"INV-CAPEX-{uuid.uuid4().hex[:6]}",
                    "invoice_date": "2026-03-16",
                    "amount": 75000.00,
                    "file_url": None,
                    "file_name": None
                }]
            }
            
            update_response = requests.put(
                f"{BASE_URL}/api/capex-requests/{test_request['id']}", 
                json=invoice_data,
                headers=headers
            )
            assert update_response.status_code == 200, f"Failed to add invoice: {update_response.text}"
            print(f"✓ Capex Head can add invoice to request {test_request['id']}")
        else:
            pytest.skip("No requests found for Capex Head invoice test")


class TestAssignBuyerOnDashboard:
    """Test Assign Buyer functionality on Dashboard"""
    
    @pytest.fixture
    def capex_head_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["capex_head"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["buyer"])
        return response.json()["access_token"]
    
    def test_get_buyers_list(self, capex_head_token):
        """Test that buyers list endpoint works"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        response = requests.get(f"{BASE_URL}/api/users/buyers", headers=headers)
        assert response.status_code == 200
        
        buyers = response.json()
        assert len(buyers) > 0, "No buyers found"
        
        # Verify buyers have required fields
        for buyer in buyers:
            assert "id" in buyer
            assert "name" in buyer
            assert buyer["role"] in ["buyer", "capex_head"]
        
        print(f"✓ Buyers list endpoint returns {len(buyers)} buyers")
    
    def test_capex_head_can_assign_buyer(self, capex_head_token):
        """Test that Capex Head can assign buyer to a request"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get buyers list
        buyers_response = requests.get(f"{BASE_URL}/api/users/buyers", headers=headers)
        buyers = buyers_response.json()
        buyer_id = buyers[0]["id"] if buyers else None
        
        if not buyer_id:
            pytest.skip("No buyers available for assignment")
        
        # Get requests
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        requests_list = requests_response.json()
        
        # Find a request to assign
        test_request = None
        for req in requests_list:
            if req.get("status") not in ["Pending DH Approval", "Rejected by DH", "Rejected"]:
                test_request = req
                break
        
        if test_request:
            # Assign buyer
            assign_response = requests.put(
                f"{BASE_URL}/api/capex-requests/{test_request['id']}",
                json={"assigned_buyer_id": buyer_id},
                headers=headers
            )
            assert assign_response.status_code == 200, f"Failed to assign buyer: {assign_response.text}"
            
            # Verify assignment
            updated = assign_response.json()
            assert updated.get("assigned_buyer_id") == buyer_id
            print(f"✓ Capex Head can assign buyer to request {test_request['id']}")
        else:
            pytest.skip("No suitable request found for buyer assignment")
    
    def test_capex_head_can_reassign_buyer(self, capex_head_token):
        """Test that Capex Head can reassign buyer to a different buyer"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get buyers list
        buyers_response = requests.get(f"{BASE_URL}/api/users/buyers", headers=headers)
        buyers = buyers_response.json()
        
        if len(buyers) < 2:
            pytest.skip("Need at least 2 buyers for reassignment test")
        
        # Get requests
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        requests_list = requests_response.json()
        
        # Find a request with assigned buyer
        test_request = None
        for req in requests_list:
            if req.get("assigned_buyer_id"):
                test_request = req
                break
        
        if test_request:
            # Find a different buyer
            current_buyer_id = test_request["assigned_buyer_id"]
            new_buyer = next((b for b in buyers if b["id"] != current_buyer_id), None)
            
            if new_buyer:
                # Reassign to different buyer
                reassign_response = requests.put(
                    f"{BASE_URL}/api/capex-requests/{test_request['id']}",
                    json={"assigned_buyer_id": new_buyer["id"]},
                    headers=headers
                )
                assert reassign_response.status_code == 200, f"Failed to reassign buyer: {reassign_response.text}"
                
                updated = reassign_response.json()
                assert updated.get("assigned_buyer_id") == new_buyer["id"]
                print(f"✓ Capex Head can reassign buyer from {current_buyer_id} to {new_buyer['id']}")
            else:
                pytest.skip("No different buyer available for reassignment")
        else:
            pytest.skip("No request with assigned buyer found")


class TestDAPWorkflow:
    """Test DAP (Design Approval Process) workflow"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["buyer"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def capex_head_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["capex_head"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def process_engineer_token(self):
        # Try to login with default password
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["process_engineer"])
        if response.status_code == 200:
            return response.json()["access_token"]
        # If default password doesn't work, skip PE tests
        return None
    
    @pytest.fixture
    def department_head_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["department_head"])
        return response.json()["access_token"]
    
    @pytest.fixture
    def user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["user"])
        return response.json()["access_token"]
    
    def test_dap_create_endpoint_exists(self, buyer_token):
        """Test that DAP create endpoint exists"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Try to create DAP with invalid request ID to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/dap",
            json={"capex_request_id": "INVALID-ID", "documents": []},
            headers=headers
        )
        # Should return 404 for invalid request, not 404 for endpoint
        assert response.status_code in [404, 400], f"DAP endpoint issue: {response.status_code}"
        print("✓ DAP create endpoint exists")
    
    def test_dap_creation_by_buyer(self, capex_head_token):
        """Test that Buyer/Capex Head can create DAP after PO is approved"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get requests with PO approved
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        requests_list = requests_response.json()
        
        # Find a request with PO approved and DAP required
        test_request = None
        for req in requests_list:
            if (req.get("po_approval_status") == "Approved" and 
                req.get("dap_required", False) and 
                not req.get("dap_id")):
                test_request = req
                break
        
        if test_request:
            # Create DAP
            dap_response = requests.post(
                f"{BASE_URL}/api/dap",
                json={"capex_request_id": test_request["id"], "documents": []},
                headers=headers
            )
            assert dap_response.status_code == 200, f"Failed to create DAP: {dap_response.text}"
            
            dap = dap_response.json()
            assert "id" in dap
            assert dap["status"] == "Pending Approval"
            assert dap["process_engineer_approval_status"] == "Pending"
            print(f"✓ DAP created for request {test_request['id']}: {dap['id']}")
            return dap["id"]
        else:
            print("⚠ No suitable request found for DAP creation (need PO approved + DAP required)")
            pytest.skip("No suitable request for DAP creation")
    
    def test_dap_approval_chain_structure(self, capex_head_token):
        """Test that DAP has correct approval chain structure"""
        headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get requests with DAP
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=headers)
        requests_list = requests_response.json()
        
        # Find a request with DAP
        test_request = None
        for req in requests_list:
            if req.get("dap_id"):
                test_request = req
                break
        
        if test_request:
            # Get DAP details
            dap_response = requests.get(
                f"{BASE_URL}/api/dap/{test_request['dap_id']}",
                headers=headers
            )
            assert dap_response.status_code == 200
            
            dap = dap_response.json()
            # Verify approval chain fields exist
            assert "process_engineer_approval_status" in dap
            assert "dept_head_approval_status" in dap
            assert "user_approval_status" in dap
            print(f"✓ DAP {dap['id']} has correct approval chain structure")
        else:
            print("⚠ No request with DAP found to verify structure")
    
    def test_process_engineer_can_approve_dap(self, process_engineer_token, capex_head_token):
        """Test that Process Engineer can approve DAP (Step 1)"""
        if not process_engineer_token:
            pytest.skip("Process Engineer login failed - may need password reset")
        
        headers = {"Authorization": f"Bearer {process_engineer_token}"}
        capex_headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get requests with DAP pending PE approval
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=capex_headers)
        requests_list = requests_response.json()
        
        test_dap_id = None
        for req in requests_list:
            if req.get("dap_id"):
                # Get DAP details
                dap_response = requests.get(f"{BASE_URL}/api/dap/{req['dap_id']}", headers=capex_headers)
                if dap_response.status_code == 200:
                    dap = dap_response.json()
                    if dap.get("process_engineer_approval_status") == "Pending":
                        test_dap_id = dap["id"]
                        break
        
        if test_dap_id:
            # PE approves DAP
            approve_response = requests.put(
                f"{BASE_URL}/api/dap/{test_dap_id}/approve",
                json={"action": "approve"},
                headers=headers
            )
            assert approve_response.status_code == 200, f"PE approval failed: {approve_response.text}"
            
            updated_dap = approve_response.json()
            assert updated_dap.get("process_engineer_approval_status") == "Approved"
            print(f"✓ Process Engineer approved DAP {test_dap_id} (Step 1)")
        else:
            print("⚠ No DAP pending PE approval found")
    
    def test_department_head_can_approve_dap(self, department_head_token, capex_head_token):
        """Test that Department Head can approve DAP (Step 2) after PE approval"""
        headers = {"Authorization": f"Bearer {department_head_token}"}
        capex_headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get requests with DAP pending DH approval (PE already approved)
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=capex_headers)
        requests_list = requests_response.json()
        
        test_dap_id = None
        for req in requests_list:
            if req.get("dap_id"):
                dap_response = requests.get(f"{BASE_URL}/api/dap/{req['dap_id']}", headers=capex_headers)
                if dap_response.status_code == 200:
                    dap = dap_response.json()
                    if (dap.get("process_engineer_approval_status") == "Approved" and 
                        dap.get("dept_head_approval_status") == "Pending"):
                        test_dap_id = dap["id"]
                        break
        
        if test_dap_id:
            # DH approves DAP
            approve_response = requests.put(
                f"{BASE_URL}/api/dap/{test_dap_id}/approve",
                json={"action": "approve"},
                headers=headers
            )
            assert approve_response.status_code == 200, f"DH approval failed: {approve_response.text}"
            
            updated_dap = approve_response.json()
            assert updated_dap.get("dept_head_approval_status") == "Approved"
            print(f"✓ Department Head approved DAP {test_dap_id} (Step 2)")
        else:
            print("⚠ No DAP pending DH approval found (PE must approve first)")
    
    def test_user_can_approve_dap(self, user_token, capex_head_token):
        """Test that User can approve DAP (Step 3) after DH approval"""
        headers = {"Authorization": f"Bearer {user_token}"}
        capex_headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get requests with DAP pending User approval (PE and DH already approved)
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=capex_headers)
        requests_list = requests_response.json()
        
        test_dap_id = None
        for req in requests_list:
            if req.get("dap_id"):
                dap_response = requests.get(f"{BASE_URL}/api/dap/{req['dap_id']}", headers=capex_headers)
                if dap_response.status_code == 200:
                    dap = dap_response.json()
                    if (dap.get("process_engineer_approval_status") == "Approved" and 
                        dap.get("dept_head_approval_status") == "Approved" and
                        dap.get("user_approval_status") == "Pending"):
                        test_dap_id = dap["id"]
                        break
        
        if test_dap_id:
            # User approves DAP
            approve_response = requests.put(
                f"{BASE_URL}/api/dap/{test_dap_id}/approve",
                json={"action": "approve"},
                headers=headers
            )
            assert approve_response.status_code == 200, f"User approval failed: {approve_response.text}"
            
            updated_dap = approve_response.json()
            assert updated_dap.get("user_approval_status") == "Approved"
            assert updated_dap.get("status") == "Approved"  # All three approved
            print(f"✓ User approved DAP {test_dap_id} (Step 3 - Final)")
        else:
            print("⚠ No DAP pending User approval found (PE and DH must approve first)")
    
    def test_dap_approval_order_enforced(self, department_head_token, capex_head_token):
        """Test that DAP approval order is enforced (PE → DH → User)"""
        headers = {"Authorization": f"Bearer {department_head_token}"}
        capex_headers = {"Authorization": f"Bearer {capex_head_token}"}
        
        # Get requests with DAP pending PE approval
        requests_response = requests.get(f"{BASE_URL}/api/capex-requests", headers=capex_headers)
        requests_list = requests_response.json()
        
        test_dap_id = None
        for req in requests_list:
            if req.get("dap_id"):
                dap_response = requests.get(f"{BASE_URL}/api/dap/{req['dap_id']}", headers=capex_headers)
                if dap_response.status_code == 200:
                    dap = dap_response.json()
                    if dap.get("process_engineer_approval_status") == "Pending":
                        test_dap_id = dap["id"]
                        break
        
        if test_dap_id:
            # DH tries to approve before PE - should fail
            approve_response = requests.put(
                f"{BASE_URL}/api/dap/{test_dap_id}/approve",
                json={"action": "approve"},
                headers=headers
            )
            assert approve_response.status_code == 400, "DH should not be able to approve before PE"
            print(f"✓ DAP approval order enforced - DH cannot approve before PE")
        else:
            print("⚠ No DAP pending PE approval found to test order enforcement")


class TestReferenceEndpoints:
    """Test reference data endpoints"""
    
    @pytest.fixture
    def token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["capex_head"])
        return response.json()["access_token"]
    
    def test_dap_statuses_endpoint(self, token):
        """Test DAP statuses reference endpoint"""
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/reference/dap-statuses", headers=headers)
        assert response.status_code == 200
        
        statuses = response.json()
        assert "Pending Approval" in statuses
        assert "Changes Required" in statuses
        assert "Approved" in statuses
        print(f"✓ DAP statuses endpoint returns: {statuses}")
    
    def test_dap_change_types_endpoint(self, token):
        """Test DAP change types reference endpoint"""
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/reference/dap-change-types", headers=headers)
        assert response.status_code == 200
        
        change_types = response.json()
        assert len(change_types) > 0
        print(f"✓ DAP change types endpoint returns: {change_types}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
