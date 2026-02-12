#!/usr/bin/env bash
# run-grype-local.sh - Run Grype vulnerability scan locally
#
# Replicates the CircleCI Grype Docker image scan so you can catch
# .grype.yaml issues before pushing and waiting for CI.
#
# Usage:
#   ./scripts/run-grype-local.sh                   # Build image + scan (full CI replica)
#   ./scripts/run-grype-local.sh --base-image-only  # Scan base image from registry (no Docker build)
#   ./scripts/run-grype-local.sh --dir-only         # Scan node_modules only (no Docker needed)
#
# Prerequisites:
#   - grype (brew install grype)
#   - docker (only for full image scan mode)

set -euo pipefail

BASE_IMAGE_ONLY=false
DIR_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --base-image-only) BASE_IMAGE_ONLY=true ;;
    --dir-only) DIR_ONLY=true ;;
    --help|-h)
      echo "Usage: $0 [--base-image-only] [--dir-only]"
      echo ""
      echo "  (no flags)         Build Docker image and scan it (replicates CircleCI)"
      echo "  --base-image-only  Scan base image from registry (no Docker daemon needed)"
      echo "  --dir-only         Scan node_modules directory only (no Docker needed)"
      exit 0
      ;;
  esac
done

cd "$(dirname "$0")/.."

# Verify grype is installed
if ! command -v grype &>/dev/null; then
  echo "ERROR: grype is not installed. Install with: brew install grype"
  exit 1
fi

REPO_NAME=$(node -p "require('./package.json').name.replace('@mojaloop/', '')" 2>/dev/null || basename "$PWD")
IMAGE_NAME="mojaloop/${REPO_NAME}:local"

GRYPE_CONFIG=""
if [ -f ".grype.yaml" ]; then
  GRYPE_CONFIG="-c .grype.yaml"
  echo "Using .grype.yaml config"
fi

NODE_VERSION=""
if [ -f ".nvmrc" ]; then
  NODE_VERSION=$(tr -d '[:space:]' < .nvmrc)
  echo "Node.js version: ${NODE_VERSION}"
fi

echo "Repository: ${REPO_NAME}"
echo "---"

if [ "$DIR_ONLY" = true ]; then
  echo "Scanning directory for npm vulnerabilities"
  echo "---"
  # shellcheck disable=SC2086
  grype "dir:." $GRYPE_CONFIG --fail-on high 2>&1
  EXIT_CODE=$?

elif [ "$BASE_IMAGE_ONLY" = true ]; then
  if [ -z "$NODE_VERSION" ]; then
    echo "ERROR: No .nvmrc file found"
    exit 1
  fi
  BASE_IMAGE="node:${NODE_VERSION}-alpine"
  echo "Scanning base image from registry: ${BASE_IMAGE} (no Docker daemon needed)"
  echo "---"
  # shellcheck disable=SC2086
  grype "registry:docker.io/library/${BASE_IMAGE}" $GRYPE_CONFIG --fail-on high 2>&1
  EXIT_CODE=$?

else
  if [ ! -f "Dockerfile" ]; then
    echo "No Dockerfile found - falling back to directory scan"
    echo "---"
    # shellcheck disable=SC2086
    grype "dir:." $GRYPE_CONFIG --fail-on high 2>&1
    EXIT_CODE=$?
  else
    echo "Building Docker image: ${IMAGE_NAME}"
    npm run docker:build

    echo ""
    echo "Scanning image: ${IMAGE_NAME}"
    echo "---"
    # shellcheck disable=SC2086
    grype "$IMAGE_NAME" $GRYPE_CONFIG --fail-on high 2>&1
    EXIT_CODE=$?
  fi
fi

echo ""
echo "---"
if [ $EXIT_CODE -eq 0 ]; then
  echo "PASSED: No high/critical vulnerabilities found (or all suppressed in .grype.yaml)"
else
  echo "FAILED: High/critical vulnerabilities found (exit code: $EXIT_CODE)"
  echo ""
  echo "To fix:"
  echo "  1. Add unfixable CVEs to .grype.yaml with a reason"
  echo "  2. Update Dockerfile NODE_VERSION for base image fixes"
  echo "  3. Add npm overrides in package.json for transitive deps"
fi

exit $EXIT_CODE
