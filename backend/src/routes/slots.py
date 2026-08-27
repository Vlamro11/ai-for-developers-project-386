from datetime import date as date_type

from fastapi import APIRouter, Depends, Query

from src.domain.booking_window import now_utc
from src.schemas.models import SlotsResponse
from src.store.slots_store import SlotsStore, get_store

router = APIRouter(tags=["slots"])


@router.get("/slots", response_model=SlotsResponse)
async def get_slots(
    date: date_type = Query(...),
    store: SlotsStore = Depends(get_store),
) -> SlotsResponse:
    now = now_utc()
    slots = await store.list_slots_for_date(date, now)
    return SlotsResponse(date=date, slots=slots)
