#!/bin/bash
set -e

echo "Installing Python dependencies with uv..."
uv sync

echo "Installing Frontend dependencies with npm..."
cd frontend && npm install
