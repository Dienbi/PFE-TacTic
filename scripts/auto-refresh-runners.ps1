# Auto-refresh GitHub runners with new registration token
# Run this script daily via Windows Task Scheduler to keep runners online

param(
    [string]$RepoUrl = "https://github.com/Dienbi/PFE-TacTic"
)

Write-Host "Prompting for fresh GitHub runner registration token..."
Write-Host "Get it from: $RepoUrl/settings/actions/runners/new" -ForegroundColor Yellow

$RunnerToken = Read-Host "Paste the fresh registration token"

if (-not $RunnerToken) {
    Write-Host "No token provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "Refreshing runners with new token..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'refresh-runners.ps1') -Recreate -RunnerToken $RunnerToken -RepoUrl $RepoUrl

Write-Host "Runner refresh completed." -ForegroundColor Green
