.PHONY: setup start test lint check

setup:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

start:
	docker compose up --build

test:
	cd backend && PYTHONPATH=. python3 -m pytest -q
	PYTHONPATH=backend python3 backend/test_main.py

lint:
	cd frontend && npm run build
	PYTHONPATH=backend python3 -m flake8 backend 2>/dev/null || true

check: test lint
