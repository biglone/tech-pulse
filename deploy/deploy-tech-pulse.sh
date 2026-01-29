#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${TECH_PULSE_REPO_DIR:-$HOME/workspace/tech-pulse}"
BRANCH="${TECH_PULSE_BRANCH:-main}"
LOCK_FILE="${TECH_PULSE_DEPLOY_LOCK:-$HOME/.cache/tech-pulse/deploy.lock}"
EXPECTED_ORIGIN="${TECH_PULSE_DEPLOY_EXPECTED_ORIGIN:-}"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "[deploy] invalid repo dir (missing .git): $REPO_DIR"
  exit 1
fi

if [[ -n "$EXPECTED_ORIGIN" ]]; then
  ACTUAL_ORIGIN="$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || true)"
  if [[ -z "$ACTUAL_ORIGIN" ]]; then
    echo "[deploy] missing git remote: origin"
    exit 1
  fi
  NORMALIZED_EXPECTED="${EXPECTED_ORIGIN%.git}"
  NORMALIZED_ACTUAL="${ACTUAL_ORIGIN%.git}"
  if [[ "$NORMALIZED_EXPECTED" != "$NORMALIZED_ACTUAL" ]]; then
    echo "[deploy] refusing: origin mismatch"
    echo "[deploy] expected: $EXPECTED_ORIGIN"
    echo "[deploy] actual:   $ACTUAL_ORIGIN"
    exit 1
  fi
fi

mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[deploy] another deploy is running"
  exit 0
fi

echo "[deploy] start: $(date -Is)"

git -C "$REPO_DIR" fetch origin "$BRANCH"
LOCAL="$(git -C "$REPO_DIR" rev-parse HEAD)"
REMOTE="$(git -C "$REPO_DIR" rev-parse "origin/$BRANCH")"

if [[ "$LOCAL" == "$REMOTE" ]]; then
  echo "[deploy] no changes (HEAD=$LOCAL)"
  exit 0
fi

if ! git -C "$REPO_DIR" diff --quiet || ! git -C "$REPO_DIR" diff --cached --quiet; then
  echo "[deploy] working tree not clean; aborting deploy"
  exit 1
fi

echo "[deploy] update: $LOCAL -> $REMOTE"
git -C "$REPO_DIR" checkout "$BRANCH"
git -C "$REPO_DIR" merge --ff-only "origin/$BRANCH"

cd "$REPO_DIR"
docker compose -f docker-compose.yml up -d --build app worker

echo "[deploy] done: $(date -Is)"
