import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type { AvailabilityDay } from "../api/client";
import { getWindowEnd, getWindowStart, toApiDate } from "../lib/bookingWindow";

interface BookingCalendarProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  availabilityDays: AvailabilityDay[];
  isLoading: boolean;
}

/**
 * Календарь выбора дня записи. Ограничен окном записи [now, now + 14 дней].
 * Дни с хотя бы одним свободным слотом подсвечиваются модификатором `hasFreeSlots`.
 */
export function BookingCalendar({
  selectedDate,
  onSelectDate,
  availabilityDays,
  isLoading,
}: BookingCalendarProps) {
  const windowStart = getWindowStart();
  const windowEnd = getWindowEnd();

  const freeDates = availabilityDays
    .filter((day) => day.hasFreeSlots)
    .map((day) => new Date(`${day.date}T00:00:00Z`));

  return (
    <div className="booking-calendar">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        disabled={[{ before: windowStart }, { after: windowEnd }]}
        modifiers={{ hasFreeSlots: freeDates }}
        modifiersClassNames={{ hasFreeSlots: "day-has-free-slots" }}
        defaultMonth={selectedDate ?? windowStart}
        formatters={{
          formatCaption: (date) => date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
        }}
      />
      {isLoading && <p className="booking-calendar__hint">Загрузка доступности…</p>}
      <p className="booking-calendar__legend">
        <span className="legend-dot legend-dot--free" /> есть свободные слоты
      </p>
      <p className="booking-calendar__note">
        Записаться можно на любой день в пределах {toApiDate(windowStart)}–{toApiDate(windowEnd)}.
      </p>
    </div>
  );
}
