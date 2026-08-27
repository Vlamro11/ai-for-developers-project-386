import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.store import slots_store


@pytest.fixture(autouse=True)
def _reset_store():
    """Каждый тест начинает с чистого in-memory хранилища."""
    slots_store.reset_store()
    yield
    slots_store.reset_store()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api") as ac:
        yield ac
