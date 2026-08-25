# Hexlet Calls — Сервис бронирования встреч

Приложение для бронирования 30-минутных встреч между Организатором (Owner) и Гостями (Guest).

## Архитектура и стек технологий

- **Backend**: Python (FastAPI + Uvicorn)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Data Persistence**: Хранение данных в памяти (In-memory storage)
- **Containerization**: Docker, Docker Compose

## Основные возможности

- **Организатор (Owner)**:
  - Создание доступных слотов времени (длительность 30 минут, до 14 дней вперед).
  - Просмотр забронированных встреч и деталей гостей.
- **Гость (Guest)**:
  - Просмотр доступных слотов без необходимости регистрации.
  - Бронирование слота с указанием имени и контакта.
  - Защита от повторного бронирования того же слота (`409 Conflict`).

## Быстрый запуск

### 1. Через Docker Compose (Рекомендуется)

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

---

### 2. Локальный запуск (для разработки)

#### Запуск Бэкенда:

```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
PYTHONPATH=backend python3 -m uvicorn main:app --reload --port 8000
```

#### Запуск Фронтенда:

```bash
cd frontend
npm install
npm run dev
```

Фронтенд будет доступен по адресу http://localhost:5173 (запросы к `/api/*` автоматически проксируются на бэкенд).

---

## Тестирование

Для проверки бэкенда и логики предотвращения конфликтов бронирования:

```bash
PYTHONPATH=backend python3 backend/test_main.py
```
