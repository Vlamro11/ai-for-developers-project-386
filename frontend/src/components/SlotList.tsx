import type { Slot } from "../api/client";

interface SlotListProps {
  slots: Slot[];
  selectedSlotId: string | undefined;
  onSelectSlot: (slot: Slot) => void;
  isLoading: boolean;
  hasDate: boolean;
}

function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)}–${fmt(end)}`;
}

/** Список слотов выбранного дня с индикацией free/booked. */
export function SlotList({ slots, selectedSlotId, onSelectSlot, isLoading, hasDate }: SlotListProps) {
  if (!hasDate) {
    return <p className="slot-list__hint">Выберите день в календаре, чтобы увидеть доступные слоты.</p>;
  }

  if (isLoading) {
    return <p className="slot-list__hint">Загрузка слотов…</p>;
  }

  if (slots.length === 0) {
    return <p className="slot-list__hint">На выбранный день нет доступных слотов.</p>;
  }

  return (
    <ul className="slot-list">
      {slots.map((slot) => {
        const isBooked = slot.status === "booked";
        const isSelected = slot.id === selectedSlotId;
        return (
          <li key={slot.id}>
            <button
              type="button"
              className={[
                "slot-list__item",
                isBooked ? "slot-list__item--booked" : "slot-list__item--free",
                isSelected ? "slot-list__item--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={isBooked}
              aria-pressed={isSelected}
              onClick={() => onSelectSlot(slot)}
            >
              <span>{formatTimeRange(slot.startAt, slot.endAt)}</span>
              <span className="slot-list__status">{isBooked ? "занято" : "свободно"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
