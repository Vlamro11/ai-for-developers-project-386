from datetime import timedelta

from src.domain.booking_window import now_utc


def _tomorrow_iso() -> str:
    return (now_utc().date() + timedelta(days=1)).isoformat()


async def test_slots_outside_booking_window_returns_empty_list(client):
    too_far = (now_utc().date() + timedelta(days=30)).isoformat()
    resp = await client.get("/slots", params={"date": too_far})
    assert resp.status_code == 200
    assert resp.json()["slots"] == []


async def test_availability_reports_day_with_free_slots(client):
    day = _tomorrow_iso()
    await client.post("/owner/availability", json={"date": day, "startTime": "09:00", "endTime": "10:00"})

    resp = await client.get("/availability", params={"from": day, "to": day})
    assert resp.status_code == 200
    days = resp.json()["days"]
    assert len(days) == 1
    assert days[0]["date"] == day
    assert days[0]["hasFreeSlots"] is True
    assert days[0]["freeSlotsCount"] == 2
    assert days[0]["totalSlotsCount"] == 2


async def test_availability_day_without_slots_has_no_free_slots(client):
    day = _tomorrow_iso()
    resp = await client.get("/availability", params={"from": day, "to": day})
    assert resp.status_code == 200
    days = resp.json()["days"]
    assert days[0]["hasFreeSlots"] is False
    assert days[0]["freeSlotsCount"] == 0
