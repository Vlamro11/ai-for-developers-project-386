import { countFree, workHours, type EventType, type Booking } from '../lib/store';
import { WEEKDAYS_SHORT, addDays, dateKey as keyOf, mondayOf, parseKey, todayKey } from '../lib/time';

interface WeekStripProps {
  dateKey: string;
  onSelectDate: (key: string) => void;
  eventType: EventType;
  bookings: Booking[];
}

export default function WeekStrip({ dateKey, onSelectDate, eventType, bookings }: WeekStripProps) {
  const monday = mondayOf(parseKey(dateKey));
  const today = todayKey();

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {Array.from({ length: 7 }, (_, i) => {
        const k = keyOf(addDays(monday, i));
        const d = parseKey(k);
        const selected = k === dateKey;
        const isToday = k === today;
        const closed = workHours(k) === null;
        const free = closed ? 0 : countFree(k, eventType, bookings);

        return (
          <button
            key={k}
            onClick={() => onSelectDate(k)}
            className={`group relative rounded-xl border px-1 py-2 text-center transition-all duration-200 active:scale-95 sm:py-2.5 ${
              selected
                ? 'border-pine-deep bg-pine-deep text-paper shadow-[0_10px_24px_rgba(14,43,33,0.28)]'
                : 'border-line bg-card hover:-translate-y-0.5 hover:border-pine/50 hover:shadow-[0_8px_18px_rgba(23,37,30,0.09)]'
            }`}
          >
            <span
              className={`flex items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-wider sm:text-[10px] ${
                selected ? 'text-lime' : 'text-faint'
              }`}
            >
              {WEEKDAYS_SHORT[i]}
              {isToday && <span className="pulse-live h-1.5 w-1.5 rounded-full bg-lime" />}
            </span>
            <span
              className={`tabular mt-0.5 block font-display text-base font-bold leading-tight sm:text-xl ${
                selected ? 'text-paper' : isToday ? 'text-pine' : 'text-ink'
              }`}
            >
              {d.getDate()}
            </span>
            <span
              className={`tabular mt-0.5 block font-mono text-[9px] sm:text-[10px] ${
                selected
                  ? 'text-paper/60'
                  : closed
                    ? 'text-ochre'
                    : free === 0
                      ? 'text-rust'
                      : 'text-pine'
              }`}
            >
              {closed ? 'вых.' : `${free} своб.`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
