import requests
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30

RH_EMAIL = "admin@tactic.com"
RH_PASSWORD = "password"

EMPLOYEE_EMAIL = "employee@tactic.com"
EMPLOYEE_PASSWORD = "password"


def login(email, password):
    url = f"{BASE_URL}/auth/login"
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("token")
    assert token is not None, "Login response missing token"
    return token


def get_any_employee_id(rh_token):
    # Fetch users with role "EMPLOYE" to get an employee ID
    url = f"{BASE_URL}/utilisateurs/role/EMPLOYE"
    headers = {"Authorization": f"Bearer {rh_token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    users = resp.json()
    # Return first employee id or None if none found
    if users and isinstance(users, list):
        return users[0].get("id")
    return None


def test_payroll_generation_simulation_and_access_control():
    # Login as RH (admin)
    rh_token = login(RH_EMAIL, RH_PASSWORD)
    rh_headers = {"Authorization": f"Bearer {rh_token}"}

    # Login as employee
    employee_token = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    # Get any employee id for simulation/generation payload
    utilisateur_id = get_any_employee_id(rh_token)
    assert utilisateur_id is not None, "No employee found to simulate/generate payroll"

    # Prepare payroll period dates (last full month)
    today = datetime.utcnow().date()
    first_day_last_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    last_day_last_month = today.replace(day=1) - timedelta(days=1)

    # 1. Test POST /paies/simuler with RH token
    simuler_url = f"{BASE_URL}/paies/simuler"
    simuler_payload = {
        "utilisateur_id": utilisateur_id,
        "periode_debut": first_day_last_month.isoformat(),
        "periode_fin": last_day_last_month.isoformat()
    }
    simuler_resp = requests.post(simuler_url, json=simuler_payload, headers=rh_headers, timeout=TIMEOUT)
    assert simuler_resp.status_code == 200, f"Payroll simulation failed: {simuler_resp.status_code} {simuler_resp.text}"
    simuler_data = simuler_resp.json()
    assert isinstance(simuler_data, dict), "Simulation response should be a JSON object"

    # 2. Test POST /paies/generer with valid payload and RH token
    generer_url = f"{BASE_URL}/paies/generer"
    generer_payload = {
        "utilisateur_id": utilisateur_id,
        "periode_debut": first_day_last_month.isoformat(),
        "periode_fin": last_day_last_month.isoformat()
    }
    generer_resp = requests.post(generer_url, json=generer_payload, headers=rh_headers, timeout=TIMEOUT)
    assert generer_resp.status_code == 200, f"Payroll generation failed: {generer_resp.status_code} {generer_resp.text}"
    generer_data = generer_resp.json()
    assert generer_data.get("id") is not None, "Generated payroll response missing id"

    # 3. Verify employee role cannot generate payroll and receives 403 Forbidden
    generer_resp_employee = requests.post(generer_url, json=generer_payload, headers=employee_headers, timeout=TIMEOUT)
    assert generer_resp_employee.status_code == 403, "Employee role should not be allowed to generate payroll"


test_payroll_generation_simulation_and_access_control()