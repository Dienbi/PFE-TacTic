param(
    [string]$RunnerToken,
    [string]$RepoUrl = $(if ($env:GITHUB_RUNNER_REPO_URL) { $env:GITHUB_RUNNER_REPO_URL } else { 'https://github.com/Dienbi/PFE-TacTic' }),
    [switch]$SkipRunnerRecreate,
    [switch]$Build
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'Write-RunnerEnv.ps1')

$RootDir = Split-Path -Parent $PSScriptRoot
$EnvRunnersPath = Join-Path $RootDir 'docker\.env.runners'
$ComposeFile = Join-Path $RootDir 'docker\docker-compose.platform.yml'

if (-not $RunnerToken) {
    Write-Host 'Get a fresh token: https://github.com/Dienbi/PFE-TacTic/settings/actions/runners/new' -ForegroundColor Yellow
    Write-Host 'Use the Linux repository runner page (not organization runners). Tokens expire in ~1 hour.' -ForegroundColor Yellow
    $RunnerToken = Read-Host 'Paste a fresh GitHub runner registration token'
}

if (-not $RunnerToken -or $RunnerToken -eq 'PASTE_A_FRESH_RUNNER_REGISTRATION_TOKEN_HERE') {
    throw 'A fresh GitHub runner registration token is required.'
}

Write-RunnerEnvFile -Path $EnvRunnersPath -RepoUrl $RepoUrl -RunnerToken $RunnerToken

Write-Host "Wrote runner token to docker/.env.runners (UTF-8, no BOM)" -ForegroundColor Cyan

$composeBase = @(
    'compose',
    '--env-file', $EnvRunnersPath,
    '-f', $ComposeFile
)

$upArgs = $composeBase + @('up', '-d')
if ($Build) {
    $upArgs += '--build'
}

Write-Host "Starting platform + runners..." -ForegroundColor Cyan
& docker @upArgs

if (-not $SkipRunnerRecreate) {
    Clear-RunnerRegistrationVolumes -ComposeBase $composeBase

    Write-Host "Recreating runners with fresh registration token..." -ForegroundColor Cyan
    $recreateArgs = $composeBase + @(
        'up', '-d', '--force-recreate', '--no-deps',
        'github-runner-1', 'github-runner-2', 'github-runner-3', 'github-runner-4'
    )
    & docker @recreateArgs
}

& docker @($composeBase + @('ps'))

Write-Host ""
Write-Host "Platform:  http://localhost:9000 (SonarQube), :8081 (Nexus), :3001 (Grafana)" -ForegroundColor Green
Write-Host "Runners:   https://github.com/Dienbi/PFE-TacTic/settings/actions/runners" -ForegroundColor Green
