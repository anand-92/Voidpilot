# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Ensure bin scripts are executable (fixes Alpine permission issues)
RUN chmod +x node_modules/.bin/* 2>/dev/null || true

# Copy source
COPY frontend/ ./

# Build the React app (web-only, skip Electron)
RUN npx vite build

# Stage 2: Python backend
FROM python:3.12-slim AS backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Copy backend files
COPY pyproject.toml uv.lock ./
COPY src ./src

# Install Python dependencies using uv
RUN uv sync --no-dev

# Copy built frontend from first stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose port
EXPOSE 8080

# Run the app
CMD ["uv", "run", "uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
