FROM python:3.11-slim

# Ensure real-time log output in container environments
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    bash \
    curl \
    wget \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

CMD ["python", "server.py"]
