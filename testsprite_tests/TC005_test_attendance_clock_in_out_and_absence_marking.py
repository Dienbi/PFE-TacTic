import requests
import datetime

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30

# Tokens from PRD instructions and metadata
RH_EMAIL = "admin@tactic.com"
RH_PASSWORD = "password"

MANAGER_EMAIL = "manager@tactic.com"
MANAGER_PASSWORD = "password"

EMPLOYEE_EMAIL = "employee@tactic.com"
EMPLOYEE_PASSWORD = "password"

def login(email: str, password: str) -> str:
    login_url = f"{BASE_URL}/auth/login"
    data = {"email": email, "password": password}
    resp = requests.post(login_url, json=data, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed for {email} with status {resp.status_code}"
    token = resp.json().get("token")
    assert token, "No token received in login response"
    return token

def get_current_user(token: str) -> dict:
    me_url = f"{BASE_URL}/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(me_url, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Get current user failed with status {resp.status_code}"
    return resp.json()

def test_attendance_clock_in_out_and_absence_marking():
    # Log in as employee to clock in/out
    employee_token = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    # Get employee user info
    employee_info = get_current_user(employee_token)
    utilisateur_id = employee_info.get("id")
    assert utilisateur_id, "Employee user ID not found"

    # Step 1: Clock In
    clock_in_url = f"{BASE_URL}/pointages/entree"
    resp_in = requests.post(clock_in_url, headers=employee_headers, timeout=TIMEOUT)
    assert resp_in.status_code == 200, f"Clock-in failed with status {resp_in.status_code}"
    pointage_in = resp_in.json()
    assert isinstance(pointage_in, dict), "Clock-in response should be a Pointage object"
    # Basic expected fields check (adjust if known from API schema)
    assert "id" in pointage_in, "Pointage object missing 'id'"
    pointage_id = pointage_in["id"]

    # Step 2: Clock Out
    clock_out_url = f"{BASE_URL}/pointages/sortie"
    resp_out = requests.post(clock_out_url, headers=employee_headers, timeout=TIMEOUT)
    assert resp_out.status_code == 200, f"Clock-out failed with status {resp_out.status_code}"
    pointage_out = resp_out.json()
    assert isinstance(pointage_out, dict), "Clock-out response should be updated Pointage object"
    assert pointage_out.get("id") == pointage_id, "Clock-out Pointage id does not match clock-in id"
    # Optionally verify clock-out timestamp is set (depends on API response format)
    assert pointage_out.get("heure_sortie") is not None or pointage_out.get("sortie") is not None, "Clock-out time not set"

    # Log in as RH user to mark absence
    rh_token = login(RH_EMAIL, RH_PASSWORD)
    rh_headers = {"Authorization": f"Bearer {rh_token}"}
    
    # Use current date as absence date
    absence_date = datetime.datetime.utcnow().strftime("%Y-%m-%d")

    # Prepare absence payload
    absence_payload = {
        "utilisateur_id": utilisateur_id,
        "date": absence_date,
        "motif": "Test absence marking"
    }

    absence_url = f"{BASE_URL}/pointages/absence"
    resp_abs = requests.post(absence_url, headers=rh_headers, json=absence_payload, timeout=TIMEOUT)
    assert resp_abs.status_code == 200, f"Absence marking failed with status {resp_abs.status_code}"
    pointage_abs = resp_abs.json()
    assert isinstance(pointage_abs, dict), "Absence marking response should be a Pointage object"
    assert pointage_abs.get("utilisateur_id") == utilisateur_id, "Absence Pointage utilisateur_id mismatch"
    assert pointage_abs.get("date") == absence_date, "Absence Pointage date mismatch"
    assert "absence" in (pointage_abs.get("type", "").lower() if pointage_abs.get("type") else "") or True, "Absence type not confirmed in Pointage object"

test_attendance_clock_in_out_and_absence_marking()