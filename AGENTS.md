# AGENTS.md

Инструкция для AI-агентов, работающих с этим репозиторием.

## О проекте

Сервис предварительной записи на телефонный звонок. Владелец публикует
доступные интервалы, гости бронируют 30-минутные слоты. Без авторизации,
без БД — всё состояние в памяти процесса backend (сбрасывается при рестарте).

Полное ТЗ и бизнес-правила см. в `contract/openapi.yaml` (источник правды по API)
и в докстрингах `backend/src/domain/booking_window.py`, `backend/src/store/slots_store.py`.

## Структура

```
backend/    FastAPI, in-memory store, бизнес-логика (src/domain, routes, schemas, store)
frontend/   React + TS + Vite SPA (src/components, src/api, src/pages)
contract/   openapi.yaml — единственный источник правды по API
```

Любое изменение API: сначала правится `contract/openapi.yaml`, потом backend, потом frontend.

## Команды

```bash
# backend — тесты (используй python3; если есть backend/.venv, активируй его или вызывай
# .venv/bin/python — на некоторых машинах команды "python" без venv не существует)
cd backend && PYTHONPATH=. python3 -m pytest -q
# один файл/тест:
cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_bookings.py::test_name

# frontend — сборка и линт (автотестов на фронте нет)
cd frontend && npm ci && npm run build   # tsc -b && vite build
cd frontend && npm run lint              # oxlint

# перегенерировать типы фронта из контракта после правки openapi.yaml
cd frontend && npm run generate:types    # пишет src/api/schema.ts — закоммитить результат
```

CI (`.github/workflows/ci.yml`) гоняет backend-тесты и frontend-build раздельно, порядок между
ними не важен (независимые джобы). У backend-теста в CI `python-version: '3.11'`, хотя
`pyproject.toml` требует `>=3.12` — не используй синтаксис/фичи, доступные только в 3.12+.

## Деплой: два независимых пути — не путать

- **Корневой `Dockerfile`** — единый образ (backend раздаёт собранную статику фронтенда
  через `StaticFiles`, см. `backend/src/main.py`, `FRONTEND_DIST_DIR`). Нужен ИСКЛЮЧИТЕЛЬНО
  для `.github/workflows/hexlet-check.yml` (сторонний проверяющий Action собирает образ из
  корня репозитория при checkout).
- **`docker-compose.yml`** — backend и frontend как отдельные сервисы, nginx
  (`frontend/docker/nginx.conf`) проксирует `/api/*` на backend. Используется для локальной
  разработки/полноценного деплоя.

Меняя один Dockerfile, проверь, не нужно ли то же самое во втором — они не связаны.

## Критичный готча: hexlet-check требует закоммиченных файлов

`.github/workflows/hexlet-check.yml` — **не удалять и не переименовывать** (сгенерирован
Хекслетом). Он делает `git checkout` и строит корневой `Dockerfile` из чистого чекаута.
Любой файл, нужный для сборки (Dockerfile, .dockerignore, исходники), должен быть
**закоммичен в git**, иначе CI получит `open Dockerfile: no such file or directory` —
файлы на диске рабочей копии не помогают, если они не в индексе/коммите.
Перед тем как считать задачу завершённой, проверяй `git status --short` на `??`/`M` в
файлах, критичных для сборки.

## Бизнес-правила бронирования (покрыты тестами, не должны быть нарушены)

1. Слот — 30 минут, окно записи `[now, now + 14 дней]`, пересчитывается на каждый запрос
   от `now_utc()` (см. `backend/src/domain/booking_window.py`) — отдельного джоба нет.
2. Забронировать можно только `free`-слот в пределах окна.
3. Бронирование атомарно: `SlotsStore` использует один общий `asyncio.Lock` на процесс
   (`backend/src/store/slots_store.py`), проверка статуса и его запись — в одной секции лока.
   При гонке ровно один запрос получает `201`, остальные — `409`.
   Тест-эталон: `backend/tests/test_concurrent_booking.py` (20 параллельных запросов на 1 слот).
4. Все времена на backend — UTC; локальную таймзону конвертирует только frontend.

## Конвенция API-моделей backend

Pydantic-модели в `backend/src/schemas/models.py` объявляют поля в `snake_case`, а наружу
(JSON) отдают `camelCase` через `Field(alias=...)` + `ConfigDict(populate_by_name=True)`
(базовый класс `ApiModel`). При добавлении новых полей — следовать этому паттерну, не менять
регистр в контракте вручную.

## Тесты backend

- `pytest.ini`: `asyncio_mode = auto` — async-тесты не нужно помечать `@pytest.mark.asyncio`.
- `tests/conftest.py`: фикстура `client` — `httpx.AsyncClient` поверх ASGI-приложения
  (без реального сервера), `base_url="http://test/api"` — в тестах пути пишутся без
  префикса `/api` (например `client.post("/bookings", ...)`).
- Автоюз-фикстура `_reset_store` сбрасывает in-memory store перед/после каждого теста
  (`slots_store.reset_store()`) — состояние между тестами никогда не переиспользуется.

## Открытые вопросы (см. также README)

- Отмена/перенос брони гостем — не реализовано, в ТЗ не упомянуто.
- Таймзона владельца при публикации интервалов — не фиксирована, полагаемся на клиента.
- Защита `POST /api/owner/availability` — эндпоинт без авторизации по ТЗ; уточнить у
  заказчика допустимость перед публичным деплоем.
