"""Pydantic-модели, соответствующие contract/openapi.yaml.

Поля используют snake_case в Python-коде и camelCase-алиасы в JSON
(соответствуют схемам из контракта). `populate_by_name=True` позволяет
конструировать модели в коде по имени поля, а FastAPI по умолчанию
сериализует ответ по алиасу (camelCase).
"""

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SlotStatus(str, Enum):
    free = "free"
    booked = "booked"


class Slot(ApiModel):
    id: str
    start_at: datetime = Field(alias="startAt")
    end_at: datetime = Field(alias="endAt")
    status: SlotStatus


class AvailabilityDay(ApiModel):
    date: date
    has_free_slots: bool = Field(alias="hasFreeSlots")
    free_slots_count: int = Field(alias="freeSlotsCount", ge=0)
    total_slots_count: int = Field(alias="totalSlotsCount", ge=0)


class AvailabilityResponse(ApiModel):
    from_: date = Field(alias="from")
    to: date
    days: list[AvailabilityDay]


class SlotsResponse(ApiModel):
    date: date
    slots: list[Slot]


class AvailabilityInterval(ApiModel):
    id: str
    date: date
    start_time: str = Field(alias="startTime")
    end_time: str = Field(alias="endTime")


class CreateAvailabilityIntervalRequest(ApiModel):
    date: date
    start_time: str = Field(alias="startTime")
    end_time: str = Field(alias="endTime")


class CreateBookingRequest(ApiModel):
    slot_id: str = Field(alias="slotId")
    guest_name: str = Field(alias="guestName", min_length=1, max_length=200)
    guest_phone: str = Field(alias="guestPhone", min_length=3, max_length=32)


class Booking(ApiModel):
    id: str
    slot_id: str = Field(alias="slotId")
    guest_name: str = Field(alias="guestName")
    guest_phone: str = Field(alias="guestPhone")
    start_at: datetime = Field(alias="startAt")
    end_at: datetime = Field(alias="endAt")
    created_at: datetime = Field(alias="createdAt")


class ApiError(ApiModel):
    error: str
    message: str
