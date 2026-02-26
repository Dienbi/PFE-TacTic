import requests

BASE_URL = "http://localhost:8000"
RH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiUkgiLCJtYXRyaWN1bGUiOiJFTVAwMDAwMSJ9.I8kwHIFud_6IOx6ymigvyflA489eg2Uh0T2yG2-HEts"

EMPLOYEE_EMAIL = "employee@example.com"
EMPLOYEE_PASSWORD = "EmployeePass123!"

def login(email, password):
    url = f"{BASE_URL}/api/auth/login"
    try:
        resp = requests.post(url, json={"email": email, "password": password}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token")
        if not token:
            raise ValueError("No token in login response")
        return token
    except requests.RequestException as e:
        raise RuntimeError(f"Login failed: {e}")

def test_position_management_crud_and_role_restrictions():
    headers_rh = {"Authorization": f"Bearer {RH_TOKEN}"}
    position_id = None
    # Step 1: As RH, POST /api/postes to create a position, expect 201 or 200
    create_url = f"{BASE_URL}/api/postes"
    new_position_payload = {
        "titre": "Test Position TC008",
        "description": "Position created for test case TC008"
    }
    try:
        create_resp = requests.post(create_url, json=new_position_payload, headers=headers_rh, timeout=30)
        assert create_resp.status_code in (200, 201), f"Expected 201 or 200 on position creation, got {create_resp.status_code}"
        position_data = create_resp.json()
        position_id = position_data.get("id")
        assert position_id is not None, "Created position missing 'id'"

        # Step 2: As RH, GET /api/postes to list positions, expect 200 and new position in list
        list_url = f"{BASE_URL}/api/postes"
        list_resp = requests.get(list_url, headers=headers_rh, timeout=30)
        assert list_resp.status_code == 200, f"Expected 200 on listing positions, got {list_resp.status_code}"
        positions_list = list_resp.json()
        assert isinstance(positions_list, list), "Positions list response is not a list"
        titles = [p.get("titre") for p in positions_list if "titre" in p]
        assert new_position_payload["titre"] in titles, "New position title not found in list"

        # Step 3: Login as employee role to get token
        employee_token = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
        headers_employee = {"Authorization": f"Bearer {employee_token}"}

        # Step 4: As employee, POST /api/postes to create position, expect 403
        employee_create_resp = requests.post(create_url, json=new_position_payload, headers=headers_employee, timeout=30)
        assert employee_create_resp.status_code == 403, f"Expected 403 Forbidden for employee creating position, got {employee_create_resp.status_code}"

    finally:
        # Cleanup: Delete the created position if it exists, using RH token
        if position_id is not None:
            delete_url = f"{BASE_URL}/api/postes/{position_id}"
            try:
                del_resp = requests.delete(delete_url, headers=headers_rh, timeout=30)
                # Accept 200 or 204 as successful delete depending on API implementation
                assert del_resp.status_code in (200, 204), f"Failed to delete position with id {position_id}, status code {del_resp.status_code}"
            except Exception:
                pass  # ignore cleanup errors

test_position_management_crud_and_role_restrictions()