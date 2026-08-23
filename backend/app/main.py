"""FastAPI-приложение «ОКНА API».

Запуск:  uvicorn app.main:app --reload --port 8000
Документация API (Swagger): http://localhost:8000/docs
"""

import time as _time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter

from . import __version__
from .config import (
    EVENT_TYPES,
    LUNCH,
    MAX_BOOKING_HORIZON_DAYS,
    SERVICE_NAME,
    WORK_HOURS,
)
from .models import (
    BookingCreate,
    BookingOut,
    DayAvailabilityOut,
    DaySlotsOut,
    EventTypeOut,
    MetaOut,
    WorkHoursOut,
)
from .service import (
    BusinessError,
    availability,
    cancel_booking,
    create_booking,
    day_slots,
    event_type_or_404,
    record_to_out,
)
from .store import BookingRecord, store

# ---------------------------------------------------------------------------
# Стартовое наполнение (демо-данные, как и всё хранилище — живут до перезапуска)
# ---------------------------------------------------------------------------

_SEED = [
    (0, 10 * 60, "consult", "Анна Крылова", "anna.k@example.ru", "Хочу обсудить редизайн каталога"),
    (0, 12 * 60, "intro", "Пётр Савельев", "p.saveliev@example.ru", ""),
    (0, 15 * 60 + 30, "workshop", "Мария Демидова", "m.demidova@example.ru", "Нужна помощь с воронкой"),
    (1, 11 * 60, "consult", "Илья Гончаров", "ilya.g@example.ru", ""),
    (1, 14 * 60, "intro", "Соня Ветрова", "sonya.v@example.ru", "По рекомендации Дмитрия"),
    (2, 10 * 60 + 30, "workshop", "Глеб Никитин", "gleb.n@example.ru", ""),
    (2, 16 * 60, "consult", "Вера Ланская", "vera.l@example.ru", ""),
    (3, 12 * 60 + 30, "intro", "Тимур Алиев", "timur.a@example.ru", ""),
    (4, 11 * 60, "consult", "Ольга Мирова", "olga.m@example.ru", ""),
    (5, 12 * 60, "intro", "Денис Царёв", "denis.ts@example.ru", ""),
]


def _seed() -> None:
    """Заполнить хранилище демо-записями (пропуская выходные, перерыв и прошлое)."""
    if store.count() > 0:
        return
    base = date.today()
    current = datetime.now()
    for offset, start, et_id, name, email, comment in _SEED:
        et = EVENT_TYPES[et_id]
        day = base + timedelta(days=offset)
        end = start + et.duration
        if WORK_HOURS.get(day.weekday()) is None:
            continue  # выходной
        if start < LUNCH[1] and end > LUNCH[0] and day.weekday() <= 4:
            continue  # перерыв
        if datetime.combine(day, datetime.min.time()) + timedelta(minutes=end) <= current:
            continue  # уже в прошлом
        store.insert(
            BookingRecord(
                event_type_id=et_id,
                date=day,
                start=start,
                end=end,
                name=name,
                email=email,
                comment=comment,
            )
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    _seed()
    yield


# ---------------------------------------------------------------------------
# Приложение
# ---------------------------------------------------------------------------

app = FastAPI(
    title=SERVICE_NAME,
    description=(
        "Сервис онлайн-записи (упрощённый аналог Cal.com). "
        "Хранилище — в памяти: после перезапуска сервиса данные сбрасываются. "
        "Бизнес-правила (рабочие часы, перерыв, повторные записи) соблюдаются на сервере."
    ),
    version=__version__,
    lifespan=lifespan,
)

# API предназначен для отдельного фронтенд-клиента — разрешаем кросс-доменные запросы.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(BusinessError)
async def business_error_handler(_: Request, exc: BusinessError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/", tags=["Служебное"])
def root() -> dict[str, str]:
    return {
        "service": SERVICE_NAME,
        "version": __version__,
        "docs": "/docs",
        "api": "/api",
    }


# ---------------------------------------------------------------------------
# Маршруты /api
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api", tags=["Запись"])


@router.get("/meta", response_model=MetaOut)
def get_meta() -> MetaOut:
    """Метаданные сервиса: серверное время, рабочие часы, лимиты."""
    return MetaOut(
        service=SERVICE_NAME,
        version=__version__,
        now=datetime.now(),
        timezone=_time.tzname[0],
        max_booking_horizon_days=MAX_BOOKING_HORIZON_DAYS,
        work_hours={d: WorkHoursOut(start=s, end=e) for d, (s, e) in WORK_HOURS.items()},
        lunch=WorkHoursOut(start=LUNCH[0], end=LUNCH[1]),
    )


@router.get("/event-types", response_model=list[EventTypeOut])
def list_event_types() -> list[EventTypeOut]:
    """Форматы встреч с длительностью и шагом сетки."""
    return [
        EventTypeOut(
            id=et.id,
            title=et.title,
            duration=et.duration,
            grid_step=et.grid_step,
            desc=et.desc,
            color=et.color,
        )
        for et in EVENT_TYPES.values()
    ]


@router.get("/slots", response_model=DaySlotsOut)
def get_day_slots(
    date: date = Query(..., description="Дата в формате YYYY-MM-DD"),
    event_type_id: str = Query(..., description="Формат встречи"),
) -> DaySlotsOut:
    """Сетка слотов дня со статусами: free / booked / lunch / past."""
    et = event_type_or_404(event_type_id)
    return day_slots(date, et)


@router.get("/availability", response_model=list[DayAvailabilityOut])
def get_availability(
    event_type_id: str = Query(..., description="Формат встречи"),
    start: date = Query(..., description="Первый день диапазона"),
    days: int = Query(14, ge=1, le=60, description="Длина диапазона в днях"),
) -> list[DayAvailabilityOut]:
    """Свободные окна по дням — для недельной ленты календаря."""
    et = event_type_or_404(event_type_id)
    return availability(start, days, et)


@router.get("/bookings", response_model=list[BookingOut])
def list_bookings() -> list[BookingOut]:
    """Все записи, отсортированные по дате и времени."""
    return [record_to_out(b) for b in store.all()]


@router.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: str) -> BookingOut:
    """Запись по идентификатору."""
    record = store.get(booking_id)
    if record is None:
        raise BusinessError(404, f"Запись «{booking_id}» не найдена")
    return record_to_out(record)


@router.post("/bookings", response_model=BookingOut, status_code=201)
def book(payload: BookingCreate) -> BookingOut:
    """Создать запись на свободный слот.

    Сервер проверяет: формат, дату (не в прошлом и не дальше 60 дней),
    рабочий день, сетку слотов, рабочие часы, перерыв и отсутствие
    пересечений с существующими записями. Ошибки правил — 409 с пояснением.
    """
    record = create_booking(payload)
    return record_to_out(record)


@router.delete("/bookings/{booking_id}", status_code=204)
def cancel(booking_id: str) -> None:
    """Отменить запись; её окно снова становится свободным."""
    cancel_booking(booking_id)


app.include_router(router)
