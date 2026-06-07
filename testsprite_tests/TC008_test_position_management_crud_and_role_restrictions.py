import requests

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30

RH_EMAIL = "admin@tactic.com"
RH_PASSWORD = "password"
EMPLOYEE_EMAIL = "employee@tactic.com"
EMPLOYEE_PASSWORD = "password"


def login(email: str, password: str) -> str:
    """Login and return the Bearer token."""
    res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=TIMEOUT,
    )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    data = res.json()
    token = data.get("token")
    assert token, "No token received"
    return f"Bearer {token}"


def test_position_management_crud_and_role_restrictions():
    # Login as RH
    rh_token = login(RH_EMAIL, RH_PASSWORD)
    headers_rh = {"Authorization": rh_token, "Content-Type": "application/json"}

    # Login as Employee
    emp_token = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
    headers_emp = {"Authorization": emp_token, "Content-Type": "application/json"}

    created_position_id = None

    # Step 1: RH creates a new position
    try:
        poste_payload = {
            "titre": "Test Position TC008",
            "description": "Position created for test case TC008"
        }
        res_create = requests.post(
            f"{BASE_URL}/postes",
            headers=headers_rh,
            json=poste_payload,
            timeout=TIMEOUT,
        )
        assert res_create.status_code == 201, f"RH create position failed: {res_create.text}"
        poste = res_create.json()
        created_position_id = poste.get("id") or poste.get("ID")  # Accept either key
        assert created_position_id is not None, "Created position ID missing"

        # Step 2: RH lists all positions
        res_list = requests.get(
            f"{BASE_URL}/postes",
            headers=headers_rh,
            timeout=TIMEOUT,
        )
        assert res_list.status_code == 200, f"RH list positions failed: {res_list.text}"
        positions = res_list.json()
        assert isinstance(positions, list), "Positions listing is not a list"
        # Check that the created position is in the list by id or title
        ids = [pos.get("id") or pos.get("ID") for pos in positions if isinstance(pos, dict)]
        assert created_position_id in ids, "Created position not found in list"

        # Step 3: Employee tries to create a position and should get 403 Forbidden
        res_emp_create = requests.post(
            f"{BASE_URL}/postes",
            headers=headers_emp,
            json=poste_payload,
            timeout=TIMEOUT,
        )
        assert res_emp_create.status_code == 403, f"Employee should not create position: {res_emp_create.text}"

    finally:
        # Cleanup: Delete created position if exists using RH credentials
        if created_position_id:
            requests.delete(
                f"{BASE_URL}/postes/{created_position_id}",
                headers=headers_rh,
                timeout=TIMEOUT,
            )


test_position_management_crud_and_role_restrictions()