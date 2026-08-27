"""Скользящее окно записи: [now, now + BOOKING_WINDOW_DAYS дней].

Пересчитывается от текущего момента (`now`) на каждый запрос — отдельного
джоба для "продления" окна не требуется (см. AGENTS.md).
"""

from datetime import date, datetime, timedelta, timezone

BOOKING_WINDOW_DAYS = 14
SLOT_DURATION_MINUTES = 30


def now_utc() -> datetime:
    """Текущий момент в UTC. Единая точка входа, чтобы тесты могли мокать время."""
    return datetime.now(timezone.utc)


def get_window_end(now: datetime) -> datetime:
    """Конец окна записи (эксклюзивная точка отсечения) — now + 14 дней."""
    return now + timedelta(days=BOOKING_WINDOW_DAYS)


def get_window_end_date(now: datetime) -> date:
    return get_window_end(now).date()


def is_within_booking_window(moment: datetime, now: datetime) -> bool:
    """Слот/интервал попадает в окно записи, если начинается не раньше now
    и не позже now + 14 дней."""
    return now <= moment <= get_window_end(now)


def is_date_within_booking_window(day: date, now: datetime) -> bool:
    today = now.date()
    return today <= day <= get_window_end_date(now)
