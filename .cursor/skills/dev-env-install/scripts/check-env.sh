#!/usr/bin/env bash
# Check for Node.js, npm, yarn, and Docker. Outputs missing tools for dev-env-install skill.

set -e

MISSING=()

check_cmd() {
  if command -v "$1" &>/dev/null; then
    return 0
  else
    return 1
  fi
}

if ! check_cmd node; then
  MISSING+=(node)
fi

if ! check_cmd npm; then
  MISSING+=(npm)
fi

if ! check_cmd yarn; then
  MISSING+=(yarn)
fi

if ! check_cmd docker; then
  MISSING+=(docker)
fi

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "OK: node, npm, yarn, and docker are installed."
  exit 0
fi

echo "MISSING: ${MISSING[*]}"
exit 1
