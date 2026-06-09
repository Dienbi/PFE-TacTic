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

$env:GITHUB_RUNNER_REPO_URL = $RepoUrl
$env:GITHUB_RUNNER_TOKEN = $RunnerToken

$composeArgs = @(
    '-f', 'docker/docker-compose.runners.yml',
    'up', '-d', '--build'
)

if ($Recreate) {
    $composeArgs += '--force-recreate'
    $composeArgs += '--remove-orphans'
}

docker compose @composeArgs
docker compose -f docker/docker-compose.runners.yml ps