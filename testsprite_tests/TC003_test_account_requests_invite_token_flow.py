import requests
from requests.exceptions import RequestException, Timeout
import random

base_url = "http://localhost:8000"
token_bearer = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiUkgiLCJtYXRyaWN1bGUiOiJFTVAwMDAwMSJ9.I8kwHIFud_6IOx6ymigvyflA489eg2Uh0T2yG2-HEts"

headers_auth = {
    "Authorization": f"Bearer {token_bearer}",
    "Content-Type": "application/json"
}
headers_no_auth = {
    "Content-Type": "application/json"
}

def test_account_requests_invite_token_flow():
    # Step 1: POST /api/account-requests to submit a new account request
    submit_url = f"{base_url}/api/account-requests"
    new_request_data = {
        "nom": "TestNom",
        "prenom": "TestPrenom",
        "email": f"testemail_{int(random.random()*1000000)}@example.com"
    }
    invite_token = None

    try:
        response = requests.post(submit_url, json=new_request_data, headers=headers_no_auth, timeout=30)
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}"
        # Response is a success message, no JSON expected, so skip response.json()

        # Test GET /api/account-requests/validate-token/{token} with invalid token first
        invalid_token = "invalidtoken1234567890"
        validate_url_invalid = f"{base_url}/api/account-requests/validate-token/{invalid_token}"
        resp_invalid = requests.get(validate_url_invalid, headers=headers_no_auth, timeout=30)
        assert resp_invalid.status_code == 404, f"Expected 404 for invalid token but got {resp_invalid.status_code}"

        # Get list of pending account requests with auth header to find newly created request
        pending_url = f"{base_url}/api/account-requests/pending"
        pending_resp = requests.get(pending_url, headers=headers_auth, timeout=30)
        assert pending_resp.status_code == 200, f"Expected 200 getting pending requests but got {pending_resp.status_code}"
        pending_json = pending_resp.json()
        found_request = None
        for req in pending_json:
            if req.get("email") == new_request_data["email"]:
                found_request = req
                break
        assert found_request is not None, "Created account request not found in pending requests"

        invite_token = found_request.get("token")
        assert invite_token, "Invite token not found in account request data"

        # Test GET /api/account-requests/validate-token/{token} with valid token
        validate_url_valid = f"{base_url}/api/account-requests/validate-token/{invite_token}"
        resp_valid = requests.get(validate_url_valid, headers=headers_no_auth, timeout=30)
        assert resp_valid.status_code == 200, f"Expected 200 for valid token but got {resp_valid.status_code}"

        # Test POST /api/account-requests/set-password with valid token to set password
        set_password_url = f"{base_url}/api/account-requests/set-password"
        new_password = "ValidPass123!"
        set_password_payload = {
            "token": invite_token,
            "password": new_password
        }
        set_password_resp = requests.post(set_password_url, json=set_password_payload, headers=headers_no_auth, timeout=30)
        assert set_password_resp.status_code == 200, f"Expected 200 when setting password with valid token but got {set_password_resp.status_code}"

        # Test POST /api/account-requests/set-password with expired/invalid token to verify validation error or 404
        bad_tokens = ["expiredtoken123456", "wrongtoken987654"]
        for bad_token in bad_tokens:
            payload = {
                "token": bad_token,
                "password": new_password
            }
            bad_resp = requests.post(set_password_url, json=payload, headers=headers_no_auth, timeout=30)
            assert bad_resp.status_code in (422, 404), f"Expected 422 or 404 for expired/invalid token but got {bad_resp.status_code}"

    except (RequestException, Timeout) as e:
        assert False, f"Request failed: {e}"

test_account_requests_invite_token_flow()
