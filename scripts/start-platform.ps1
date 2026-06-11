param(
    [string]$RunnerToken,
    [string]$RepoUrl = $(if ($env:GITHUB_RUNNER_REPO_URL) { $env:GITHUB_RUNNER_REPO_URL } else { 'https://github.com/Dienbi/PFE-TacTic' }),
    [switch]$SkipRunnerRecreate,
    [switch]$Build
)

$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $PSScriptRoot
$EnvRunnersPath = Join-Path $RootDir 'docker\.env.runners'
$ComposeFile = Join-Path $RootDir 'docker\docker-compose.platform.yml'

if (-not $RunnerToken) {
    $RunnerToken = Read-Host 'Paste a fresh GitHub runner registration token (Settings > Actions > Runners > New)'
}

if (-not $RunnerToken -or $RunnerToken -eq 'PASTE_A_FRESH_RUNNER_REGISTRATION_TOKEN_HERE') {
    throw 'A fresh GitHub runner registration token is required.'
}

@"
GITHUB_RUNNER_REPO_URL=$RepoUrl
GITHUB_RUNNER_TOKEN=$RunnerToken
"@ | Set-Content -Path $EnvRunnersPath -Encoding utf8 -NoNewline
Add-Content -Path $EnvRunnersPath -Value ""

Write-Host "Wrote runner token to docker/.env.runners" -ForegroundColor Cyan

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
