function Clear-RunnerRegistrationVolumes {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ComposeBase
    )

    $runnerServices = @(
        'github-runner-1', 'github-runner-2', 'github-runner-3', 'github-runner-4'
    )

    Write-Host 'Stopping runners and clearing stale registration data...' -ForegroundColor Yellow
    & docker @($ComposeBase + @('stop') + $runnerServices) 2>$null | Out-Null
    & docker @($ComposeBase + @('rm', '-f') + $runnerServices) 2>$null | Out-Null

    $volumeNames = @(
        'tactic-platform_github_runner_1_data',
        'tactic-platform_github_runner_2_data',
        'tactic-platform_github_runner_3_data',
        'tactic-platform_github_runner_4_data'
    )

    foreach ($volumeName in $volumeNames) {
        $existing = & docker volume ls -q -f "name=^${volumeName}$"
        if ($existing) {
            & docker volume rm $volumeName | Out-Null
            Write-Host "Removed volume $volumeName" -ForegroundColor DarkYellow
        }
    }
}

function Write-RunnerEnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$RepoUrl,

        [Parameter(Mandatory = $true)]
        [string]$RunnerToken
    )

    $normalizedRepoUrl = $RepoUrl.Trim().TrimEnd('/')
    if ($normalizedRepoUrl.EndsWith('.git')) {
        $normalizedRepoUrl = $normalizedRepoUrl.Substring(0, $normalizedRepoUrl.Length - 4)
    }

    if ($normalizedRepoUrl -notmatch '^https://github\.com/[^/]+/[^/]+$') {
        throw "Invalid repository URL '$RepoUrl'. Expected format: https://github.com/OWNER/REPO (no .git suffix)."
    }

    $normalizedToken = $RunnerToken.Trim()
    if ($normalizedToken.Length -lt 20) {
        throw 'Runner token looks too short. Generate a fresh token from the repository Actions > Runners page.'
    }

    $content = "GITHUB_RUNNER_REPO_URL=$normalizedRepoUrl`nGITHUB_RUNNER_TOKEN=$normalizedToken`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
}
