FROM python:3.9-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

COPY ai-service/requirements.txt ./requirements.txt
RUN pip install --upgrade pip \
    && pip install --default-timeout=1000 --retries 10 -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

COPY ai-service/ ./

RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8001
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
