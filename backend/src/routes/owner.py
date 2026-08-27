from fastapi import APIRouter, Depends

from src.domain.booking_window import now_utc
from src.schemas.models import AvailabilityInterval, CreateAvailabilityIntervalRequest
from src.store.slots_store import SlotsStore, get_store

router = APIRouter(tags=["owner"])


@router.get("/owner/availability", response_model=list[AvailabilityInterval])
async def list_owner_availability(
    store: SlotsStore = Depends(get_store),
) -> list[AvailabilityInterval]:
    return await store.list_owner_availability()


@router.post("/owner/availability", response_model=AvailabilityInterval, status_code=201)
async def create_owner_availability(
    payload: CreateAvailabilityIntervalRequest,
    store: SlotsStore = Depends(get_store),
) -> AvailabilityInterval:
    now = now_utc()
    return await store.create_owner_availability(
        day=payload.date,
        start_time_str=payload.start_time,
        end_time_str=payload.end_time,
        now=now,
    )
