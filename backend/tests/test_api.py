"""Тесты бизнес-правил бронирования.

Правила из ТЗ:
— на одно и то же время нельзя создать две записи;
— запись создаётся только на свободный слот из сетки окна дня.
Плюс: рабочие часы, перерыв, прошедшее время, горизонт, валидация, отмена.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store


# ---------------------------------------------------------------------------
# Помощники
# ---------------------------------------------------------------------------


def future_weekday(after_days: int = 1) -> date:
    """Ближайший будний день (Пн–Пт), начиная с tomorrow + after_days-1."""
    d = date.today() + timedelta(days=after_days)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d


def next_day_with_weekday(weekday: int) -> date:
    """Ближайший день с нужным weekday() (0=Пн … 6=Вс), не раньше завтра."""
    d = date.today() + timedelta(days=1)
    while d.weekday() != weekday:
        d += timedelta(days=1)
    return d


def first_free_slot(client: TestClient, day: date, et_id: str = "consult") -> dict:
    r = client.get("/api/slots", params={"date": day.isoformat(), "event_type_id": et_id})
    assert r.status_code == 200, r.text
    slots = [s for s in r.json()["slots"] if s["status"] == "free"]
    assert slots, "ожидался хотя бы один свободный слот"
    return slots[0]


def book(client: TestClient, day: date, start: int, et_id: str = "consult", **kwargs) -> dict:
    payload = {
        "event_type_id": et_id,
        "date": day.isoformat(),
        "start": start,
        "name": kwargs.get("name", "Тест Тестов"),
        "email": kwargs.get("email", "test@example.ru"),
        "comment": kwargs.get("comment", ""),
    }
    return {"payload": payload, "response": client.post("/api/bookings", json=payload)}


# ---------------------------------------------------------------------------
# Служебные маршруты
# ---------------------------------------------------------------------------


def test_meta(client: TestClient):
    r = client.get("/api/meta")
    assert r.status_code == 200
    data = r.json()
    assert data["max_booking_horizon_days"] == 60
    assert data["work_hours"]["0"] == {"start": 540, "end": 1080}
    assert data["lunch"] == {"start": 780, "end": 840}


def test_event_types(client: TestClient):
    r = client.get("/api/event-types")
    assert r.status_code == 200
    ids = {e["id"] for e in r.json()}
    assert ids == {"intro", "consult", "workshop"}
    intro = next(e for e in r.json() if e["id"] == "intro")
    assert intro["duration"] == 15 and intro["grid_step"] == 15


def test_unknown_event_type(client: TestClient):
    r = client.get("/api/slots", params={"date": future_weekday().isoformat(), "event_type_id": "nope"})
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Сетка слотов и статусы
# ---------------------------------------------------------------------------


def test_sunday_closed(client: TestClient):
    sunday = next_day_with_weekday(6)
    r = client.get("/api/slots", params={"date": sunday.isoformat(), "event_type_id": "consult"})
    assert r.status_code == 200
    body = r.json()
    assert body["work_hours"] is None
    assert body["slots"] == []


def test_saturday_short_day_no_lunch(client: TestClient):
    saturday = next_day_with_weekday(5)
    r = client.get("/api/slots", params={"date": saturday.isoformat(), "event_type_id": "consult"})
    body = r.json()
    assert body["work_hours"] == {"start": 600, "end": 900}
    assert all(s["status"] == "free" for s in body["slots"])
    assert body["slots"][0]["start"] == 600
    assert body["slots"][-1]["end"] == 900


def test_weekday_grid_and_lunch_status(client: TestClient):
    day = future_weekday()
    r = client.get("/api/slots", params={"date": day.isoformat(), "event_type_id": "consult"})
    body = r.json()
    starts = [s["start"] for s in body["slots"]]
    # 30-минутная сетка 9:00–18:00
    assert starts == list(range(540, 1080 - 30 + 1, 30))
    by_start = {s["start"]: s for s in body["slots"]}
    # 12:30–13:00 заканчивается ровно в начале перерыва — ещё не перерыв
    assert by_start[750]["status"] == "free"
    # 13:00–13:30 и 13:30–14:00 — перерыв
    assert by_start[780]["status"] == "lunch"
    assert by_start[810]["status"] == "lunch"
    # 14:00–14:30 снова свободно
    assert by_start[840]["status"] == "free"


# ---------------------------------------------------------------------------
# Создание записи: правила ТЗ
# ---------------------------------------------------------------------------


def test_booking_happy_path(client: TestClient):
    day = future_weekday()
    slot = first_free_slot(client, day)
    result = book(client, day, slot["start"], name="Анна Крылова", email="anna@example.ru")
    r = result["response"]
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["start"] == slot["start"]
    assert created["end"] == slot["start"] + 30
    assert created["name"] == "Анна Крылова"
    assert created["id"]

    # Слот стал занятым и отдаёт запись
    r = client.get("/api/slots", params={"date": day.isoformat(), "event_type_id": "consult"})
    target = next(s for s in r.json()["slots"] if s["start"] == slot["start"])
    assert target["status"] == "booked"
    assert target["booking"]["id"] == created["id"]


def test_double_booking_rejected(client: TestClient):
    """Правило: на одно и то же время нельзя создать две записи."""
    day = future_weekday()
    slot = first_free_slot(client, day)
    first = book(client, day, slot["start"], name="Первый Гость")
    assert first["response"].status_code == 201

    second = book(client, day, slot["start"], name="Второй Гость", email="second@example.ru")
    assert second["response"].status_code == 409
    assert "занят" in second["response"].json()["detail"]

    # Частичное пересечение: «Знакомство» 15 мин занимает 10:00–10:15,
    # часовой «Воркшоп» в 9:30–10:30 пересекает его — отклоняется
    intro = book(client, day, 10 * 60, et_id="intro", name="Короткий Гость")
    assert intro["response"].status_code == 201
    overlapping = book(client, day, 9 * 60 + 30, et_id="workshop", name="Длинный Гость")
    assert overlapping["response"].status_code == 409
    assert "занят" in overlapping["response"].json()["detail"]

    assert store.count() == 2


def test_concurrent_booking_only_one_wins(client: TestClient):
    """Гонка: N параллельных заявок на одно время — запись ровно одна."""
    day = future_weekday()
    slot = first_free_slot(client, day)
    payload = {
        "event_type_id": "consult",
        "date": day.isoformat(),
        "start": slot["start"],
        "name": "Гость",
        "email": "guest@example.ru",
        "comment": "",
    }

    def fire(i: int) -> int:
        # Каждый поток работает со своим клиентом (свой портал/событийный цикл)
        with TestClient(app) as c:
            resp = c.post(
                "/api/bookings",
                json={**payload, "name": f"Гость {i}", "email": f"g{i}@example.ru"},
            )
            return resp.status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(fire, range(8)))

    assert codes.count(201) == 1
    assert codes.count(409) == 7
    assert store.count() == 1


def test_only_free_slot_from_window(client: TestClient):
    """Правило: запись — только на свободный слот из сетки окна дня."""
    day = future_weekday()

    # Слот в перерыве (13:00–13:30) — не «свободный», запись отклоняется
    r = book(client, day, 780)["response"]
    assert r.status_code == 409 and "перерыв" in r.json()["detail"]

    # Начало не по сетке формата
    r = book(client, day, 547)["response"]
    assert r.status_code == 409 and "сетк" in r.json()["detail"]

    # Выровнено по шагу, но вне рабочих часов (8:30)
    r = book(client, day, 510)["response"]
    assert r.status_code == 409

    # Конец слота за пределами рабочего дня (17:45 + 30 мин)
    r = book(client, day, 1065)["response"]
    assert r.status_code == 409

    # Выходной день
    sunday = next_day_with_weekday(6)
    r = book(client, sunday, 600)["response"]
    assert r.status_code == 409 and "выходной" in r.json()["detail"]

    assert store.count() == 0


def test_past_slot_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    """Слот, который уже закончился, занять нельзя."""
    from app import service

    day = future_weekday()
    # «Сейчас» — 17:30 того же дня: слот 17:00–17:30 уже в прошлом
    fixed_now = datetime.combine(day, datetime.min.time()) + timedelta(hours=17, minutes=30)
    monkeypatch.setattr(service, "now", lambda: fixed_now)

    r = book(client, day, 17 * 60)["response"]
    assert r.status_code == 409 and "прошлом" in r.json()["detail"]

    # Следующий слот 17:30–18:00 ещё доступен
    r = book(client, day, 17 * 60 + 30)["response"]
    assert r.status_code == 201, r.text


def test_past_day_rejected(client: TestClient):
    yesterday = date.today() - timedelta(days=1)
    r = book(client, yesterday, 600)["response"]
    assert r.status_code == 409 and "прошедший" in r.json()["detail"]


def test_horizon_rejected(client: TestClient):
    far = date.today() + timedelta(days=61)
    r = book(client, far, 600)["response"]
    assert r.status_code == 409 and "60" in r.json()["detail"]


# ---------------------------------------------------------------------------
# Отмена записи
# ---------------------------------------------------------------------------


def test_cancel_releases_slot(client: TestClient):
    day = future_weekday()
    slot = first_free_slot(client, day)
    created = book(client, day, slot["start"])["response"].json()

    r = client.delete(f"/api/bookings/{created['id']}")
    assert r.status_code == 204
    assert store.count() == 0

    # Окно снова свободное — можно записаться повторно
    again = book(client, day, slot["start"], name="Повторная Запись")
    assert again["response"].status_code == 201

    # Повторная отмена той же записи — 404
    r = client.delete(f"/api/bookings/{created['id']}")
    assert r.status_code == 404

    r = client.get(f"/api/bookings/{created['id']}")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Валидация входных данных (422 от Pydantic)
# ---------------------------------------------------------------------------


def test_payload_validation(client: TestClient):
    day = future_weekday()

    bad_email = book(client, day, 600, email="не-почта")
    assert bad_email["response"].status_code == 422

    short_name = book(client, day, 600, name="А")
    assert short_name["response"].status_code == 422

    no_name = {
        "event_type_id": "consult",
        "date": day.isoformat(),
        "start": 600,
        "email": "x@example.ru",
    }
    assert client.post("/api/bookings", json=no_name).status_code == 422


# ---------------------------------------------------------------------------
# Сводные маршруты
# ---------------------------------------------------------------------------


def test_availability(client: TestClient):
    start = date.today() + timedelta(days=1)
    r = client.get(
        "/api/availability",
        params={"event_type_id": "consult", "start": start.isoformat(), "days": 7},
    )
    assert r.status_code == 200
    days = r.json()
    assert len(days) == 7
    for d in days:
        weekday = date.fromisoformat(d["date"]).weekday()
        assert d["closed"] == (weekday == 6)
        if weekday == 6:
            assert d["free"] == 0


def test_bookings_sorted(client: TestClient):
    day = future_weekday()
    slots_r = client.get(
        "/api/slots", params={"date": day.isoformat(), "event_type_id": "consult"}
    ).json()["slots"]
    free = [s for s in slots_r if s["status"] == "free"]
    book(client, day, free[1]["start"])
    book(client, day, free[0]["start"])

    r = client.get("/api/bookings")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2
    assert items[0]["start"] <= items[1]["start"]
