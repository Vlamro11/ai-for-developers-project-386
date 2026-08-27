from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.domain.errors import DomainError
from src.routes.availability import router as availability_router
from src.routes.bookings import router as bookings_router
from src.routes.owner import router as owner_router
from src.routes.slots import router as slots_router
from src.schemas.models import ApiError

app = FastAPI(
    title="Booking Calls API",
    description="API для приложения предварительной записи на телефонный разговор.",
    version="1.0.0",
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    body = ApiError(error=exc.code, message=exc.message)
    return JSONResponse(status_code=exc.status_code, content=body.model_dump(by_alias=True))


app.include_router(availability_router, prefix="/api")
app.include_router(slots_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
app.include_router(owner_router, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
