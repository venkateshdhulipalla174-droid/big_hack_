import os
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_basic():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ksmart-backend"
    assert "gemini_configured" in data
    assert "model" in data

    # Verify /api/v1/health endpoint as required by API Contract v1
    v1_response = client.get("/api/v1/health")
    assert v1_response.status_code == 200
    assert v1_response.json() == data


def test_health_gemini_unconfigured(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["gemini_configured"] is False


def test_health_gemini_configured(monkeypatch):
    dummy_key = "dummy-test-key-not-real"
    monkeypatch.setenv("GEMINI_API_KEY", dummy_key)
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["gemini_configured"] is True
    assert data["model"] == "gemini-2.5-flash"
    # Security test: ensure key is never leaked
    assert dummy_key not in response.text
    for value in response.headers.values():
        assert dummy_key not in value


def test_cors_preflight():
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_127_0_0_1_origin():
    # Verify GET /health returns Access-Control-Allow-Origin for http://127.0.0.1:5173
    health_resp = client.get(
        "/health",
        headers={"Origin": "http://127.0.0.1:5173"},
    )
    assert health_resp.status_code == 200
    assert health_resp.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"

    # Verify OPTIONS /api/v1/chat preflight returns Access-Control-Allow-Origin for http://127.0.0.1:5173
    chat_preflight = client.options(
        "/api/v1/chat",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert chat_preflight.status_code == 200
    assert chat_preflight.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
