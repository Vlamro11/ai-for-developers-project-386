from datetime import timedelta

from src.domain.booking_window import BOOKING_WINDOW_DAYS, now_utc


def _tomorrow_iso() -> str:
    return (now_utc().date() + timedelta(days=1)).isoformat()


async def test_publish_interval_generates_30_minute_slots(client):
    resp = await client.post(
        "/owner/availability",
        json={"date": _tomorrow_iso(), "startTime": "09:00", "endTime": "10:00"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["startTime"] == "09:00"
    assert body["endTime"] == "10:00"

    slots_resp = await client.get("/slots", params={"date": _tomorrow_iso()})
    assert slots_resp.status_code == 200
    slots = slots_resp.json()["slots"]
    # 1 час / 30 минут = 2 слота
    assert len(slots) == 2
    assert all(s["status"] == "free" for s in slots)


async def test_overlapping_interval_is_rejected(client):
    day = _tomorrow_iso()
    first = await client.post(
        "/owner/availability", json={"date": day, "startTime": "09:00", "endTime": "11:00"}
    )
    assert first.status_code == 201

    overlapping = await client.post(
        "/owner/availability", json={"date": day, "startTime": "10:30", "endTime": "12:00"}
    )
    assert overlapping.status_code == 409
    assert overlapping.json()["error"] == "interval_overlaps"


async def test_interval_shorter_than_slot_is_rejected(client):
    resp = await client.post(
        "/owner/availability",
        json={"date": _tomorrow_iso(), "startTime": "09:00", "endTime": "09:15"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "validation_error"


async def test_interval_outside_booking_window_is_rejected(client):
    too_far = (now_utc().date() + timedelta(days=BOOKING_WINDOW_DAYS + 5)).isoformat()
    resp = await client.post(
        "/owner/availability", json={"date": too_far, "startTime": "09:00", "endTime": "10:00"}
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "validation_error"
