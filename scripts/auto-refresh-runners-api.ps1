# Auto-refresh GitHub runners using GitHub API to get fresh registration token
# This script uses a PAT to automatically fetch a fresh registration token
# Run this via Windows Task Scheduler every 30 minutes

param(
    [string]$RepoUrl = "https://github.com/Dienbi/PFE-TacTic",
    [string]$Pat = $env:GITHUB_PAT
)

$ErrorActionPreference = 'Stop'

if (-not $Pat) {
    $Pat = Read-Host "Enter GitHub PAT (with repo scope)"
}

# Parse owner and repo from URL
if ($RepoUrl -match 'github\.com/([^/]+)/([^/]+)') {
    $Owner = $Matches[1]
    $Repo = $Matches[2]
} else {
    throw "Invalid repo URL format"
}

Write-Host "Fetching fresh registration token for $Owner/$Repo..." -ForegroundColor Cyan

# Get fresh registration token via GitHub API
$Headers = @{
    Authorization = "Bearer $Pat"
    Accept = "application/vnd.github.v3+json"
}

$ApiUrl = "https://api.github.com/repos/$Owner/$Repo/actions/runners/registration-token"
$Response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $Headers

$RunnerToken = $Response.token

if (-not $RunnerToken) {
    throw "Failed to get registration token from GitHub API"
}

Write-Host "Got fresh token. Refreshing runners..." -ForegroundColor Green

# Call the refresh script
& (Join-Path $PSScriptRoot 'refresh-runners.ps1') -Recreate -RunnerToken $RunnerToken -RepoUrl $RepoUrl

Write-Host "Runner refresh completed successfully." -ForegroundColor Green
