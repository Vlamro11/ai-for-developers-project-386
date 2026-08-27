import asyncio
from datetime import timedelta

from src.domain.booking_window import now_utc


def _tomorrow_iso() -> str:
    return (now_utc().date() + timedelta(days=1)).isoformat()


async def test_only_one_concurrent_booking_succeeds(client):
    """При параллельных запросах на один и тот же слот успешным должен быть
    ровно один (`201`), остальные — `409 Conflict` (см. AGENTS.md, п.7)."""
    day = _tomorrow_iso()
    await client.post("/owner/availability", json={"date": day, "startTime": "09:00", "endTime": "09:30"})
    slots_resp = await client.get("/slots", params={"date": day})
    slot_id = slots_resp.json()["slots"][0]["id"]

    concurrent_requests = 20

    async def attempt_booking(n: int):
        return await client.post(
            "/bookings",
            json={"slotId": slot_id, "guestName": f"Guest {n}", "guestPhone": f"+7999000{n:04d}"},
        )

    responses = await asyncio.gather(*(attempt_booking(n) for n in range(concurrent_requests)))

    statuses = [r.status_code for r in responses]
    assert statuses.count(201) == 1
    assert statuses.count(409) == concurrent_requests - 1

    # Финальное состояние слота — забронирован, ровно одна бронь на слот.
    slots_resp_after = await client.get("/slots", params={"date": day})
    slot_after = slots_resp_after.json()["slots"][0]
    assert slot_after["status"] == "booked"
