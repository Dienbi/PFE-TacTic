import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

# Tokens for different roles (these would realistically be obtained dynamically, hardcoded here per instructions)
MANAGER_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiTUFOSUdFUiIsIm1hdHJpY3VsZSI6IkVNUDAwMDAxIn0.I8kwHIFud_6IOx6ymigvyflA489eg2Uh0T2yG2-HEts"  # Adjust role claim to MANAGER
RH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiUkgifQ.DBbNQXCJHYf2iDbcEQo_9mzQmh00pWX8BBJksNDuhME"  # HR role token (RH claims)
EMPLOYEE_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL2F1dGgvbG9naW4iLCJpYXQiOjE3NzIwMjIxMTcsImV4cCI6MTc3MjAyNTcxNywibmJmIjoxNzcyMDIyMTE3LCJqdGkiOiJRVmJNWEhFdnlPNjlzYlVyIiwic3ViIjoiMSIsInBydiI6ImQwOTA1YmNmNjVhNmQ5OTJkOTBjYmZlNDYyMjZiZDMxM2FlNTE5M2YiLCJyb2xlIjoiRU1QTE9ZRUUifQ.RypvDpF8lGJL687nWD2cDk11BkdTTOQjXBvESuIfJI"  # Employee role token fixed

def test_job_recruitment_pipeline_end_to_end_flow():
    headers_manager = {"Authorization": f"Bearer {MANAGER_TOKEN}"}
    headers_rh = {"Authorization": f"Bearer {RH_TOKEN}"}
    headers_employee = {"Authorization": f"Bearer {EMPLOYEE_TOKEN}"}

    job_request_id = None
    job_post_id = None
    application_id = None

    try:
        # Step 1: Manager creates job request
        postes_resp = requests.get(f"{BASE_URL}/api/postes", headers=headers_rh, timeout=TIMEOUT)
        assert postes_resp.status_code == 200
        postes = postes_resp.json()
        assert isinstance(postes, list)
        if postes:
            poste_id = postes[0].get("id")
            assert poste_id is not None
        else:
            poste_payload = {"titre": "Test Position for Job Request", "description": "Created by test"}
            poste_create = requests.post(f"{BASE_URL}/api/postes", json=poste_payload, headers=headers_rh, timeout=TIMEOUT)
            assert poste_create.status_code == 201
            poste_data = poste_create.json()
            poste_id = poste_data.get("id")
            assert poste_id is not None

        job_request_payload = {"poste_id": poste_id, "description": "Need to recruit for test job position"}
        jr_resp = requests.post(f"{BASE_URL}/api/job-requests", json=job_request_payload, headers=headers_manager, timeout=TIMEOUT)
        assert jr_resp.status_code == 201
        jr_data = jr_resp.json()
        job_request_id = jr_data.get("id")
        assert job_request_id is not None

        # Step 2: RH approves job request
        approve_resp = requests.post(f"{BASE_URL}/api/job-requests/{job_request_id}/approve", headers=headers_rh, timeout=TIMEOUT)
        assert approve_resp.status_code == 200
        apr_data = approve_resp.json()
        assert apr_data.get("id") == job_request_id

        # Step 3: RH creates job post
        # Provide required valid payload for job post creation according to PRD reasoning
        job_post_payload = {"poste_id": poste_id, "description": "Job post created by test"}
        job_post_resp = requests.post(f"{BASE_URL}/api/job-posts", json=job_post_payload, headers=headers_rh, timeout=TIMEOUT)
        assert job_post_resp.status_code == 201
        jp_data = job_post_resp.json()
        job_post_id = jp_data.get("id")
        assert job_post_id is not None

        # Step 4: Employee submits application for job_post_id
        application_payload = {"job_post_id": job_post_id}
        app_resp = requests.post(f"{BASE_URL}/api/applications", json=application_payload, headers=headers_employee, timeout=TIMEOUT)
        assert app_resp.status_code == 201
        app_data = app_resp.json()
        application_id = app_data.get("id")
        assert application_id is not None

        # Step 5: RH gets AI ranked candidates for jobPostId
        ai_match_resp = requests.get(f"{BASE_URL}/api/ai/match/{job_post_id}", headers=headers_rh, timeout=TIMEOUT)
        assert ai_match_resp.status_code == 200
        ranked_candidates = ai_match_resp.json()
        assert isinstance(ranked_candidates, list)

    finally:
        if application_id:
            try:
                withdraw_resp = requests.post(f"{BASE_URL}/api/applications/{application_id}/withdraw", headers=headers_employee, timeout=TIMEOUT)
            except Exception:
                pass
        if job_post_id:
            try:
                close_resp = requests.post(f"{BASE_URL}/api/job-posts/{job_post_id}/close", headers=headers_rh, timeout=TIMEOUT)
            except Exception:
                pass


test_job_recruitment_pipeline_end_to_end_flow()
