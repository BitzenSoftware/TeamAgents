# Build context = raiz do repo (precisamos de backend/ E agents/).
# Render: dockerfilePath=./backend/Dockerfile, dockerContext=.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/app ./app
COPY agents ./agents

EXPOSE 8000

# Render injeta $PORT; localmente cai para 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
