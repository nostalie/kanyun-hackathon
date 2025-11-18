#!/usr/bin/env sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
VENV_DIR="$ROOT_DIR/.venv"
REQ_FILE="$ROOT_DIR/requirements.txt"
SERVER_SCRIPT="$ROOT_DIR/src/python/main.py"

if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1090
. "$VENV_DIR/bin/activate"

pip install -r "$REQ_FILE"

exec python "$SERVER_SCRIPT"
