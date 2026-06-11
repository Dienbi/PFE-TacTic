#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${GITHUB_RUNNER_REPO_URL:-https://github.com/Dienbi/PFE-TacTic}"
RUNNER_TOKEN="${GITHUB_RUNNER_TOKEN:-}"
SKIP_RECREATE=false
BUILD=false

usage() {
  cat <<'EOF'
Usage: ./scripts/start-platform.sh [--token TOKEN] [--repo-url URL] [--skip-runner-recreate] [--build]

Starts the TacTic platform stack (SonarQube, Nexus, Prometheus, Grafana)
and 4 GitHub Actions self-hosted runners with a fresh registration token.

Get a token from: GitHub repo → Settings → Actions → Runners → New self-hosted runner
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token) RUNNER_TOKEN="${2:-}"; shift 2 ;;
    --repo-url) REPO_URL="${2:-}"; shift 2 ;;
    --skip-runner-recreate) SKIP_RECREATE=true; shift ;;
    --build) BUILD=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_RUNNERS="${ROOT_DIR}/docker/.env.runners"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose.platform.yml"

if [[ -z "$RUNNER_TOKEN" ]]; then
  read -r -s -p "Paste a fresh GitHub runner registration token: " RUNNER_TOKEN
  echo
fi

if [[ -z "$RUNNER_TOKEN" || "$RUNNER_TOKEN" == "PASTE_A_FRESH_RUNNER_REGISTRATION_TOKEN_HERE" ]]; then
  echo "A fresh GitHub runner registration token is required." >&2
  exit 1
fi

cat >"$ENV_RUNNERS" <<EOF
GITHUB_RUNNER_REPO_URL=${REPO_URL}
GITHUB_RUNNER_TOKEN=${RUNNER_TOKEN}
EOF

echo "Wrote runner token to docker/.env.runners"

COMPOSE=(docker compose --env-file "$ENV_RUNNERS" -f "$COMPOSE_FILE")

UP_ARGS=(up -d)
if [[ "$BUILD" == true ]]; then
  UP_ARGS+=(--build)
fi

echo "Starting platform + runners..."
"${COMPOSE[@]}" "${UP_ARGS[@]}"

if [[ "$SKIP_RECREATE" == false ]]; then
  echo "Recreating runners with fresh registration token..."
  "${COMPOSE[@]}" up -d --force-recreate --no-deps \
    github-runner-1 github-runner-2 github-runner-3 github-runner-4
fi

"${COMPOSE[@]}" ps

echo ""
echo "Platform:  http://localhost:9000 (SonarQube), :8081 (Nexus), :3001 (Grafana)"
echo "Runners:   ${REPO_URL}/settings/actions/runners"
