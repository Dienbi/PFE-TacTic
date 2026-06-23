import pytest
import requests
import os

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")

def test_health_check():
    """Validate that the backend health check endpoint returns 200."""
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    assert response.json().get("status") == "ok"

def test_auth_me_unauthorized():
    """Validate that accessing /auth/me without a token returns 401."""
    response = requests.get(f"{BASE_URL}/auth/me")
    assert response.status_code == 401

def test_ai_service_health():
    """Validate that the AI service health check endpoint returns 200."""
    AI_BASE_URL = os.getenv("AI_BASE_URL", "http://localhost:8001")
    response = requests.get(f"{AI_BASE_URL}/health")
    assert response.status_code == 200
    assert response.json().get("status") == "ok"
