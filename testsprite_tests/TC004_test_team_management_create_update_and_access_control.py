import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

RH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiUkgiLCJtYXRyaWN1bGUiOiJFTVAwMDAwMSJ9.I8kwHIFud_6IOx6ymigvyflA489eg2Uh0T2yG2-HEts"
MANAGER_CREDENTIALS = {"email": "manager@example.com", "password": "ManagerPass123"}
EMPLOYEE_CREDENTIALS = {"email": "employee@example.com", "password": "EmployeePass123"}


def get_auth_token(credentials):
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=credentials, timeout=TIMEOUT)
        resp.raise_for_status()
        json_resp = resp.json()
        token = json_resp.get("token")
        assert token, "Login did not return a token"
        return token
    except Exception as e:
        raise RuntimeError(f"Failed to get auth token: {e}")


def test_team_management_create_update_and_access_control():
    headers_rh = {"Authorization": f"Bearer {RH_TOKEN}"}

    manager_token = get_auth_token(MANAGER_CREDENTIALS)
    employee_token = get_auth_token(EMPLOYEE_CREDENTIALS)

    headers_manager = {"Authorization": f"Bearer {manager_token}"}
    headers_employee = {"Authorization": f"Bearer {employee_token}"}

    team_id = None

    # Step 1: Create a team with RH credentials (POST /api/equipes)
    try:
        # First, to assign a manager by id, we need a manager user id.
        # Get current manager user profile via /api/auth/me
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers_manager, timeout=TIMEOUT)
        resp.raise_for_status()
        manager_profile = resp.json()
        manager_id = manager_profile.get("id")
        assert isinstance(manager_id, int), "Manager id not found or invalid"

        # Create team payload
        team_payload = {"nom": "QA Test Team", "chef_id": manager_id}
        resp = requests.post(f"{BASE_URL}/api/equipes", headers=headers_rh, json=team_payload, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
        team = resp.json()
        team_id = team.get("id")
        assert team_id is not None, "Created team ID not found"

        # Step 2: Assign a manager to the created team (PUT /api/equipes/{id}/chef)
        resp = requests.put(f"{BASE_URL}/api/equipes/{team_id}/chef", headers=headers_rh, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 on assign manager, got {resp.status_code}"
        updated_team = resp.json()
        assert updated_team.get("chef_id") == manager_id, "Team manager not updated correctly"

        # Step 3: Get my team with manager credentials (GET /api/equipes/my-team)
        resp = requests.get(f"{BASE_URL}/api/equipes/my-team", headers=headers_manager, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 on get my team, got {resp.status_code}"
        my_team = resp.json()
        assert my_team.get("id") == team_id, "Manager's team ID does not match created team"

        # Step 4: Verify employee role cannot create teams (POST /api/equipes)
        resp = requests.post(f"{BASE_URL}/api/equipes", headers=headers_employee, json=team_payload, timeout=TIMEOUT)
        assert resp.status_code == 403, f"Expected 403 Forbidden for employee creating team, got {resp.status_code}"

    finally:
        # Cleanup: Delete created team if exists
        if team_id:
            try:
                resp = requests.delete(f"{BASE_URL}/api/equipes/{team_id}", headers=headers_rh, timeout=TIMEOUT)
                # Accept either 200 or 204 as success for delete
                assert resp.status_code in (200, 204), f"Failed to delete team, status {resp.status_code}"
            except Exception:
                pass


test_team_management_create_update_and_access_control()