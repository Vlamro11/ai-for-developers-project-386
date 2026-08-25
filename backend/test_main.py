from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_slots():
    response = client.get("/api/slots")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    print("✓ GET /api/slots returned slots count:", len(data))

def test_booking_conflict():
    slots = client.get("/api/slots").json()
    free_slot = next(s for s in slots if not s["isBooked"])
    
    # First booking
    res1 = client.post("/api/bookings", json={
        "slotId": free_slot["id"],
        "guestName": "Иван Тестов",
        "guestContact": "@ivan_test"
    })
    assert res1.status_code == 200
    assert res1.json()["isBooked"] == True
    print("✓ First booking succeeded for slot:", free_slot["id"])

    # Double booking attempt (should fail with 409 Conflict)
    res2 = client.post("/api/bookings", json={
        "slotId": free_slot["id"],
        "guestName": "Второй Гость",
        "guestContact": "@guest2"
    })
    assert res2.status_code == 409
    assert "уже забронирован" in res2.json()["detail"]
    print("✓ Double booking correctly rejected with 409 Conflict!")

def test_create_slot():
    res = client.post("/api/slots", json={
        "date": "2026-10-01",
        "startTime": "12:00"
    })
    assert res.status_code == 201
    assert res.json()["id"] == "slot-20261001-1200"
    print("✓ POST /api/slots created new slot successfully!")

if __name__ == "__main__":
    test_get_slots()
    test_booking_conflict()
    test_create_slot()
    print("All backend API unit tests passed successfully!")
