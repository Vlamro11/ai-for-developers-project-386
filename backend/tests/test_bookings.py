from datetime import timedelta

from src.domain.booking_window import now_utc


def _tomorrow_iso() -> str:
    return (now_utc().date() + timedelta(days=1)).isoformat()


async def _publish_and_get_slot_id(client) -> str:
    day = _tomorrow_iso()
    await client.post("/owner/availability", json={"date": day, "startTime": "09:00", "endTime": "09:30"})
    slots_resp = await client.get("/slots", params={"date": day})
    return slots_resp.json()["slots"][0]["id"]


async def test_booking_free_slot_succeeds(client):
    slot_id = await _publish_and_get_slot_id(client)

    resp = await client.post(
        "/bookings", json={"slotId": slot_id, "guestName": "Иван", "guestPhone": "+79990001122"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["slotId"] == slot_id
    assert body["guestName"] == "Иван"

    day = _tomorrow_iso()
    slots_resp = await client.get("/slots", params={"date": day})
    slot = next(s for s in slots_resp.json()["slots"] if s["id"] == slot_id)
    assert slot["status"] == "booked"


async def test_booking_already_booked_slot_is_blocked(client):
    slot_id = await _publish_and_get_slot_id(client)

    first = await client.post(
        "/bookings", json={"slotId": slot_id, "guestName": "Иван", "guestPhone": "+79990001122"}
    )
    assert first.status_code == 201

    second = await client.post(
        "/bookings", json={"slotId": slot_id, "guestName": "Пётр", "guestPhone": "+79990003344"}
    )
    assert second.status_code == 409
    assert second.json()["error"] == "slot_already_booked"

    # Слот остаётся забронированным первым гостем, новая запись не создаётся.
    day = _tomorrow_iso()
    slots_resp = await client.get("/slots", params={"date": day})
    slot = next(s for s in slots_resp.json()["slots"] if s["id"] == slot_id)
    assert slot["status"] == "booked"


async def test_booking_nonexistent_slot_returns_404(client):
    resp = await client.post(
        "/bookings", json={"slotId": "slot_does_not_exist", "guestName": "Иван", "guestPhone": "+7999"}
    )
    assert resp.status_code == 404
    assert resp.json()["error"] == "slot_not_found"


async def test_booking_invalid_payload_returns_422(client):
    slot_id = await _publish_and_get_slot_id(client)
    # guestPhone короче минимальной длины (3) — Pydantic-валидация -> 422.
    resp = await client.post("/bookings", json={"slotId": slot_id, "guestName": "Иван", "guestPhone": "1"})
    assert resp.status_code == 422
