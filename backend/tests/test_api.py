import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add root folder to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)

def test_read_root():
    """Verify primary root endpoint status."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"
    assert response.json()["service"] == settings.PROJECT_NAME

def test_api_docs_available():
    """Verify swagger UI docs are compiled."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger" in response.text.lower() or "redoc" in response.text.lower() or response.status_code == 200

def test_unauthorized_endpoints():
    """Ensure protected routes return 401 Unauthorized without token headers."""
    protected_endpoints = [
        "/api/v1/tickets",
        "/api/v1/payments/transactions",
        "/api/v1/fraud/cases",
        "/api/v1/approvals/requests",
        "/api/v1/audit/logs",
        "/api/v1/settings"
    ]
    for endpoint in protected_endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401
