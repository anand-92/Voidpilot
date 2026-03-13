#!/bin/bash
set -euo pipefail

uv sync
cd frontend && npm install
