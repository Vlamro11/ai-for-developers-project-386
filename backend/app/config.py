"""Конфигурация сервиса: форматы встреч, рабочие часы, перерыв, горизонт бронирования."""

from dataclasses import dataclass


@dataclass(frozen=True)
class EventType:
    """Формат встречи: фиксированная длительность и шаг сетки слотов."""

    id: str
    title: str
    duration: int  # минуты
    desc: str
    color: str

    @property
    def grid_step(self) -> int:
        """Шаг сетки слотов: для коротких встреч — 15 минут, иначе — 30."""
        return 15 if self.duration == 15 else 30


EVENT_TYPES: dict[str, EventType] = {
    "intro": EventType(
        id="intro",
        title="Знакомство",
        duration=15,
        desc="Короткий видеозвонок: познакомимся, сверим ожидания и наметим план.",
        color="#1e5c48",
    ),
    "consult": EventType(
        id="consult",
        title="Консультация",
        duration=30,
        desc="Разбор конкретной задачи: вопросы, варианты решений, следующие шаги.",
        color="#2e66a7",
    ),
    "workshop": EventType(
        id="workshop",
        title="Воркшоп",
        duration=60,
        desc="Глубокая рабочая сессия: анализ, проработка и план действий на неделю.",
        color="#b97f2f",
    ),
}

# Рабочие часы по дням недели (weekday(): 0 = понедельник … 6 = воскресенье).
# Пн–Пт 9:00–18:00, Сб 10:00–15:00, Вс — выходной.
WORK_HOURS: dict[int, tuple[int, int]] = {
    0: (9 * 60, 18 * 60),
    1: (9 * 60, 18 * 60),
    2: (9 * 60, 18 * 60),
    3: (9 * 60, 18 * 60),
    4: (9 * 60, 18 * 60),
    5: (10 * 60, 15 * 60),
}

# Перерыв 13:00–14:00 по будням (Пн–Пт).
LUNCH: tuple[int, int] = (13 * 60, 14 * 60)
LUNCH_WEEKDAYS: frozenset[int] = frozenset({0, 1, 2, 3, 4})

# Бронировать можно не дальше, чем на 60 дней вперёд.
MAX_BOOKING_HORIZON_DAYS = 60

SERVICE_NAME = "ОКНА API"
