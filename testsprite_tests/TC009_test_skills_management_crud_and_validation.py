import requests

BASE_URL = "http://localhost:8000"
RH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiUkgiLCJtYXRyaWN1bGUiOiJFTVAwMDAwMSJ9.I8kwHIFud_6IOx6ymigvyflA489eg2Uh0T2yG2-HEts"

EMPLOYEE_EMAIL = "employee@example.com"
EMPLOYEE_PASSWORD = "password"

def get_employee_token():
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": EMPLOYEE_EMAIL, "password": EMPLOYEE_PASSWORD}
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        token = data.get("token", None)
        if not token:
            raise ValueError("No token returned for employee login")
        return token
    except Exception as e:
        raise RuntimeError(f"Failed to login as employee: {e}")

def test_skills_management_crud_and_validation():
    headers_rh = {"Authorization": f"Bearer {RH_TOKEN}", "Content-Type": "application/json"}
    employee_token = get_employee_token()
    headers_employee = {"Authorization": f"Bearer {employee_token}", "Content-Type": "application/json"}

    skill_id = None

    # 1. Test POST /api/competences to create a skill with RH token and valid data (expect 201)
    create_skill_payload = {
        "nom": "Test Skill TC009",
        "categorie": "Technical"
    }
    try:
        create_resp = requests.post(
            f"{BASE_URL}/api/competences",
            json=create_skill_payload,
            headers=headers_rh,
            timeout=30,
        )
        assert create_resp.status_code == 201, f"Expected 201, got {create_resp.status_code}"
        create_data = create_resp.json()
        assert "id" in create_data, "Created skill object must contain 'id'"
        assert create_data.get("nom") == create_skill_payload["nom"]
        assert create_data.get("categorie") == create_skill_payload["categorie"]
        skill_id = create_data["id"]

        # 2. Test PUT /api/competences/{id} to update skill with RH token (expect 200)
        update_payload = {
            "nom": "Updated Test Skill TC009",
            "categorie": "Soft Skill"
        }
        update_resp = requests.put(
            f"{BASE_URL}/api/competences/{skill_id}",
            json=update_payload,
            headers=headers_rh,
            timeout=30,
        )
        assert update_resp.status_code == 200, f"Expected 200 on update, got {update_resp.status_code}"
        update_data = update_resp.json()
        assert update_data.get("id") == skill_id, "Updated skill id mismatch"
        assert update_data.get("nom") == update_payload["nom"]
        assert update_data.get("categorie") == update_payload["categorie"]

        # 3. Test POST /api/competences with missing required fields (expect 422)
        invalid_payload = {
            # "nom" missing
            "categorie": "AnyCategory"
        }
        invalid_resp = requests.post(
            f"{BASE_URL}/api/competences",
            json=invalid_payload,
            headers=headers_rh,
            timeout=30,
        )
        assert invalid_resp.status_code == 422, f"Expected 422 on invalid create, got {invalid_resp.status_code}"

        # 4. Verify employee role cannot create skills (expect 403)
        emp_create_payload = {
            "nom": "Employee Skill Attempt",
            "categorie": "Technical"
        }
        emp_create_resp = requests.post(
            f"{BASE_URL}/api/competences",
            json=emp_create_payload,
            headers=headers_employee,
            timeout=30,
        )
        assert emp_create_resp.status_code == 403, f"Expected 403 for employee creating skill, got {emp_create_resp.status_code}"

    finally:
        # Cleanup: delete the created skill if exists
        if skill_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/competences/{skill_id}",
                    headers=headers_rh,
                    timeout=30,
                )
                # We accept 200 success or 204 no content for deletion
                if del_resp.status_code not in (200, 204):
                    print(f"Warning: Failed to delete skill {skill_id}, status: {del_resp.status_code}")
            except Exception as e:
                print(f"Exception during cleanup: {e}")

test_skills_management_crud_and_validation()