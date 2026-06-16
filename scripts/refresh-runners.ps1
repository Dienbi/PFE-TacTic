param(
    [switch]$Recreate,
    [string]$RunnerToken,
    [string]$RepoUrl = $(if ($env:GITHUB_RUNNER_REPO_URL) { $env:GITHUB_RUNNER_REPO_URL } else { 'https://github.com/Dienbi/PFE-TacTic' })
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'Write-RunnerEnv.ps1')

if (-not $RepoUrl) {
    throw 'Set GITHUB_RUNNER_REPO_URL to your GitHub repository URL.'
}

if (-not $RunnerToken) {
    Write-Host 'Get a fresh token: https://github.com/Dienbi/PFE-TacTic/settings/actions/runners/new' -ForegroundColor Yellow
    $RunnerToken = Read-Host 'Paste a fresh GitHub runner registration token'
}

if (-not $RunnerToken) {
    throw 'A fresh GitHub runner registration token is required.'
}

if ($RunnerToken -eq 'PASTE_A_FRESH_RUNNER_REGISTRATION_TOKEN_HERE') {
    throw 'Replace the placeholder token with a fresh GitHub runner registration token.'
}

$RootDir = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $RootDir 'docker\.env.runners'
$ComposeFile = Join-Path $RootDir 'docker\docker-compose.platform.yml'
Write-RunnerEnvFile -Path $envFile -RepoUrl $RepoUrl -RunnerToken $RunnerToken

$composeBase = @(
    'compose',
    '--env-file', $envFile,
    '-f', $ComposeFile
)

Clear-RunnerRegistrationVolumes -ComposeBase $composeBase

Write-Host 'Refreshing runners only (platform unchanged)...' -ForegroundColor Cyan
docker @($composeBase + @('up', '-d', '--build', '--force-recreate', '--no-deps',
    'github-runner-1', 'github-runner-2', 'github-runner-3', 'github-runner-4'))
docker @($composeBase + @('ps', 'github-runner-1', 'github-runner-2', 'github-runner-3', 'github-runner-4'))