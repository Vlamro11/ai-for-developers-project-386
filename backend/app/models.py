"""Pydantic-схемы запросов и ответов API."""

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

SlotStatus = Literal["free", "booked", "lunch", "past"]


class EventTypeOut(BaseModel):
    id: str
    title: str
    duration: int
    grid_step: int
    desc: str
    color: str


class BookingCreate(BaseModel):
    """Тело запроса на создание записи.

    `start` — минуты от полуночи, строго соответствует свободному слоту
    сетки выбранного формата (проверяется на сервере).
    """

    event_type_id: str = Field(..., description="Идентификатор формата встречи")
    date: date = Field(..., description="Дата в формате ISO (YYYY-MM-DD)")
    start: int = Field(..., ge=0, lt=24 * 60, description="Начало слота, минуты от полуночи")
    name: str = Field(..., min_length=2, max_length=80, description="Имя гостя")
    email: EmailStr = Field(..., description="Почта для подтверждения")
    comment: str = Field(default="", max_length=500, description="Комментарий к записи")


class BookingOut(BaseModel):
    id: str
    event_type_id: str
    date: date
    start: int
    end: int
    name: str
    email: str
    comment: str
    created_at: datetime


class WorkHoursOut(BaseModel):
    start: int
    end: int


class SlotOut(BaseModel):
    start: int
    end: int
    status: SlotStatus
    booking: Optional[BookingOut] = None


class DaySlotsOut(BaseModel):
    """Расписание дня: сетка слотов выбранного формата со статусами."""

    date: date
    event_type_id: str
    duration: int
    work_hours: Optional[WorkHoursOut] = None
    slots: list[SlotOut]


class DayAvailabilityOut(BaseModel):
    """Сводка по дню для ленты календаря."""

    date: date
    closed: bool
    free: int


class MetaOut(BaseModel):
    """Метаданные сервиса: время сервера, правила, настройки."""

    service: str
    version: str
    now: datetime
    timezone: str
    max_booking_horizon_days: int
    work_hours: dict[int, WorkHoursOut]
    lunch: WorkHoursOut
