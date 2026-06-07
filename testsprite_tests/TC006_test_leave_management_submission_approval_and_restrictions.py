import requests
from datetime import date, timedelta

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30

RH_EMAIL = "admin@tactic.com"
RH_PASSWORD = "password"

EMPLOYEE_EMAIL = "employee@example.com"  # Should be replaced with a real employee email existing in system for testing
EMPLOYEE_PASSWORD = "password"          # Should be replaced with correct password for that employee

def login(email: str, password: str):
    url = f"{BASE_URL}/auth/login"
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("token")
    user = data.get("user")
    assert token and user, "Login response missing token or user"
    return token, user

def get_user_solde_conge(token, user_id):
    # According to PRD, solde_conge (leave balance) is part of user object or accessible by /utilisateurs/{id}
    url = f"{BASE_URL}/utilisateurs/{user_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    solde_conge = data.get("solde_conge")
    assert isinstance(solde_conge, (int, float)), "solde_conge not found or invalid type"
    return solde_conge

def test_leave_management_submission_approval_and_restrictions():
    # Login as RH
    rh_token, rh_user = login(RH_EMAIL, RH_PASSWORD)
    rh_headers = {"Authorization": f"Bearer {rh_token}"}

    # Login as employee
    emp_token, emp_user = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # 1. Submit leave request with valid data as employee
    leave_payload = {
        "type": "Congé annuel",
        "date_debut": (date.today() + timedelta(days=5)).isoformat(),
        "date_fin": (date.today() + timedelta(days=7)).isoformat(),
        "motif": "Vacances annuelles"
    }
    conges_url = f"{BASE_URL}/conges"
    resp = requests.post(conges_url, json=leave_payload, headers=emp_headers, timeout=TIMEOUT)
    assert resp.status_code == 201, f"Create leave request expected 201 but got {resp.status_code}"
    conge = resp.json()
    conge_id = conge.get("id")
    assert conge_id, "Created leave request missing id"
    assert conge.get("statut") in [None, "en attente", "pending", "En attente","Pending"], "Initial leave status unexpected"

    try:
        # Save employee's solde_conge before approval
        solde_before = get_user_solde_conge(emp_token, emp_user["id"])

        # 2. Approve leave request as RH
        approve_url = f"{BASE_URL}/conges/{conge_id}/approuver"
        resp_approve = requests.post(approve_url, headers=rh_headers, timeout=TIMEOUT)
        assert resp_approve.status_code == 200, f"Approve leave expected 200 but got {resp_approve.status_code}"
        approuve_conge = resp_approve.json()
        assert approuve_conge.get("id") == conge_id, "Approved leave ID mismatch"
        assert approuve_conge.get("statut") in ["approuvé", "approved", "Approuvé","Approved"], "Leave status not approved after approval"

        # Check solde_conge decremented for employee (by number of days requested)
        solde_after = get_user_solde_conge(emp_token, emp_user["id"])
        days_requested = (date.fromisoformat(leave_payload["date_fin"]) - date.fromisoformat(leave_payload["date_debut"])).days + 1
        assert solde_after == solde_before - days_requested or solde_after < solde_before, "Leave balance not decremented after approval"

        # 3. Verify employee role cannot approve leave - expect 403 Forbidden
        resp_emp_approve = requests.post(approve_url, headers=emp_headers, timeout=TIMEOUT)
        assert resp_emp_approve.status_code == 403, f"Employee approving leave expected 403 but got {resp_emp_approve.status_code}"

    finally:
        # Cleanup: cancel (delete) the created leave request if possible
        cancel_url = f"{BASE_URL}/conges/{conge_id}/annuler"
        try:
            cancel_resp = requests.delete(cancel_url, headers=emp_headers, timeout=TIMEOUT)
            # Accept 200 or 204 or 404 if already deleted or no permission as end state
            assert cancel_resp.status_code in [200, 204, 404], f"Leave cancel failed with status {cancel_resp.status_code}"
        except Exception:
            pass

test_leave_management_submission_approval_and_restrictions()