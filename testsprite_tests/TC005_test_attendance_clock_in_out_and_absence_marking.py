import requests
from datetime import datetime

BASE_URL = "http://localhost:8000"
BEARER_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiUkgiLCJtYXRyaWN1bGUiOiJFTVAwMDAwMSJ9.I8kwHIFud_6IOx6ymigvyflA489eg2Uh0T2yG2-HEts"
HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Content-Type": "application/json"
}

def test_attendance_clock_in_out_and_absence_marking():
    # Clock In - POST /api/pointages/entree
    try:
        response_entree = requests.post(
            f"{BASE_URL}/api/pointages/entree",
            headers=HEADERS,
            timeout=30
        )
        assert response_entree.status_code == 200, f"Clock in failed: {response_entree.text}"
        try:
            pointage_entree = response_entree.json()
        except Exception as e:
            assert False, f"Clock in response is not valid JSON: {response_entree.text}"
        assert isinstance(pointage_entree, dict), "Clock in response is not a JSON object"
        assert "id" in pointage_entree, f"Clock in response missing Pointage ID: {pointage_entree}"
        pointage_id = pointage_entree["id"]

        # Clock Out - POST /api/pointages/sortie
        response_sortie = requests.post(
            f"{BASE_URL}/api/pointages/sortie",
            headers=HEADERS,
            timeout=30
        )
        assert response_sortie.status_code == 200, f"Clock out failed: {response_sortie.text}"
        try:
            pointage_sortie = response_sortie.json()
        except Exception as e:
            assert False, f"Clock out response is not valid JSON: {response_sortie.text}"
        assert isinstance(pointage_sortie, dict), "Clock out response is not a JSON object"
        assert "id" in pointage_sortie, "Clock out response missing Pointage ID"
        assert pointage_sortie["id"] == pointage_id, "Clock out Pointage ID does not match clock in"

        # Mark Absence - POST /api/pointages/absence with manager or RH token
        # Use same token (RH) from BEARER_TOKEN given it's RH role

        # Get user profile to extract utilisateur_id for absence marking
        response_me = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=HEADERS,
            timeout=30
        )
        assert response_me.status_code == 200, f"Failed to get user profile: {response_me.text}"
        try:
            user_profile = response_me.json()
        except Exception:
            assert False, f"User profile response is not valid JSON: {response_me.text}"
        assert isinstance(user_profile, dict), "User profile response is not a JSON object"
        utilisateur_id = user_profile.get("id")
        assert utilisateur_id is not None, "Cannot find utilisateur_id 'id' from profile for absence marking"

        absence_payload = {
            "utilisateur_id": utilisateur_id,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "motif": "Test absence marking by RH token"
        }
        response_absence = requests.post(
            f"{BASE_URL}/api/pointages/absence",
            headers=HEADERS,
            json=absence_payload,
            timeout=30
        )
        assert response_absence.status_code == 200, f"Marking absence failed: {response_absence.text}"
        try:
            absence_result = response_absence.json()
        except Exception:
            assert False, f"Absence marking response is not valid JSON: {response_absence.text}"
        assert isinstance(absence_result, dict), "Absence marking response is not a JSON object"
        assert "id" in absence_result, "Absence marking response missing Pointage ID"

    finally:
        # Cleanup: delete the created pointage if possible
        if 'pointage_id' in locals():
            try:
                del_response = requests.delete(
                    f"{BASE_URL}/api/pointages/{pointage_id}",
                    headers=HEADERS,
                    timeout=30
                )
            except Exception:
                pass

test_attendance_clock_in_out_and_absence_marking()
