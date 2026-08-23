"""Хранилище записей в памяти.

База данных не используется: после перезапуска сервиса данные сбрасываются.
Все мутации выполняются под блокировкой, поэтому «проверить и занять»
атомарно — две параллельные заявки на одно время не смогут обе пройти.
"""

import threading
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Iterator, Optional


@dataclass
class BookingRecord:
    """Запись на встречу (внутреннее представление)."""

    event_type_id: str
    date: date
    start: int  # минуты от полуночи
    end: int
    name: str
    email: str
    comment: str = ""
    id: str = field(default_factory=lambda: f"bk_{uuid.uuid4().hex[:12]}")
    created_at: datetime = field(default_factory=datetime.now)


class MemoryBookingStore:
    """Потокобезопасное in-memory хранилище записей."""

    def __init__(self) -> None:
        self._items: dict[str, BookingRecord] = {}
        self._lock = threading.Lock()

    # ---------- чтение ----------

    def all(self) -> list[BookingRecord]:
        """Все записи, отсортированные по дате и времени начала."""
        with self._lock:
            items = list(self._items.values())
        items.sort(key=lambda b: (b.date, b.start, b.created_at))
        return items

    def count(self) -> int:
        with self._lock:
            return len(self._items)

    def get(self, booking_id: str) -> Optional[BookingRecord]:
        with self._lock:
            return self._items.get(booking_id)

    def find_overlap(
        self, day: date, start: int, end: int, exclude_id: Optional[str] = None
    ) -> Optional[BookingRecord]:
        """Первая запись дня, пересекающаяся с интервалом [start, end)."""
        with self._lock:
            for b in self._items.values():
                if b.id == exclude_id or b.date != day:
                    continue
                if b.start < end and start < b.end:
                    return b
        return None

    # ---------- запись (только под exclusive()) ----------

    def insert(self, record: BookingRecord) -> None:
        self._items[record.id] = record

    def delete(self, booking_id: str) -> Optional[BookingRecord]:
        with self._lock:
            return self._items.pop(booking_id, None)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()

    @contextmanager
    def exclusive(self) -> Iterator[None]:
        """Эксклюзивный доступ для критической секции «проверить и занять»."""
        with self._lock:
            yield


# Единственный экземпляр хранилища на процесс.
store = MemoryBookingStore()
