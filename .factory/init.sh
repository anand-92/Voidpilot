#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"
uv sync
npm --prefix "$ROOT/frontend" install
