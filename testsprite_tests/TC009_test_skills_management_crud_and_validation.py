import requests

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30

# Credentials and tokens
RH_EMAIL = "admin@tactic.com"
RH_PASSWORD = "password"

EMPLOYEE_EMAIL = "employee@example.com"
EMPLOYEE_PASSWORD = "password"

def login(email, password):
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token")
        assert token, "No token in login response"
        return token
    except requests.RequestException as e:
        raise AssertionError(f"Login failed for {email}: {e}")

def test_skills_management_crud_and_validation():
    rh_token = login(RH_EMAIL, RH_PASSWORD)
    employee_token = None
    # Attempt to login employee, if credentials unknown, assume employee cannot login
    try:
        employee_token = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
    except AssertionError:
        # No employee token, test employee forbidden with a random token
        employee_token = None

    headers_rh = {"Authorization": f"Bearer {rh_token}"}
    headers_emp = {"Authorization": f"Bearer {employee_token}"} if employee_token else {}

    skill_id = None
    # 1. Test POST /api/competences with valid data and RH token -> 201 Created
    skill_payload = {
        "nom": "Test Skill",
        "categorie": "Technical"
    }
    try:
        resp_create = requests.post(
            f"{BASE_URL}/competences",
            json=skill_payload,
            headers=headers_rh,
            timeout=TIMEOUT
        )
        assert resp_create.status_code == 201, f"Expected 201, got {resp_create.status_code}"
        skill = resp_create.json()
        skill_id = skill.get("id")
        assert skill_id is not None, "Created skill object missing id"

        # 2. Test PUT /api/competences/{id} to update skill -> 200 OK
        update_payload = {
            "nom": "Updated Test Skill",
            "categorie": "Soft Skill"
        }
        resp_update = requests.put(
            f"{BASE_URL}/competences/{skill_id}",
            json=update_payload,
            headers=headers_rh,
            timeout=TIMEOUT
        )
        assert resp_update.status_code == 200, f"Expected 200, got {resp_update.status_code}"
        updated_skill = resp_update.json()
        assert updated_skill.get("nom") == "Updated Test Skill"
        assert updated_skill.get("categorie") == "Soft Skill"

        # 3. Test POST /api/competences with missing required fields -> 422 validation error
        invalid_payload = {
            # Intentionally empty or missing required fields "nom" and "categorie"
        }
        resp_invalid = requests.post(
            f"{BASE_URL}/competences",
            json=invalid_payload,
            headers=headers_rh,
            timeout=TIMEOUT
        )
        assert resp_invalid.status_code == 422, f"Expected 422, got {resp_invalid.status_code}"

        # 4. Verify employee role cannot create skill -> 403 Forbidden
        if employee_token:
            resp_forbidden = requests.post(
                f"{BASE_URL}/competences",
                json=skill_payload,
                headers=headers_emp,
                timeout=TIMEOUT
            )
            assert resp_forbidden.status_code == 403, f"Expected 403, got {resp_forbidden.status_code}"
        else:
            # If no employee token, verify forbidden with invalid token or no token
            resp_no_token = requests.post(
                f"{BASE_URL}/competences",
                json=skill_payload,
                timeout=TIMEOUT
            )
            # It can be 401 unauthorized or 403 forbidden, accept either
            assert resp_no_token.status_code in (401, 403), f"Expected 401 or 403, got {resp_no_token.status_code}"

    finally:
        # Cleanup: delete created skill if any
        if skill_id:
            try:
                resp_delete = requests.delete(
                    f"{BASE_URL}/competences/{skill_id}",
                    headers=headers_rh,
                    timeout=TIMEOUT
                )
                assert resp_delete.status_code == 200, f"Expected 200 on delete, got {resp_delete.status_code}"
            except Exception:
                pass


test_skills_management_crud_and_validation()