import requests

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30

def test_account_requests_invite_token_flow():
    headers_public = {"Content-Type": "application/json"}

    # 1. Submit a new account request (POST /api/account-requests)
    account_request_payload = {
        "nom": "TestLastName",
        "prenom": "TestFirstName",
        "email": "testuser_invite_token_flow@example.com"
    }
    response_post_request = requests.post(
        f"{BASE_URL}/account-requests",
        json=account_request_payload,
        headers=headers_public,
        timeout=TIMEOUT
    )
    assert response_post_request.status_code == 200
    assert response_post_request.text.strip() != "", "Response should contain a success message"

    invalid_token = "invalidtoken1234567890"

    # 2. Test GET /api/account-requests/validate-token/{token} with invalid token (expect 404)
    response_validate_invalid = requests.get(
        f"{BASE_URL}/account-requests/validate-token/{invalid_token}",
        headers=headers_public,
        timeout=TIMEOUT
    )
    assert response_validate_invalid.status_code == 404

    # 3. Test POST /api/account-requests/set-password with invalid token (expect 422 or 404)
    response_set_password_invalid = requests.post(
        f"{BASE_URL}/account-requests/set-password",
        json={
            "token": invalid_token,
            "password": "NewStrongPassword123!"
        },
        headers=headers_public,
        timeout=TIMEOUT
    )
    assert response_set_password_invalid.status_code in (422, 404)


test_account_requests_invite_token_flow()
