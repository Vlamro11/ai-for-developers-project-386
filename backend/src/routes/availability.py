from datetime import date

from fastapi import APIRouter, Depends, Query

from src.domain.booking_window import now_utc
from src.schemas.models import AvailabilityResponse
from src.store.slots_store import SlotsStore, get_store

router = APIRouter(tags=["availability"])


@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None),
    store: SlotsStore = Depends(get_store),
) -> AvailabilityResponse:
    now = now_utc()
    effective_from, effective_to, days = await store.list_availability_days(from_, to, now)
    return AvailabilityResponse(from_=effective_from, to=effective_to, days=days)
