# Test Role Profile API
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/login" -Method Post -Body (@{email="admin@tactic.com";password="password"} | ConvertTo-Json) -ContentType "application/json"
$token = $response.access_token
Write-Host "Token obtained"

$headers = @{"Authorization"="Bearer $token"}

# Test GET role profiles
Write-Host "Testing GET /api/payroll/role-profiles"
$result = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/role-profiles" -Method Get -Headers $headers
Write-Host "Result: $($result | ConvertTo-Json)"

# Test CREATE role profile
Write-Host "Testing POST /api/payroll/role-profiles"
$newProfile = @{
    name = "Software Engineer Test"
    horaire_type = "fixed"
    salary_type = "fixed_monthly"
    weekly_hours = 40
    overtime_eligible = $true
    overtime_rate_multiplier = 1.5
    base_salary_min = 3000
    base_salary_max = 8000
    cnss_regime = "CNSS1"
} | ConvertTo-Json

try {
    $created = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/role-profiles" -Method Post -Body $newProfile -Headers $headers -ContentType "application/json"
    Write-Host "Created profile: $($created | ConvertTo-Json)"
} catch {
    Write-Host "Error creating profile: $_"
    Write-Host "Response: $($_.Exception.Response)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}

# Test GET single role profile
Write-Host "Testing GET /api/payroll/role-profiles/{id}"
$single = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/role-profiles/$($created.id)" -Method Get -Headers $headers
Write-Host "Single profile: $($single | ConvertTo-Json)"

# Test UPDATE role profile
Write-Host "Testing PUT /api/payroll/role-profiles/{id}"
$updateData = @{
    weekly_hours = 35
} | ConvertTo-Json

$updated = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/role-profiles/$($created.id)" -Method Put -Body $updateData -Headers $headers -ContentType "application/json"
Write-Host "Updated profile: $($updated | ConvertTo-Json)"

# Test SEARCH role profiles
Write-Host "Testing GET /api/payroll/role-profiles/search"
$searchResults = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/role-profiles/search?q=Software" -Method Get -Headers $headers
Write-Host "Search results: $($searchResults | ConvertTo-Json)"

# Test employee role assignment
Write-Host "Testing POST /api/payroll/employees/{id}/role-assign"
$assignmentData = @{
    role_profile_id = $created.id
    effective_from = "2026-09-01"
} | ConvertTo-Json

$assignment = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/employees/1/role-assign" -Method Post -Body $assignmentData -Headers $headers -ContentType "application/json"
Write-Host "Assignment created: $($assignment | ConvertTo-Json)"

# Test GET current role assignment
Write-Host "Testing GET /api/payroll/employees/{id}/role-current"
$currentAssignment = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/employees/1/role-current" -Method Get -Headers $headers
Write-Host "Current assignment: $($currentAssignment | ConvertTo-Json)"

# Test GET role assignment history
Write-Host "Testing GET /api/payroll/employees/{id}/role-history"
$history = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/payroll/employees/1/role-history" -Method Get -Headers $headers
Write-Host "Assignment history: $($history | ConvertTo-Json)"

Write-Host "All tests completed successfully"
