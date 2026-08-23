"""Общие фикстуры: чистое хранилище для каждого теста и HTTP-клиент."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store


@pytest.fixture(autouse=True)
def _clean_store():
    """Каждый тест стартует с пустым хранилищем."""
    store.clear()
    yield
    store.clear()


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
