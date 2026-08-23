import {
  LUNCH,
  busyIntervals,
  getDayPlan,
  getEventType,
  maskName,
  nextAvailable,
  useBookings,
  workHours,
  type Booking,
  type EventType,
  type Slot,
} from '../lib/store';
import {
  MONTHS,
  WEEKDAYS_FULL,
  addDays,
  dateKey as keyOf,
  humanDate,
  minLabel,
  nowMinutes,
  parseKey,
  plural,
  todayKey,
  weekdayIndex,
} from '../lib/time';
import { IconArrowRight, IconBan, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconCoffee } from './icons';

interface DayBoardProps {
  dateKey: string;
  eventType: EventType;
  bookings: Booking[];
  selectedStart: number | null;
  onSelectSlot: (start: number) => void;
  onSelectDate: (key: string) => void;
}

/* ---------- горизонтальная карта занятости дня ---------- */
function StatusStrip({ dateKey }: { dateKey: string }) {
  const bookings = useBookings();
  const wh = workHours(dateKey);
  if (!wh) return null;

  const span = wh.end - wh.start;
  const pct = (m: number) => ((m - wh.start) / span) * 100;
  const dow = weekdayIndex(dateKey);
  const isToday = dateKey === todayKey();
  const now = nowMinutes();
  const showNow = isToday && now >= wh.start && now <= wh.end;
  const busy = busyIntervals(dateKey, bookings);

  const hours: number[] = [];
  for (let h = Math.ceil(wh.start / 60); h <= wh.end / 60; h++) hours.push(h);

  return (
    <div className="mt-6">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
          Карта занятости · {minLabel(wh.start)}–{minLabel(wh.end)}
        </p>
        {showNow && (
          <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-pine">
            <span className="pulse-live h-1.5 w-1.5 rounded-full bg-pine" />
            сейчас {minLabel(now)}
          </p>
        )}
      </div>

      <div className="relative mb-7 mt-6">
        {/* полоса */}
        <div className="relative h-9 overflow-hidden rounded-lg border border-line bg-moss">
          <div
            className="absolute inset-y-0 left-0 bg-ink/10"
            style={{ width: isToday ? `${Math.min(100, Math.max(0, pct(now)))}%` : 0 }}
          />
          {dow <= 4 && (
            <div
              className="lunch-stripes absolute inset-y-0 bg-ochre/25"
              style={{ left: `${pct(LUNCH.start)}%`, width: `${pct(LUNCH.end) - pct(LUNCH.start)}%` }}
              title={`Перерыв ${minLabel(LUNCH.start)}–${minLabel(LUNCH.end)}`}
            />
          )}
          {busy.map((b) => (
            <div
              key={b.id}
              className="absolute inset-y-0 rounded-[3px] bg-rust/80 transition-colors hover:bg-rust"
              style={{ left: `${pct(b.start)}%`, width: `${Math.max(0.8, pct(b.end) - pct(b.start))}%` }}
              title={`Занято ${minLabel(b.start)}–${minLabel(b.end)}`}
            />
          ))}
          {hours.slice(1, -1).map((h) => (
            <span key={h} className="absolute inset-y-0 w-px bg-ink/10" style={{ left: `${pct(h * 60)}%` }} />
          ))}
        </div>

        {/* маркер «сейчас» */}
        {showNow && (
          <div className="absolute -top-2 -bottom-2 z-10" style={{ left: `${pct(now)}%` }}>
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-md bg-pine px-1.5 py-0.5 font-mono text-[10px] font-semibold text-lime shadow-md">
              {minLabel(now)}
            </span>
            <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded bg-pine" />
            <span className="pulse-live absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-pine" />
          </div>
        )}

        {/* подписи часов */}
        {hours.map((h, i) => (
          <span
            key={h}
            className={`tabular absolute top-full mt-1.5 -translate-x-1/2 font-mono text-[10px] text-faint ${
              i % 2 === 1 ? 'hidden sm:block' : ''
            }`}
            style={{ left: `${pct(h * 60)}%` }}
          >
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- строка слота ---------- */
function SlotRow({
  slot,
  index,
  selected,
  onSelect,
}: {
  slot: Slot;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const delay = { animationDelay: `${Math.min(index * 24, 420)}ms` };

  const time = (
    <div className="w-14 shrink-0 pt-3 text-right">
      <span className={`tabular font-mono text-sm font-semibold ${selected ? 'text-pine' : 'text-soft'}`}>
        {minLabel(slot.start)}
      </span>
    </div>
  );

  if (slot.status === 'free') {
    return (
      <li className="anim-rise flex items-stretch gap-2.5 sm:gap-3" style={delay}>
        {time}
        <button
          onClick={onSelect}
          className={`group flex flex-1 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] sm:px-4 ${
            selected
              ? 'border-pine-deep bg-pine-deep text-paper shadow-[0_12px_26px_rgba(14,43,33,0.3)]'
              : 'border-line bg-card hover:-translate-y-0.5 hover:border-pine hover:shadow-[0_8px_20px_rgba(30,92,72,0.15)]'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${selected ? 'bg-lime' : 'bg-pine'}`} />
            <span className="text-sm font-bold">Свободно</span>
            <span className={`hidden font-mono text-[11px] sm:inline ${selected ? 'text-paper/55' : 'text-faint'}`}>
              {minLabel(slot.start)}–{minLabel(slot.end)}
            </span>
          </span>
          {selected ? (
            <span className="anim-pop flex items-center gap-1.5 rounded-md bg-lime px-2 py-1 font-mono text-[11px] font-bold text-pine-deep">
              <IconCheck className="h-3 w-3" /> выбрано
            </span>
          ) : (
            <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-pine opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
              записаться <IconArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </li>
    );
  }

  if (slot.status === 'booked' && slot.booking) {
    const et = getEventType(slot.booking.eventTypeId);
    return (
      <li className="anim-rise flex items-stretch gap-2.5 sm:gap-3" style={delay}>
        {time}
        <div className="booked-hatch flex flex-1 cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-rust/25 border-l-[3px] border-l-rust bg-card px-3.5 py-3 sm:px-4">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-rust" />
            <span className="text-sm font-bold text-ink/75">Занято</span>
            <span className="truncate font-mono text-[11px] text-faint">{maskName(slot.booking.name)}</span>
          </span>
          <span
            className="hidden shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold sm:inline"
            style={{ background: et.tint, color: et.color }}
          >
            {et.title}
          </span>
        </div>
      </li>
    );
  }

  if (slot.status === 'lunch') {
    return (
      <li className="anim-rise flex items-stretch gap-2.5 sm:gap-3" style={delay}>
        {time}
        <div className="lunch-stripes flex flex-1 items-center justify-between gap-3 rounded-xl border border-ochre/30 bg-ochre/10 px-3.5 py-3 sm:px-4">
          <span className="flex items-center gap-2.5 text-ochre">
            <IconCoffee className="h-4 w-4" />
            <span className="text-sm font-bold">Перерыв</span>
          </span>
          <span className="font-mono text-[11px] text-ochre/80">
            {minLabel(LUNCH.start)}–{minLabel(LUNCH.end)}
          </span>
        </div>
      </li>
    );
  }

  return (
    <li className="anim-rise flex items-stretch gap-2.5 opacity-55 sm:gap-3" style={delay}>
      {time}
      <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3.5 py-3 sm:px-4">
        <span className="flex items-center gap-2.5 text-faint">
          <IconBan className="h-4 w-4" />
          <span className="text-sm font-semibold">Завершено</span>
        </span>
        <span className="font-mono text-[11px] text-faint">
          {minLabel(slot.start)}–{minLabel(slot.end)}
        </span>
      </div>
    </li>
  );
}

/* ---------- сама доска ---------- */
export default function DayBoard({
  dateKey,
  eventType,
  bookings,
  selectedStart,
  onSelectSlot,
  onSelectDate,
}: DayBoardProps) {
  const d = parseKey(dateKey);
  const dow = weekdayIndex(dateKey);
  const isToday = dateKey === todayKey();
  const closed = workHours(dateKey) === null;
  const plan = getDayPlan(dateKey, eventType, bookings);
  const free = plan.filter((s) => s.status === 'free').length;
  const busy = plan.filter((s) => s.status === 'booked').length;
  const jumpKey = nextAvailable(dateKey, eventType, bookings);

  return (
    <section className="min-w-0 flex-1">
      {/* шапка дня */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <span className="tabular font-display text-5xl font-bold leading-none text-ink sm:text-6xl">
            {d.getDate()}
          </span>
          <div className="pb-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              {MONTHS[d.getMonth()]} {d.getFullYear()}
            </p>
            <p className="mt-0.5 text-lg font-bold leading-tight text-ink">{WEEKDAYS_FULL[dow]}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {isToday && (
                <span className="rounded-md bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-pine-deep">
                  сегодня
                </span>
              )}
              {closed ? (
                <span className="rounded-md bg-ochre/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ochre">
                  выходной
                </span>
              ) : (
                <>
                  <span className="rounded-md bg-pine/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-pine">
                    {free} {plural(free, ['свободное окно', 'свободных окна', 'свободных окон'])}
                  </span>
                  <span className="rounded-md bg-rust/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-rust">
                    занято: {busy}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectDate(keyOf(addDays(d, -1)))}
            className="rounded-lg border border-line bg-card p-2 text-soft transition hover:border-pine hover:text-pine active:scale-95"
            aria-label="Предыдущий день"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onSelectDate(todayKey())}
            disabled={isToday}
            className="rounded-lg border border-line bg-card px-3 py-2 font-mono text-[11px] font-semibold uppercase text-soft transition enabled:hover:border-pine enabled:hover:text-pine enabled:active:scale-95 disabled:opacity-40"
          >
            Сегодня
          </button>
          <button
            onClick={() => onSelectDate(keyOf(addDays(d, 1)))}
            className="rounded-lg border border-line bg-card p-2 text-soft transition hover:border-pine hover:text-pine active:scale-95"
            aria-label="Следующий день"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {closed ? (
        <div className="anim-rise mt-6 rounded-xl border border-line bg-card px-6 py-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ochre/15 text-ochre">
            <IconCoffee className="h-7 w-7" />
          </span>
          <h3 className="mt-4 font-display text-lg font-semibold text-ink">Воскресенье — выходной</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-soft">
            Окна записи закрыты. Работаем с понедельника по субботу — выберите другой день.
          </p>
          <button
            onClick={() => onSelectDate(keyOf(addDays(d, 1)))}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-bold text-paper transition hover:bg-pine-dark active:scale-[0.98]"
          >
            Перейти к понедельнику <IconArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <StatusStrip dateKey={dateKey} />

          {free === 0 && (
            <div className="anim-rise mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-pine/40 bg-pine/[0.06] px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-pine">
                <IconClock className="h-4 w-4" />
                Свободных окон на {humanDate(dateKey)} нет
              </p>
              {jumpKey && (
                <button
                  onClick={() => onSelectDate(jumpKey)}
                  className="flex items-center gap-1.5 rounded-lg bg-pine px-3 py-1.5 font-mono text-[11px] font-bold text-paper transition hover:bg-pine-dark active:scale-95"
                >
                  ближайший день · {humanDate(jumpKey)} <IconArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <ul className="mt-2 grid gap-2" key={`${dateKey}-${eventType.id}`}>
            {plan.map((slot, i) => (
              <SlotRow
                key={slot.start}
                slot={slot}
                index={i}
                selected={slot.status === 'free' && selectedStart === slot.start}
                onSelect={() => onSelectSlot(slot.start)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
