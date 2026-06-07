import requests

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30

RH_CREDENTIALS = {"email": "admin@tactic.com", "password": "password"}
MANAGER_CREDENTIALS = {"email": "manager@tactic.com", "password": "password"}
EMPLOYEE_CREDENTIALS = {"email": "employee@tactic.com", "password": "password"}


def login(credentials):
    resp = requests.post(f"{BASE_URL}/auth/login", json=credentials, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed with status {resp.status_code}"
    data = resp.json()
    token = data.get("token")
    assert token, "Login did not return a token"
    return token


def get_auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_team_management_create_update_and_access_control():
    rh_token = login(RH_CREDENTIALS)
    manager_token = login(MANAGER_CREDENTIALS)
    employee_token = login(EMPLOYEE_CREDENTIALS)

    headers_rh = get_auth_headers(rh_token)
    headers_manager = get_auth_headers(manager_token)
    headers_employee = get_auth_headers(employee_token)

    equipe_id = None
    try:
        # Step 1: Create a team with RH credentials
        # Need a manager user ID to assign as chef_id
        # First get manager user info by listing users with role=Manager

        users_resp = requests.get(
            f"{BASE_URL}/utilisateurs/role/Manager", headers=headers_rh, timeout=TIMEOUT
        )
        users_resp.raise_for_status()
        managers = users_resp.json()
        assert isinstance(managers, list) and len(managers) > 0, "No managers found for assigning as chef"

        manager_user_id = managers[0].get("id") or managers[0].get("ID") or managers[0].get("id_utilisateur")
        assert manager_user_id is not None, "Manager user ID not found"

        team_data = {"nom": "Test Team TC004", "chef_id": manager_user_id}
        create_resp = requests.post(
            f"{BASE_URL}/equipes", headers=headers_rh, json=team_data, timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Expected 201, got {create_resp.status_code}"
        equipe = create_resp.json()
        equipe_id = equipe.get("id") or equipe.get("ID")
        assert equipe_id is not None, "Created team id is missing"

        # Step 2: Assign a manager to the team (PUT /api/equipes/{id}/chef)
        # Assign same manager_user_id just to test
        assign_resp = requests.put(
            f"{BASE_URL}/equipes/{equipe_id}/chef", headers=headers_rh, json={"chef_id": manager_user_id}, timeout=TIMEOUT
        )
        assert assign_resp.status_code == 200, f"Expected 200 on assign manager, got {assign_resp.status_code}"
        assigned_team = assign_resp.json()
        assigned_chef_id = assigned_team.get("chef_id") or assigned_team.get("chefId") or assigned_team.get("chef_id_utilisateur")
        assert assigned_chef_id == manager_user_id, "Manager assignment failed or incorrect"

        # Step 3: GET /api/equipes/my-team with manager credentials: verify 200 and team info
        my_team_resp = requests.get(f"{BASE_URL}/equipes/my-team", headers=headers_manager, timeout=TIMEOUT)
        assert my_team_resp.status_code == 200, f"Expected 200 on my-team get, got {my_team_resp.status_code}"
        my_team = my_team_resp.json()
        # Check that returned team id is the one assigned or at least team has a chef_id matching manager_user_id
        returned_chef_id = my_team.get("chef_id") or my_team.get("chefId") or my_team.get("chef_id_utilisateur")
        assert (
            returned_chef_id == manager_user_id
        ), "Manager's my-team does not have correct chef_id"

        # Step 4: Verify employee role cannot create teams (403)
        team_data = {"nom": "Employee Forbidden Team", "chef_id": manager_user_id}
        forbidden_resp = requests.post(
            f"{BASE_URL}/equipes", headers=headers_employee, json=team_data, timeout=TIMEOUT
        )
        assert forbidden_resp.status_code == 403, f"Expected 403 for employee creating team, got {forbidden_resp.status_code}"

    finally:
        if equipe_id:
            # Clean up: delete the created team
            delete_resp = requests.delete(f"{BASE_URL}/equipes/{equipe_id}", headers=headers_rh, timeout=TIMEOUT)
            if delete_resp.status_code != 200:
                # Try again with force deletion if available (not in spec but just in case)
                requests.delete(f"{BASE_URL}/equipes/{equipe_id}/force", headers=headers_rh, timeout=TIMEOUT)


test_team_management_create_update_and_access_control()
