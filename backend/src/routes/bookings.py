from fastapi import APIRouter, Depends

from src.domain.booking_window import now_utc
from src.schemas.models import Booking, CreateBookingRequest
from src.store.slots_store import SlotsStore, get_store

router = APIRouter(tags=["bookings"])


@router.post("/bookings", response_model=Booking, status_code=201)
async def create_booking(
    payload: CreateBookingRequest,
    store: SlotsStore = Depends(get_store),
) -> Booking:
    now = now_utc()
    return await store.create_booking(
        slot_id=payload.slot_id,
        guest_name=payload.guest_name,
        guest_phone=payload.guest_phone,
        now=now,
    )
