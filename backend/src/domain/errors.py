"""Доменные исключения бизнес-правил бронирования.

Транслируются в HTTP-ответы в слое routes (см. src/routes).
"""


class DomainError(Exception):
    """Базовый класс для всех доменных ошибок."""

    code = "domain_error"
    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ValidationError(DomainError):
    """Некорректные входные данные (400)."""

    code = "validation_error"
    status_code = 400


class SlotNotFoundError(DomainError):
    """Слот с указанным id не существует (404)."""

    code = "slot_not_found"
    status_code = 404


class SlotConflictError(DomainError):
    """Слот уже забронирован либо вышел за пределы окна записи (409)."""

    code = "slot_already_booked"
    status_code = 409


class IntervalConflictError(DomainError):
    """Публикуемый интервал пересекается с уже опубликованным (409)."""

    code = "interval_overlaps"
    status_code = 409
