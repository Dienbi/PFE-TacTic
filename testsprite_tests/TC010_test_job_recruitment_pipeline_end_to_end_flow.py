import requests
import traceback

BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 30


def login(email: str, password: str) -> str:
    url = f"{BASE_URL}/auth/login"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    data = response.json()
    token = data.get("token")
    assert token, f"No token received for {email}"
    return token


def test_job_recruitment_pipeline_end_to_end_flow():
    # Credentials
    manager_email = "manager@tactic.com"
    manager_password = "password"

    rh_email = "admin@tactic.com"
    rh_password = "password"

    employee_email = "employee@tactic.com"
    employee_password = "password"

    # Login all users
    manager_token = None
    rh_token = None
    employee_token = None

    job_request_id = None
    job_post_id = None
    application_id = None

    headers_manager = None
    headers_rh = None
    headers_employee = None

    try:
        manager_token = login(manager_email, manager_password)
        headers_manager = {"Authorization": f"Bearer {manager_token}"}

        rh_token = login(rh_email, rh_password)
        headers_rh = {"Authorization": f"Bearer {rh_token}"}

        employee_token = login(employee_email, employee_password)
        headers_employee = {"Authorization": f"Bearer {employee_token}"}

        # Step 1: Create Job Request with manager token
        # Need a valid poste_id for the request; get first poste from RH token (assuming RH can list postes)
        postes_resp = requests.get(f"{BASE_URL}/postes", headers=headers_rh, timeout=TIMEOUT)
        assert postes_resp.status_code == 200, f"Failed to get postes: {postes_resp.text}"
        postes = postes_resp.json()
        assert isinstance(postes, list) and len(postes) > 0, "No postes found to create job request"
        poste_id = postes[0].get("id")
        assert poste_id, "poste_id missing in postes data"

        job_request_payload = {
            "poste_id": poste_id,
            "description": "Need to fill this position urgently"
        }
        create_job_request_resp = requests.post(
            f"{BASE_URL}/job-requests", headers=headers_manager, json=job_request_payload, timeout=TIMEOUT
        )
        assert create_job_request_resp.status_code == 201, f"Failed to create job request: {create_job_request_resp.text}"
        job_request = create_job_request_resp.json()
        job_request_id = job_request.get("id")
        assert job_request_id is not None, "Created job request ID missing"

        # Step 2: Approve job request with RH token
        approve_resp = requests.post(
            f"{BASE_URL}/job-requests/{job_request_id}/approve", headers=headers_rh, timeout=TIMEOUT
        )
        assert approve_resp.status_code == 200, f"Failed to approve job request: {approve_resp.text}"
        approved_job_request = approve_resp.json()
        assert approved_job_request.get("id") == job_request_id, "Approved job request ID mismatch"

        # Step 3: Create job post with RH token
        job_post_payload = {
            "poste_id": poste_id,
            "title": "Open Position for Automated Test",
            "description": "Job post created during automated test",
            "location": "Tunis",
            "salary_range": "Negotiable",
            "employment_type": "Full-time",
            "requirements": "Test requirements",
            "responsibilities": "Test responsibilities"
        }
        # Note: PRD doesn't specify exact payload for job-posts creation. Using common/reasonable fields; if ignored by API should still work.
        # If extra fields cause error, try minimal payload with only poste_id.

        # As per PRD, POST /api/job-posts with RH token returns 201 with job post object.
        # Payload used is minimal with only poste_id. To be safe, send only poste_id.
        minimal_payload = {
            "poste_id": poste_id
        }
        create_job_post_resp = requests.post(
            f"{BASE_URL}/job-posts", headers=headers_rh, json=minimal_payload, timeout=TIMEOUT
        )
        assert create_job_post_resp.status_code == 201, f"Failed to create job post: {create_job_post_resp.text}"
        job_post = create_job_post_resp.json()
        job_post_id = job_post.get("id")
        assert job_post_id is not None, "Created job post ID missing"

        # Step 4: Submit application with employee token
        application_payload = {
            "job_post_id": job_post_id
        }
        create_application_resp = requests.post(
            f"{BASE_URL}/applications", headers=headers_employee, json=application_payload, timeout=TIMEOUT
        )
        assert create_application_resp.status_code == 201, f"Failed to create application: {create_application_resp.text}"
        application = create_application_resp.json()
        application_id = application.get("id")
        assert application_id is not None, "Created application ID missing"

        # Step 5: Get AI-ranked candidates with RH token
        ai_match_resp = requests.get(
            f"{BASE_URL}/ai/match/{job_post_id}", headers=headers_rh, timeout=TIMEOUT
        )
        assert ai_match_resp.status_code == 200, f"Failed to get AI-ranked candidates: {ai_match_resp.text}"
        ranked_candidates = ai_match_resp.json()
        assert isinstance(ranked_candidates, list), "AI-ranked candidates response is not a list"

    except Exception:
        traceback.print_exc()
        assert False, "Test case test_job_recruitment_pipeline_end_to_end_flow failed due to an unexpected error."
    finally:
        # Cleanup if applicable: delete created application, job post, job request if DELETE endpoints exist.
        # PRD does not specify DELETE endpoints for these resources => no deletion here.
        pass


test_job_recruitment_pipeline_end_to_end_flow()