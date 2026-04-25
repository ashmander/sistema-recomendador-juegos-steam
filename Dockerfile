FROM python:3.13-slim

WORKDIR /app

# Instalar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copiar archivos de dependencias primero (cache de Docker)
COPY pyproject.toml uv.lock* ./

# Instalar dependencias (sin dev)
RUN uv sync --no-dev --no-install-project

# Copiar el resto del proyecto
COPY . .

EXPOSE 7860

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
