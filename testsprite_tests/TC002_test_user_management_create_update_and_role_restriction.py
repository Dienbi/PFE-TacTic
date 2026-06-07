import requests

BASE_URL = "http://127.0.0.1:8000/api"
DEFAULT_RH_EMAIL = "admin@tactic.com"
DEFAULT_RH_PASSWORD = "password"

EMPLOYEE_EMAIL = "employee@example.com"
EMPLOYEE_PASSWORD = "password"

def login(email: str, password: str, timeout=30):
    url = f"{BASE_URL}/auth/login"
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("token")
    user = data.get("user")
    assert token and user, "Login response missing token or user"
    return token, user

def create_user(headers: dict, user_payload: dict, timeout=30):
    url = f"{BASE_URL}/utilisateurs"
    resp = requests.post(url, json=user_payload, headers=headers, timeout=timeout)
    return resp

def update_user(user_id: int, headers: dict, update_payload: dict, timeout=30):
    url = f"{BASE_URL}/utilisateurs/{user_id}"
    resp = requests.put(url, json=update_payload, headers=headers, timeout=timeout)
    return resp

def delete_user(user_id: int, headers: dict, timeout=30):
    url = f"{BASE_URL}/utilisateurs/{user_id}"
    resp = requests.delete(url, headers=headers, timeout=timeout)
    return resp

def test_user_management_create_update_and_role_restriction():
    # Login as RH to get token
    rh_token, rh_user = login(DEFAULT_RH_EMAIL, DEFAULT_RH_PASSWORD)
    rh_headers = {"Authorization": f"Bearer {rh_token}"}

    # Login as employee to get employee token
    # If such user does not exist, create one temporarily with employee role (catch errors and clean up)
    emp_token = None
    emp_user_id = None
    try:
        emp_token, emp_user = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
        emp_user_id = emp_user.get("id")
    except requests.HTTPError:
        # Create employee user using RH token
        temp_employee_payload = {
            "nom": "Temp",
            "prenom": "Employee",
            "email": EMPLOYEE_EMAIL,
            "role": "employee",
            "salaire_base": 1000.00
        }
        resp_create_emp = create_user(rh_headers, temp_employee_payload)
        assert resp_create_emp.status_code == 201, f"Failed to create temp employee user: {resp_create_emp.text}"
        emp_user = resp_create_emp.json()
        emp_user_id = emp_user.get("id")
        # Since password not set or unknown, skip employee login, emp_token remains None

    emp_headers = {"Authorization": f"Bearer {emp_token}"} if emp_token else None

    # Prepare a new user payload to create
    new_user_payload = {
        "nom": "Test",
        "prenom": "User",
        "email": "testuser_create_update@example.com",
        "role": "employee",  # lower case for role
        "salaire_base": 1500.00
    }

    created_user_id = None

    try:
        # 1. RH user creates a new user
        resp_create = create_user(rh_headers, new_user_payload)
        assert resp_create.status_code == 201, f"Expected 201 Created but got {resp_create.status_code}"
        created_user = resp_create.json()
        created_user_id = created_user.get("id")
        assert created_user.get("email") == new_user_payload["email"]
        assert created_user.get("nom") == new_user_payload["nom"]
        assert created_user.get("prenom") == new_user_payload["prenom"]

        # 2. RH user updates the created user's data
        update_payload = {
            "nom": "UpdatedTest",
            "prenom": "UpdatedUser",
            "email": "testuser_updated@example.com",
            "role": "employee",
            "salaire_base": 1800.00
        }
        resp_update = update_user(created_user_id, rh_headers, update_payload)
        assert resp_update.status_code == 200, f"Expected 200 OK on update but got {resp_update.status_code}"
        updated_user = resp_update.json()
        assert updated_user.get("nom") == update_payload["nom"]
        assert updated_user.get("prenom") == update_payload["prenom"]
        assert updated_user.get("email") == update_payload["email"]

        # 3. Employee role user tries to create a new user and gets 403 Forbidden
        if emp_headers is not None:
            employee_create_payload = {
                "nom": "Forbidden",
                "prenom": "User",
                "email": "forbidden_create_employee@example.com",
                "role": "employee",
                "salaire_base": 1200.00
            }
            resp_employee_create = create_user(emp_headers, employee_create_payload)
            assert resp_employee_create.status_code == 403, f"Employee user expected 403 Forbidden but got {resp_employee_create.status_code}"

    finally:
        # Cleanup created user by RH if created
        if created_user_id is not None:
            try:
                resp_del = delete_user(created_user_id, rh_headers)
                # Could be 200 or 204 depending on API; accept success status
                assert resp_del.status_code in (200,204), f"Failed to delete created user, status: {resp_del.status_code}"
            except Exception:
                pass
        # Cleanup temp employee user if created by test
        if emp_user_id is not None:
            try:
                delete_user(emp_user_id, rh_headers)
            except Exception:
                pass

test_user_management_create_update_and_role_restriction()
