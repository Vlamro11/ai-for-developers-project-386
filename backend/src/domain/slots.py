"""Нарезка опубликованного интервала доступности на 30-минутные слоты."""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from src.domain.booking_window import SLOT_DURATION_MINUTES
from src.domain.errors import ValidationError

TIME_RE_HINT = "HH:MM"


@dataclass(frozen=True)
class SlotDraft:
    id: str
    start_at: datetime
    end_at: datetime


def parse_time_str(value: str) -> time:
    try:
        hours_str, minutes_str = value.split(":")
        return time(hour=int(hours_str), minute=int(minutes_str))
    except (ValueError, TypeError) as exc:
        raise ValidationError(f"Некорректный формат времени, ожидается {TIME_RE_HINT}") from exc


def slot_id_for(day: date, start_at: datetime) -> str:
    return f"slot_{day:%Y%m%d}_{start_at:%H%M}"


def generate_slots_for_interval(day: date, start_time: time, end_time: time) -> list[SlotDraft]:
    """Нарезает интервал [start_time, end_time) дня `day` на слоты по 30 минут.

    Отбрасывает "хвост", который короче 30 минут (не создаёт неполный слот).
    Валидирует, что интервал не пустой/не перевёрнутый и содержит хотя бы один слот.
    """
    start_dt = datetime.combine(day, start_time, tzinfo=timezone.utc)
    end_dt = datetime.combine(day, end_time, tzinfo=timezone.utc)

    if end_dt <= start_dt:
        raise ValidationError("Время окончания интервала должно быть позже времени начала")

    slots: list[SlotDraft] = []
    current = start_dt
    step = timedelta(minutes=SLOT_DURATION_MINUTES)
    while current + step <= end_dt:
        slots.append(SlotDraft(id=slot_id_for(day, current), start_at=current, end_at=current + step))
        current += step

    if not slots:
        raise ValidationError(
            f"Интервал слишком короткий: минимальная длительность — {SLOT_DURATION_MINUTES} минут"
        )

    return slots
