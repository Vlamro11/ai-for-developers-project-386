# AGENTS.md

## Application Overview & Architecture
- **Roles**: Calendar Owner and Guests. No authentication or registration system.
- **Backend**: Python (FastAPI + Uvicorn) in `./backend`.
- **Frontend**: React + TypeScript + Vite + Tailwind CSS in `./frontend`.
- **Data Persistence**: In-memory storage only on the backend (state resets on server restart, no DB required).
- **Deployment**: Docker setup with `docker-compose.yml`.

## Commands
- **Frontend dev**: `cd frontend && npm run dev`
- **Frontend build**: `cd frontend && npm run build`
- **Backend dev (Hexlet-graded API)**: `cd backend && PYTHONPATH=. python3 -m uvicorn app.main:app --reload --port 8000`
- **Backend test (Hexlet-graded API)**: `cd backend && PYTHONPATH=. python3 -m pytest -q`
- **Backend dev (legacy custom API used by current frontend)**: `PYTHONPATH=backend python3 -m uvicorn main:app --reload --port 8000`
- **Backend test (legacy custom API)**: `PYTHONPATH=backend python3 backend/test_main.py`
- **Docker Production**: `docker compose up --build`

## Key Domain Rules
- **Slot Duration**: Fixed 30-minute time slots.
- **Booking Window**: Slots are generated/available up to 14 days ahead.
- **Double Booking**: Strict conflict prevention — no two bookings allowed for the same time slot (returns 409 Conflict).
- **Owner Flow**: Create available slots (`POST /api/slots`) and view upcoming meetings (`GET /api/bookings`).
- **Guest Flow**: View available slots (`GET /api/slots`) and book without login (`POST /api/bookings`).
