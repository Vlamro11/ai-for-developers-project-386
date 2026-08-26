"""Бизнес-логика бронирования.

Все правила применяются на сервере, независимо от клиента:
— запись создаётся только на слот из сетки формата в рабочий день;
— слот вне рабочих часов, в перерыв или в прошлом отклоняется;
— на одно и то же время нельзя создать две записи (атомарная проверка
  пересечений под блокировкой хранилища);
— бронировать можно только на «свободный» слот из окна дня.
"""

from datetime import date, datetime, time, timedelta
from typing import Optional

from .config import (
    EVENT_TYPES,
    LUNCH,
    LUNCH_WEEKDAYS,
    MAX_BOOKING_HORIZON_DAYS,
    WORK_HOURS,
    EventType,
)
from .models import (
    BookingCreate,
    BookingOut,
    DayAvailabilityOut,
    DaySlotsOut,
    SlotOut,
    SlotStatus,
    WorkHoursOut,
)
from .store import BookingRecord, store


class BusinessError(Exception):
    """Нарушение бизнес-правила: status_code + человекочитаемый detail."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def now() -> datetime:
    """Текущее серверное время. Подменяется в тестах."""
    return datetime.now()


# ---------------------------------------------------------------------------
# Сетка слотов
# ---------------------------------------------------------------------------


def event_type_or_404(event_type_id: str) -> EventType:
    et = EVENT_TYPES.get(event_type_id)
    if et is None:
        known = ", ".join(sorted(EVENT_TYPES))
        raise BusinessError(404, f"Формат встречи «{event_type_id}» не найден. Доступны: {known}")
    return et


def work_hours(day: date) -> Optional[tuple[int, int]]:
    """Рабочие часы дня или None, если день выходной."""
    return WORK_HOURS.get(day.weekday())


def slot_starts(day: date, et: EventType) -> list[int]:
    """Начала всех слотов формата в этот день (минуты от полуночи)."""
    wh = work_hours(day)
    if wh is None:
        return []
    start, end = wh
    return list(range(start, end - et.duration + 1, et.grid_step))


def crosses_lunch(day: date, start: int, end: int) -> bool:
    return day.weekday() in LUNCH_WEEKDAYS and start < LUNCH[1] and end > LUNCH[0]


def slot_status(day: date, start: int, end: int) -> SlotStatus:
    """Статус слота: booked → lunch → past → free."""
    if store.find_overlap(day, start, end) is not None:
        return "booked"
    if crosses_lunch(day, start, end):
        return "lunch"
    end_dt = datetime.combine(day, time.min) + timedelta(minutes=end)
    if end_dt <= now():
        return "past"
    return "free"


# ---------------------------------------------------------------------------
# Чтение расписания
# ---------------------------------------------------------------------------


def record_to_out(record: BookingRecord) -> BookingOut:
    return BookingOut(
        id=record.id,
        event_type_id=record.event_type_id,
        date=record.date,
        start=record.start,
        end=record.end,
        name=record.name,
        email=record.email,
        comment=record.comment,
        created_at=record.created_at,
    )


def day_slots(day: date, et: EventType) -> DaySlotsOut:
    """Сетка слотов дня со статусами для выбранного формата."""
    wh = work_hours(day)
    slots: list[SlotOut] = []
    for start in slot_starts(day, et):
        end = start + et.duration
        status = slot_status(day, start, end)
        booking = store.find_overlap(day, start, end)
        slots.append(
            SlotOut(
                start=start,
                end=end,
                status=status,
                booking=record_to_out(booking) if booking is not None else None,
            )
        )
    return DaySlotsOut(
        date=day,
        event_type_id=et.id,
        duration=et.duration,
        work_hours=WorkHoursOut(start=wh[0], end=wh[1]) if wh else None,
        slots=slots,
    )


def availability(from_day: date, days: int, et: EventType) -> list[DayAvailabilityOut]:
    """Сводка «сколько свободных окон» по каждому дню диапазона."""
    out: list[DayAvailabilityOut] = []
    day = from_day
    for _ in range(days):
        wh = work_hours(day)
        free = 0
        if wh is not None:
            for start in slot_starts(day, et):
                if slot_status(day, start, start + et.duration) == "free":
                    free += 1
        out.append(DayAvailabilityOut(date=day, closed=wh is None, free=free))
        day += timedelta(days=1)
    return out


# ---------------------------------------------------------------------------
# Бронирование
# ---------------------------------------------------------------------------


def create_booking(payload: BookingCreate) -> BookingRecord:
    """Создать запись, применив все бизнес-правила.

    Критическая секция «проверить пересечения → занять слот» выполняется
    под блокировкой хранилища, поэтому конкурирующие запросы на одно и то
    же время не смогут создать две записи.
    """
    et = event_type_or_404(payload.event_type_id)
    day = payload.date
    start = payload.start
    end = start + et.duration

    # 1. Горизонт дат.
    today = now().date()
    if day < today:
        raise BusinessError(409, "Нельзя записаться на прошедший день")
    horizon = today + timedelta(days=MAX_BOOKING_HORIZON_DAYS)
    if day > horizon:
        raise BusinessError(
            409, f"Слишком далеко: бронирование открыто на {MAX_BOOKING_HORIZON_DAYS} дней вперёд"
        )

    # 2. Рабочий день и рабочие часы.
    wh = work_hours(day)
    if wh is None:
        raise BusinessError(409, "Этот день — выходной, записи не принимаются")
    if start % et.grid_step != 0:
        raise BusinessError(
            409, f"Время не совпадает с сеткой слотов: шаг {et.grid_step} минут"
        )
    if start not in slot_starts(day, et):
        raise BusinessError(409, "Слот вне рабочих часов этого дня")

    # 3. Перерыв.
    if crosses_lunch(day, start, end):
        raise BusinessError(409, "Слот пересекается с перерывом (13:00–14:00)")

    # 4. Слот не в прошлом.
    end_dt = datetime.combine(day, time.min) + timedelta(minutes=end)
    if end_dt <= now():
        raise BusinessError(409, "Слот уже в прошлом — выберите время позже")

    # 5. Атомарно: только свободный слот, без пересечений (правила 4 и 5 ТЗ).
    record = BookingRecord(
        event_type_id=et.id,
        date=day,
        start=start,
        end=end,
        name=payload.name.strip(),
        email=payload.email,
        comment=payload.comment.strip(),
    )
    with store.exclusive():
        conflict = store.find_overlap(day, start, end)
        if conflict is not None:
            raise BusinessError(409, "Слот уже занят: на это время есть запись")
        # Повторная проверка статуса внутри критической секции.
        status = slot_status(day, start, end)
        if status != "free":
            raise BusinessError(409, f"Слот недоступен для записи (статус: {status})")
        store.insert(record)
    return record


def cancel_booking(booking_id: str) -> BookingRecord:
    """Отменить запись — её окно снова становится свободным."""
    deleted = store.delete(booking_id)
    if deleted is None:
        raise BusinessError(404, f"Запись «{booking_id}» не найдена или уже отменена")
    return deleted
