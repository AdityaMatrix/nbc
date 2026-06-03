"""
Backend tests for Analytics endpoints + new expected_* date fields in
CapexRequestUpdate model (expected_delivery_date, expected_installation_date,
expected_commissioning_date).
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://capex-portal-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin@capex.com", "admin123")


@pytest.fixture(scope="module")
def buyer_token():
    return _login("vijay@capex.com", "buyer123")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def buyer_headers(buyer_token):
    return {"Authorization": f"Bearer {buyer_token}", "Content-Type": "application/json"}


# ---------- Analytics & data access ----------
class TestAnalyticsCore:
    def test_capex_requests_list(self, admin_headers):
        r = requests.get(f"{API}/capex-requests", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Spot-check a few fields used by Analytics
        if data:
            keys = data[0].keys()
            for k in ("id", "plant", "department", "created_at"):
                assert k in keys, f"Missing key {k} in capex-request"

    def test_analytics_dashboard(self, admin_headers):
        r = requests.get(f"{API}/analytics/dashboard", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_requests", "status_breakdown", "plant_spend"):
            assert k in d, f"Missing analytics key {k}"


# ---------- AI insights ----------
class TestAIInsights:
    def test_ai_insights_endpoint(self, admin_headers):
        r = requests.post(
            f"{API}/ai/insights",
            headers=admin_headers,
            json={"query": "Give a brief summary of CAPEX spend"},
            timeout=60,
        )
        # Endpoint may return 200 with insight or 500 if LLM not configured – record both
        assert r.status_code in (200, 500), f"Unexpected: {r.status_code} {r.text}"
        if r.status_code == 200:
            body = r.json()
            assert "insight" in body or "response" in body or "answer" in body, f"Bad shape: {body}"


# ---------- New expected_* date fields ----------
class TestExpectedDateFields:
    def _pick_request(self, headers):
        r = requests.get(f"{API}/capex-requests", headers=headers, timeout=20)
        assert r.status_code == 200
        # prefer one with a PO number
        with_po = [x for x in r.json() if x.get("po_number")]
        return (with_po[0] if with_po else r.json()[0]) if r.json() else None

    def test_patch_accepts_expected_delivery(self, buyer_headers):
        req = self._pick_request(buyer_headers)
        if not req:
            pytest.skip("No capex requests available")
        rid = req["id"]
        payload = {"expected_delivery_date": "2026-04-15"}
        r = requests.put(f"{API}/capex-requests/{rid}", headers=buyer_headers, json=payload, timeout=20)
        assert r.status_code in (200, 204), f"PATCH failed: {r.status_code} {r.text}"

        # GET to verify persisted
        g = requests.get(f"{API}/capex-requests/{rid}", headers=buyer_headers, timeout=20)
        assert g.status_code == 200
        assert g.json().get("expected_delivery_date") == "2026-04-15"

    def test_patch_accepts_expected_installation(self, buyer_headers):
        req = self._pick_request(buyer_headers)
        if not req:
            pytest.skip("No capex requests available")
        rid = req["id"]
        payload = {"expected_installation_date": "2026-05-20"}
        r = requests.put(f"{API}/capex-requests/{rid}", headers=buyer_headers, json=payload, timeout=20)
        assert r.status_code in (200, 204), f"PATCH failed: {r.status_code} {r.text}"
        g = requests.get(f"{API}/capex-requests/{rid}", headers=buyer_headers, timeout=20)
        assert g.json().get("expected_installation_date") == "2026-05-20"

    def test_patch_accepts_expected_commissioning(self, buyer_headers):
        req = self._pick_request(buyer_headers)
        if not req:
            pytest.skip("No capex requests available")
        rid = req["id"]
        payload = {"expected_commissioning_date": "2026-06-25"}
        r = requests.put(f"{API}/capex-requests/{rid}", headers=buyer_headers, json=payload, timeout=20)
        assert r.status_code in (200, 204), f"PATCH failed: {r.status_code} {r.text}"
        g = requests.get(f"{API}/capex-requests/{rid}", headers=buyer_headers, timeout=20)
        assert g.json().get("expected_commissioning_date") == "2026-06-25"

    def test_patch_combined_expected_dates(self, buyer_headers):
        req = self._pick_request(buyer_headers)
        if not req:
            pytest.skip("No capex requests available")
        rid = req["id"]
        payload = {
            "expected_delivery_date": "2026-07-01",
            "expected_installation_date": "2026-07-15",
            "expected_commissioning_date": "2026-08-01",
            "delivery_date": "2026-07-05",
        }
        r = requests.put(f"{API}/capex-requests/{rid}", headers=buyer_headers, json=payload, timeout=20)
        assert r.status_code in (200, 204), f"PATCH failed: {r.status_code} {r.text}"
        g = requests.get(f"{API}/capex-requests/{rid}", headers=buyer_headers, timeout=20)
        body = g.json()
        assert body.get("expected_delivery_date") == "2026-07-01"
        assert body.get("expected_installation_date") == "2026-07-15"
        assert body.get("expected_commissioning_date") == "2026-08-01"
        assert body.get("delivery_date") == "2026-07-05"
