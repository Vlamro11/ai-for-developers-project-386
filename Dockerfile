# Единый образ приложения: FastAPI backend + собранный React-фронтенд,
# отдаваемый той же самой uvicorn-раздачей (frontend/dist монтируется как
# статика в src/main.py). Нужен как корневой Dockerfile для CI/проверок,
# которые ожидают единственный образ проекта, собираемый из корня репозитория.
#
# Для полноценной "боевой" разработки/деплоя по-прежнему используется
# docker-compose.yml (backend + frontend как отдельные сервисы, nginx-прокси).

# ---- Stage 1: сборка фронтенда ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend + статика фронтенда ----
FROM python:3.12-slim AS final
WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src ./src
COPY --from=frontend-build /app/frontend/dist ./static

ENV FRONTEND_DIST_DIR=/app/static
EXPOSE 8000

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
