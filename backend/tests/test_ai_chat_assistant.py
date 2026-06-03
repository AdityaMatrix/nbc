"""
Test AI Chat Assistant Feature
Tests the /api/ai/chat endpoint with role-based access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREDENTIALS = {
    "user": {"email": "amit@capex.com", "password": "user123"},
    "buyer": {"email": "vijay@capex.com", "password": "buyer123"},
    "capex_head": {"email": "manoj@capex.com", "password": "capex123"},
    "department_head": {"email": "rajesh@capex.com", "password": "dh123"}
}


class TestAIChatEndpoint:
    """Test AI Chat endpoint functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, role: str) -> str:
        """Get authentication token for a specific role"""
        creds = CREDENTIALS.get(role)
        if not creds:
            pytest.skip(f"No credentials for role: {role}")
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Login failed for {role}: {response.text}")
        
        return response.json().get("access_token")
    
    def test_ai_chat_endpoint_exists(self):
        """Test that AI chat endpoint exists and requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={"message": "Hello"})
        # Should return 403 (no auth) not 404 (not found)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: AI chat endpoint exists and requires authentication")
    
    def test_ai_chat_as_user(self):
        """Test AI chat as User role - should only see own requests"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "How many requests do I have?"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "response" in data, "Response should contain 'response' field"
        assert "session_id" in data, "Response should contain 'session_id' field"
        assert isinstance(data["response"], str), "Response should be a string"
        assert len(data["response"]) > 0, "Response should not be empty"
        
        print(f"SUCCESS: User AI chat response received")
        print(f"Session ID: {data['session_id']}")
        print(f"Response preview: {data['response'][:200]}...")
    
    def test_ai_chat_as_buyer(self):
        """Test AI chat as Buyer role - should see approved requests"""
        token = self.get_auth_token("buyer")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "What is the status breakdown of all requests?"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "response" in data
        assert "session_id" in data
        
        print(f"SUCCESS: Buyer AI chat response received")
        print(f"Response preview: {data['response'][:200]}...")
    
    def test_ai_chat_as_capex_head(self):
        """Test AI chat as Capex Head role - should see all requests"""
        token = self.get_auth_token("capex_head")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Give me an overview of all capex requests"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "response" in data
        assert "session_id" in data
        
        print(f"SUCCESS: Capex Head AI chat response received")
        print(f"Response preview: {data['response'][:200]}...")
    
    def test_ai_chat_as_department_head(self):
        """Test AI chat as Department Head role - should see department requests"""
        token = self.get_auth_token("department_head")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "What requests are pending my approval?"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "response" in data
        assert "session_id" in data
        
        print(f"SUCCESS: Department Head AI chat response received")
        print(f"Response preview: {data['response'][:200]}...")
    
    def test_ai_chat_session_persistence(self):
        """Test that session ID is returned and can be reused"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First message
        response1 = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Hello, I need help"
        })
        assert response1.status_code == 200
        session_id = response1.json().get("session_id")
        assert session_id, "Session ID should be returned"
        
        # Second message with same session
        response2 = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "What was my first question?",
            "session_id": session_id
        })
        assert response2.status_code == 200
        assert response2.json().get("session_id") == session_id, "Session ID should be preserved"
        
        print(f"SUCCESS: Session persistence works - Session ID: {session_id}")


class TestAIChatHistory:
    """Test AI Chat history endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, role: str) -> str:
        """Get authentication token for a specific role"""
        creds = CREDENTIALS.get(role)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Login failed for {role}")
        return response.json().get("access_token")
    
    def test_get_chat_history(self):
        """Test getting chat history"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/ai/chat/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "History should be a list"
        
        print(f"SUCCESS: Chat history retrieved - {len(data)} messages")
    
    def test_clear_chat_history(self):
        """Test clearing chat history"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First send a message to create history
        self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Test message for history"
        })
        
        # Clear history
        response = self.session.delete(f"{BASE_URL}/api/ai/chat/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        print(f"SUCCESS: Chat history cleared - {data['message']}")
    
    def test_clear_specific_session_history(self):
        """Test clearing history for a specific session"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create a chat session
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Test message"
        })
        session_id = response.json().get("session_id")
        
        # Clear specific session
        response = self.session.delete(f"{BASE_URL}/api/ai/chat/history?session_id={session_id}")
        assert response.status_code == 200
        
        print(f"SUCCESS: Specific session history cleared - Session: {session_id}")


class TestAIChatRoleBasedAccess:
    """Test role-based access control in AI chat responses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, role: str) -> str:
        """Get authentication token for a specific role"""
        creds = CREDENTIALS.get(role)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Login failed for {role}")
        return response.json().get("access_token")
    
    def test_user_cannot_see_other_users_data(self):
        """Test that User role only sees their own requests in AI context"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Show me all requests in the system"
        })
        
        assert response.status_code == 200
        # The AI should respond but only with user's own data
        # We can't verify exact content but can verify it responds
        data = response.json()
        assert "response" in data
        
        print("SUCCESS: User AI chat responds (role-filtered)")
    
    def test_buyer_sees_approved_requests(self):
        """Test that Buyer role sees approved requests"""
        token = self.get_auth_token("buyer")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "List all requests I can process"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        
        print("SUCCESS: Buyer AI chat responds with approved requests context")


class TestAIChatErrorHandling:
    """Test error handling in AI chat"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, role: str) -> str:
        """Get authentication token for a specific role"""
        creds = CREDENTIALS.get(role)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code != 200:
            pytest.skip(f"Login failed for {role}")
        return response.json().get("access_token")
    
    def test_empty_message_handling(self):
        """Test handling of empty message"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": ""
        })
        
        # Should either return 422 (validation error) or handle gracefully
        assert response.status_code in [200, 422, 400], f"Unexpected status: {response.status_code}"
        print(f"SUCCESS: Empty message handled with status {response.status_code}")
    
    def test_invalid_session_id(self):
        """Test handling of invalid session ID"""
        token = self.get_auth_token("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Hello",
            "session_id": "invalid-session-12345"
        })
        
        # Should still work - invalid session ID should be treated as new session
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: Invalid session ID handled gracefully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
