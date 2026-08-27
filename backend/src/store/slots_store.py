"""In-memory хранилище доступности/слотов/бронирований.

Данные живут только в памяти процесса backend (без БД). Бронирование —
атомарная операция: проверка `status == free` и запись нового статуса
выполняются под общим `asyncio.Lock`, чтобы при параллельных запросах на
один и тот же слот ровно один запрос получал успех (см. AGENTS.md).
"""

import asyncio
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from itertools import count

from src.domain.booking_window import (
    get_window_end,
    get_window_end_date,
    is_date_within_booking_window,
    is_within_booking_window,
)
from src.domain.errors import IntervalConflictError, SlotConflictError, SlotNotFoundError, ValidationError
from src.domain.slots import generate_slots_for_interval, parse_time_str
from src.schemas.models import AvailabilityDay, AvailabilityInterval, Booking, Slot, SlotStatus


@dataclass
class _SlotRecord:
    id: str
    interval_id: str
    day: date
    start_at: datetime
    end_at: datetime
    status: SlotStatus


@dataclass
class _IntervalRecord:
    id: str
    day: date
    start_time: time
    end_time: time


@dataclass
class _BookingRecord:
    id: str
    slot_id: str
    guest_name: str
    guest_phone: str
    start_at: datetime
    end_at: datetime
    created_at: datetime


def _time_ranges_overlap(a_start: time, a_end: time, b_start: time, b_end: time) -> bool:
    return a_start < b_end and b_start < a_end


class SlotsStore:
    """Синглтон-хранилище состояния приложения (см. get_store())."""

    def __init__(self) -> None:
        self._intervals: dict[str, _IntervalRecord] = {}
        self._slots: dict[str, _SlotRecord] = {}
        self._bookings: dict[str, _BookingRecord] = {}
        self._lock = asyncio.Lock()
        self._interval_seq = count(1)
        self._booking_seq = count(1)

    # ------------------------------------------------------------------ #
    # Availability (агрегация по дням для календаря)
    # ------------------------------------------------------------------ #
    async def list_availability_days(
        self, from_date: date | None, to_date: date | None, now: datetime
    ) -> tuple[date, date, list[AvailabilityDay]]:
        today = now.date()
        window_end_date = get_window_end_date(now)

        effective_from = from_date or today
        effective_to = to_date or window_end_date

        if effective_from > effective_to:
            raise ValidationError("Параметр `from` не может быть позже `to`")

        # Диапазон всегда обрезается по границам текущего окна записи.
        effective_from = max(effective_from, today)
        effective_to = min(effective_to, window_end_date)

        days: list[AvailabilityDay] = []
        if effective_from <= effective_to:
            current = effective_from
            while current <= effective_to:
                slots_of_day = [s for s in self._slots.values() if s.day == current]
                visible = [s for s in slots_of_day if is_within_booking_window(s.start_at, now)]
                free_count = sum(1 for s in visible if s.status == SlotStatus.free)
                days.append(
                    AvailabilityDay(
                        date=current,
                        has_free_slots=free_count > 0,
                        free_slots_count=free_count,
                        total_slots_count=len(visible),
                    )
                )
                current += timedelta(days=1)

        return effective_from, effective_to, days

    # ------------------------------------------------------------------ #
    # Slots (список слотов конкретного дня)
    # ------------------------------------------------------------------ #
    async def list_slots_for_date(self, day: date, now: datetime) -> list[Slot]:
        if not is_date_within_booking_window(day, now):
            return []

        records = [
            s for s in self._slots.values() if s.day == day and is_within_booking_window(s.start_at, now)
        ]
        records.sort(key=lambda s: s.start_at)
        return [Slot(id=r.id, start_at=r.start_at, end_at=r.end_at, status=r.status) for r in records]

    # ------------------------------------------------------------------ #
    # Bookings
    # ------------------------------------------------------------------ #
    async def create_booking(self, slot_id: str, guest_name: str, guest_phone: str, now: datetime) -> Booking:
        async with self._lock:
            slot = self._slots.get(slot_id)
            if slot is None:
                raise SlotNotFoundError(f"Слот {slot_id} не найден")

            if slot.status != SlotStatus.free or not is_within_booking_window(slot.start_at, now):
                raise SlotConflictError("Слот уже забронирован или вне окна записи")

            # Атомарная фиксация: проверка и запись статуса — внутри одной секции лока.
            slot.status = SlotStatus.booked

            booking_id = f"booking_{next(self._booking_seq)}"
            record = _BookingRecord(
                id=booking_id,
                slot_id=slot.id,
                guest_name=guest_name,
                guest_phone=guest_phone,
                start_at=slot.start_at,
                end_at=slot.end_at,
                created_at=now,
            )
            self._bookings[booking_id] = record

            return Booking(
                id=record.id,
                slot_id=record.slot_id,
                guest_name=record.guest_name,
                guest_phone=record.guest_phone,
                start_at=record.start_at,
                end_at=record.end_at,
                created_at=record.created_at,
            )

    # ------------------------------------------------------------------ #
    # Owner availability (публикация рабочих интервалов)
    # ------------------------------------------------------------------ #
    async def list_owner_availability(self) -> list[AvailabilityInterval]:
        records = sorted(self._intervals.values(), key=lambda i: (i.day, i.start_time))
        return [
            AvailabilityInterval(
                id=r.id, date=r.day, start_time=r.start_time.strftime("%H:%M"), end_time=r.end_time.strftime("%H:%M")
            )
            for r in records
        ]

    async def create_owner_availability(
        self, day: date, start_time_str: str, end_time_str: str, now: datetime
    ) -> AvailabilityInterval:
        start_time = parse_time_str(start_time_str)
        end_time = parse_time_str(end_time_str)

        if not is_date_within_booking_window(day, now):
            raise ValidationError("Дата интервала должна быть в пределах окна записи (now .. now + 14 дней)")

        # Нарезаем слоты заранее — если интервал невалиден (перевёрнут/слишком короткий),
        # получим ValidationError ещё до захвата лока.
        drafts = generate_slots_for_interval(day, start_time, end_time)

        async with self._lock:
            for existing in self._intervals.values():
                if existing.day == day and _time_ranges_overlap(
                    existing.start_time, existing.end_time, start_time, end_time
                ):
                    raise IntervalConflictError("Интервал пересекается с уже опубликованным")

            interval_id = f"avail_{day:%Y%m%d}_{start_time:%H%M}_{end_time:%H%M}"
            self._intervals[interval_id] = _IntervalRecord(
                id=interval_id, day=day, start_time=start_time, end_time=end_time
            )

            for draft in drafts:
                self._slots[draft.id] = _SlotRecord(
                    id=draft.id,
                    interval_id=interval_id,
                    day=day,
                    start_at=draft.start_at,
                    end_at=draft.end_at,
                    status=SlotStatus.free,
                )

            return AvailabilityInterval(
                id=interval_id, date=day, start_time=start_time_str, end_time=end_time_str
            )


_store: SlotsStore | None = None


def get_store() -> SlotsStore:
    """FastAPI dependency: возвращает синглтон-хранилище на процесс."""
    global _store
    if _store is None:
        _store = SlotsStore()
    return _store


def reset_store() -> None:
    """Используется в тестах для сброса состояния между тест-кейсами."""
    global _store
    _store = SlotsStore()
