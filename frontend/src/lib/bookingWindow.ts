import { addDays, formatISO } from "date-fns";

/** Длительность окна записи в днях (см. AGENTS.md — 14 дней от текущей даты). */
export const BOOKING_WINDOW_DAYS = 14;

/** Возвращает сегодняшнюю дату (UTC, без времени) как объект Date. */
export function getWindowStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Возвращает последний день окна записи (включительно). */
export function getWindowEnd(now: Date = new Date()): Date {
  return addDays(getWindowStart(now), BOOKING_WINDOW_DAYS);
}

/** Форматирует дату как YYYY-MM-DD для передачи в API. */
export function toApiDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}

/** Проверяет, что дата находится в пределах текущего окна записи. */
export function isWithinBookingWindow(date: Date, now: Date = new Date()): boolean {
  const start = getWindowStart(now);
  const end = getWindowEnd(now);
  return date >= start && date <= end;
}
