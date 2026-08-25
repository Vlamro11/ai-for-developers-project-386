from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta, time
import dateutil.parser

app = FastAPI(title="Calls Booking API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models matching frontend API contract
class BookingInfo(BaseModel):
    guestName: str
    guestContact: str
    comment: Optional[str] = None
    bookedAt: str

class Slot(BaseModel):
    id: str
    startTime: str  # ISO string
    endTime: str    # ISO string
    isBooked: bool = False
    booking: Optional[BookingInfo] = None

class CreateSlotDto(BaseModel):
    date: str       # YYYY-MM-DD
    startTime: str  # HH:MM

class CreateBookingDto(BaseModel):
    slotId: str
    guestName: str
    guestContact: str
    comment: Optional[str] = None

# In-memory database
slots_db: List[Slot] = []

def generate_default_slots() -> List[Slot]:
    slots: List[Slot] = []
    now = datetime.now()
    today = now.date()

    for day_offset in range(14):
        current_day = today + timedelta(days=day_offset)
        # Working hours: 10:00 to 18:00
        for hour in range(10, 18):
            for minute in (0, 30):
                start_dt = datetime.combine(current_day, time(hour, minute))
                end_dt = start_dt + timedelta(minutes=30)
                slot_id = f"slot-{start_dt.strftime('%Y%m%d-%H%M')}"

                # Demo bookings for testing
                is_booked = (day_offset == 0 and hour == 11 and minute == 0) or \
                            (day_offset == 1 and hour == 14 and minute == 30)

                booking = None
                if is_booked:
                    booking = BookingInfo(
                        guestName="Алексей Смирнов" if minute == 0 else "Мария Иванова",
                        guestContact="@alex_smirnov" if minute == 0 else "maria@example.com",
                        comment="Обсуждение деталей проекта",
                        bookedAt=datetime.now().isoformat()
                    )

                slots.append(Slot(
                    id=slot_id,
                    startTime=start_dt.isoformat(),
                    endTime=end_dt.isoformat(),
                    isBooked=is_booked,
                    booking=booking
                ))
    return slots

# Initialize in-memory store
slots_db = generate_default_slots()

@app.get("/api/slots", response_model=List[Slot])
def get_slots():
    """Returns all available and booked slots for the 14-day window"""
    return slots_db

@app.post("/api/slots", response_model=Slot, status_code=status.HTTP_201_CREATED)
def create_slot(dto: CreateSlotDto):
    """Owner endpoint to create a new 30-minute booking slot"""
    try:
        date_obj = datetime.strptime(dto.date, "%Y-%m-%d").date()
        hour, minute = map(int, dto.startTime.split(":"))
        start_dt = datetime.combine(date_obj, time(hour, minute))
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты или времени")

    end_dt = start_dt + timedelta(minutes=30)
    slot_id = f"slot-{start_dt.strftime('%Y%m%d-%H%M')}"

    # Check for duplicate slot
    if any(s.id == slot_id for s in slots_db):
        raise HTTPException(status_code=400, detail="Слот на это время уже существует")

    new_slot = Slot(
        id=slot_id,
        startTime=start_dt.isoformat(),
        endTime=end_dt.isoformat(),
        isBooked=False
    )
    slots_db.append(new_slot)
    return new_slot

@app.get("/api/bookings", response_model=List[Slot])
def get_bookings():
    """Owner endpoint to get all booked slots"""
    return [s for s in slots_db if s.isBooked]

@app.post("/api/bookings", response_model=Slot)
def create_booking(dto: CreateBookingDto):
    """Guest endpoint to book an available slot (Double-booking prevention enforced)"""
    slot = next((s for s in slots_db if s.id == dto.slotId), None)
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")

    # Strict double booking check
    if slot.isBooked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот слот уже забронирован! Выберите другое время."
        )

    slot.isBooked = True
    slot.booking = BookingInfo(
        guestName=dto.guestName,
        guestContact=dto.guestContact,
        comment=dto.comment,
        bookedAt=datetime.now().isoformat()
    )
    return slot

@app.post("/api/reset")
def reset_db():
    """Reset in-memory storage to default state"""
    global slots_db
    slots_db = generate_default_slots()
    return {"message": "Данные успешно сброшены"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
