param(
    [switch]$Recreate,
    [string]$RunnerToken,
    [string]$RepoUrl = $(if ($env:GITHUB_RUNNER_REPO_URL) { $env:GITHUB_RUNNER_REPO_URL } else { 'https://github.com/Dienbi/PFE-TacTic' })
)

$ErrorActionPreference = 'Stop'

if (-not $RepoUrl) {
    throw 'Set GITHUB_RUNNER_REPO_URL to your GitHub repository URL.'
}

if (-not $RunnerToken) {
    $RunnerToken = Read-Host 'Paste a fresh GitHub runner registration token'
}

if (-not $RunnerToken) {
    throw 'A fresh GitHub runner registration token is required.'
}

if ($RunnerToken -eq 'PASTE_A_FRESH_RUNNER_REGISTRATION_TOKEN_HERE') {
    throw 'Replace the placeholder token with a fresh GitHub runner registration token.'
}

$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'docker\.env.runners'
@"
GITHUB_RUNNER_REPO_URL=$RepoUrl
GITHUB_RUNNER_TOKEN=$RunnerToken
"@ | Set-Content -Path $envFile -Encoding utf8 -NoNewline
Add-Content -Path $envFile -Value ""

$composeBase = @(
    'compose',
    '--env-file', $envFile,
    '-f', 'docker/docker-compose.platform.yml'
)

Write-Host 'Refreshing runners only (platform unchanged)...' -ForegroundColor Cyan
docker @($composeBase + @('up', '-d', '--build', '--force-recreate', '--no-deps',
    'github-runner-1', 'github-runner-2', 'github-runner-3', 'github-runner-4'))
docker @($composeBase + @('ps', 'github-runner-1', 'github-runner-2', 'github-runner-3', 'github-runner-4'))