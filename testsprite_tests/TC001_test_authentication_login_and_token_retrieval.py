import requests

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = "/api/auth/login"
ME_ENDPOINT = "/api/auth/me"

VALID_LOGIN_PAYLOAD = {
    "email": "validuser@example.com",
    "password": "validpassword"
}

def test_authentication_login_and_token_retrieval():
    try:
        # Step 1: POST /api/auth/login with valid credentials
        login_response = requests.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=VALID_LOGIN_PAYLOAD,
            timeout=30
        )

        assert login_response.status_code == 200, f"Expected 200, got {login_response.status_code}"
        login_json = login_response.json()
        assert "token" in login_json and isinstance(login_json["token"], str) and login_json["token"], "Missing or invalid token in response"
        assert "user" in login_json and isinstance(login_json["user"], dict), "Missing or invalid user object in response"

        token = login_json["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: GET /api/auth/me with the token
        me_response = requests.get(BASE_URL + ME_ENDPOINT, headers=headers, timeout=30)
        
        assert me_response.status_code == 200, f"Expected 200, got {me_response.status_code}"
        me_json = me_response.json()
        assert isinstance(me_json, dict), "User profile response is not a JSON object"
        # Optionally check that the returned profile matches the user from login
        # e.g. same id or email if present
        if "id" in login_json["user"]:
            assert me_json.get("id") == login_json["user"]["id"], "User ID mismatch in profile"
        if "email" in login_json["user"]:
            assert me_json.get("email") == login_json["user"]["email"], "User email mismatch in profile"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_authentication_login_and_token_retrieval()