import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

RH_AUTH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiUkgiLCJtYXRyaWN1bGUiOiJFTVAwMDAwMSJ9.I8kwHIFud_6IOx6ymigvyflA489eg2Uh0T2yG2-HEts"
EMPLOYEE_AUTH_TOKEN = None


def login(email: str, password: str) -> str:
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload, timeout=TIMEOUT)
    response.raise_for_status()
    token = response.json().get("token")
    assert token, "Login did not return a token"
    return token


def create_user(token: str, user_data: dict) -> requests.Response:
    url = f"{BASE_URL}/api/utilisateurs"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(url, json=user_data, headers=headers, timeout=TIMEOUT)
    return response


def update_user(token: str, user_id: int, update_data: dict) -> requests.Response:
    url = f"{BASE_URL}/api/utilisateurs/{user_id}"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(url, json=update_data, headers=headers, timeout=TIMEOUT)
    return response


def delete_user(token: str, user_id: int):
    url = f"{BASE_URL}/api/utilisateurs/{user_id}"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(url, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()


def test_user_management_create_update_and_role_restriction():
    # Prepare employee token by login (email/password for an employee role)
    employee_email = "employee@example.com"
    employee_password = "employeePass123"  # NOTE: This should be a valid employee credential in test env
    global EMPLOYEE_AUTH_TOKEN
    try:
        EMPLOYEE_AUTH_TOKEN = login(employee_email, employee_password)
    except requests.HTTPError as e:
        if e.response.status_code == 401:
            # Cannot login employee for test, skip 403 test
            EMPLOYEE_AUTH_TOKEN = None
        else:
            raise

    rh_token = RH_AUTH_TOKEN
    headers_rh = {"Authorization": f"Bearer {rh_token}", "Content-Type": "application/json"}

    # User data for creation
    user_payload = {
        "nom": "Test",
        "prenom": "User",
        "email": "testuser_create_update@example.com",
        "role": "employee",
        "salaire_base": 1500.0
    }

    created_user_id = None
    try:
        # Create user with RH token: expect 201 with user object
        response = create_user(rh_token, user_payload)
        assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}"
        user_obj = response.json()
        for key in ["id", "nom", "prenom", "email", "role", "salaire_base"]:
            assert key in user_obj, f"Response missing key: {key}"
        assert user_obj["email"] == user_payload["email"]
        created_user_id = user_obj["id"]

        # Update user details
        update_data = {
            "nom": "Updated",
            "prenom": "UserUpdated",
            "salaire_base": 1600.0
        }
        response_update = update_user(rh_token, created_user_id, update_data)
        assert response_update.status_code == 200, f"Expected 200 OK on update, got {response_update.status_code}"
        updated_user = response_update.json()
        assert updated_user["nom"] == update_data["nom"]
        assert updated_user["prenom"] == update_data["prenom"]
        assert updated_user["salaire_base"] == update_data["salaire_base"]

        # Attempt to create user with employee token: expect 403 Forbidden
        if EMPLOYEE_AUTH_TOKEN:
            headers_employee = {"Authorization": f"Bearer {EMPLOYEE_AUTH_TOKEN}", "Content-Type": "application/json"}
            response_employee_create = requests.post(
                f"{BASE_URL}/api/utilisateurs",
                json=user_payload,
                headers=headers_employee,
                timeout=TIMEOUT
            )
            assert response_employee_create.status_code == 403, (
                f"Expected 403 Forbidden for employee user creation, got {response_employee_create.status_code}"
            )
    finally:
        if created_user_id:
            try:
                delete_user(rh_token, created_user_id)
            except Exception:
                pass


test_user_management_create_update_and_role_restriction()
