#!/usr/bin/env bash
set -euo pipefail

RECREATE=false
RUNNER_TOKEN=""
REPO_URL="${GITHUB_RUNNER_REPO_URL:-https://github.com/Dienbi/PFE-TacTic}"

usage() {
  cat <<'EOF'
Usage: ./scripts/refresh-runners.sh [--recreate] [--token TOKEN] [--repo-url URL]

Starts 4 self-hosted GitHub Actions runners via Docker Compose.

Environment:
  GITHUB_RUNNER_REPO_URL   Repository URL (default: PFE-TacTic)
  GITHUB_RUNNER_TOKEN      Registration token from GitHub (required)

Options:
  --recreate               Force recreate containers (use after token rotation)
  --token TOKEN            Runner registration token
  --repo-url URL           GitHub repository URL
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --recreate)
      RECREATE=true
      shift
      ;;
    --token)
      RUNNER_TOKEN="${2:-}"
      shift 2
      ;;
    --repo-url)
      REPO_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$RUNNER_TOKEN" ]]; then
  RUNNER_TOKEN="${GITHUB_RUNNER_TOKEN:-}"
fi

if [[ -z "$RUNNER_TOKEN" ]]; then
  read -r -s -p "Paste a fresh GitHub runner registration token: " RUNNER_TOKEN
  echo
fi

if [[ -z "$RUNNER_TOKEN" || "$RUNNER_TOKEN" == "PASTE_A_FRESH_RUNNER_REGISTRATION_TOKEN_HERE" ]]; then
  echo "A fresh GitHub runner registration token is required." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_RUNNERS="${ROOT_DIR}/docker/.env.runners"
cat >"$ENV_RUNNERS" <<EOF
GITHUB_RUNNER_REPO_URL=${REPO_URL}
GITHUB_RUNNER_TOKEN=${RUNNER_TOKEN}
EOF

COMPOSE=(docker compose --env-file "$ENV_RUNNERS" -f docker/docker-compose.platform.yml)

echo "Refreshing runners only for $REPO_URL ..."
"${COMPOSE[@]}" up -d --build --force-recreate --no-deps \
  github-runner-1 github-runner-2 github-runner-3 github-runner-4
"${COMPOSE[@]}" ps github-runner-1 github-runner-2 github-runner-3 github-runner-4

echo
echo "Runners should appear under: $REPO_URL/settings/actions/runners"
