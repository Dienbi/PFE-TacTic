import os

os.environ["ENABLE_SCHEDULER"] = "false"
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:admin@127.0.0.1:5433/tactic_db")

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_service_status():
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "TacTic AI Service"
    assert "timestamp" in body


def test_training_status_endpoint_is_available():
    response = client.get("/api/train/status")

    assert response.status_code == 200
    body = response.json()
    assert body["training_in_progress"] is False
    assert body["status"] == "disabled"
    assert "models" in body


def test_train_endpoint_accepts_supported_model_names():
    response = client.post("/api/train/attendance")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "disabled"
    assert body["model"] == "attendance"
    assert "message" in body["result"]


def test_train_endpoint_rejects_unknown_model_names():
    response = client.post("/api/train/unknown")

    assert response.status_code == 400
    assert "Invalid model" in response.json()["detail"]
