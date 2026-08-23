import { useEffect, useState } from 'react';
import BookingPanel from './components/BookingPanel';
import BookingsDrawer from './components/BookingsDrawer';
import DayBoard from './components/DayBoard';
import LeftRail from './components/LeftRail';
import WeekStrip from './components/WeekStrip';
import { ToastHost } from './components/Toasts';
import { IconList, LogoMark } from './components/icons';
import { EVENT_TYPES, getEventType, useBookings } from './lib/store';
import { pad2, timezonesLabel, todayKey } from './lib/time';

function useClock(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function TopBar({ bookingsCount, onOpenDrawer }: { bookingsCount: number; onOpenDrawer: () => void }) {
  const now = useClock(1000);
  const clock = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-pine-deep text-paper">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-7 w-7" />
          <div className="leading-none">
            <p className="font-display text-[15px] font-bold tracking-[0.08em]">ОКНА</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-paper/45">
              онлайн-запись
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden max-w-[220px] truncate rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-paper/60 md:block">
            {timezonesLabel()}
          </span>
          <span className="tabular hidden rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] font-semibold text-lime sm:block">
            {clock}
          </span>
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-2 rounded-lg bg-lime px-3 py-2 text-sm font-bold text-pine-deep transition hover:brightness-105 active:scale-[0.97]"
          >
            <IconList className="h-4 w-4" />
            <span className="hidden sm:inline">Записи</span>
            <span className="tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-pine-deep px-1 font-mono text-[11px] font-bold text-lime">
              {bookingsCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const bookings = useBookings();
  const [eventTypeId, setEventTypeId] = useState('consult');
  const [dateKey, setDateKey] = useState(todayKey());
  const [slotStart, setSlotStart] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* тик раз в 30 секунд: статус «сейчас» и прошедшие слоты обновляются */
  const clock = useClock(30_000);
  void clock;

  const eventType = getEventType(eventTypeId);

  const selectDate = (key: string) => {
    setDateKey(key);
    setSlotStart(null);
  };

  const selectEventType = (id: string) => {
    setEventTypeId(id);
    setSlotStart(null);
  };

  return (
    <div className="min-h-screen font-body text-ink">
      <TopBar bookingsCount={bookings.length} onOpenDrawer={() => setDrawerOpen(true)} />

      <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-[312px_minmax(0,1fr)]">
        <LeftRail
          selectedId={eventTypeId}
          onSelect={selectEventType}
          dateKey={dateKey}
          onSelectDate={selectDate}
        />

        <main className="relative px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {/* фоновые живые акценты */}
          <div className="pointer-events-none absolute -right-24 top-24 -z-10 h-72 w-72 rounded-full bg-pine/10 blur-3xl anim-drift" />
          <div className="pointer-events-none absolute -left-20 bottom-10 -z-10 h-64 w-64 rounded-full bg-ochre/10 blur-3xl anim-drift" style={{ animationDelay: '-4.5s' }} />

          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Неделя · выберите день
          </p>
          <WeekStrip
            dateKey={dateKey}
            onSelectDate={selectDate}
            eventType={eventType}
            bookings={bookings}
          />

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
            <DayBoard
              dateKey={dateKey}
              eventType={eventType}
              bookings={bookings}
              selectedStart={slotStart}
              onSelectSlot={setSlotStart}
              onSelectDate={selectDate}
            />
            {slotStart !== null && (
              <BookingPanel
                key={`${dateKey}-${slotStart}`}
                dateKey={dateKey}
                start={slotStart}
                eventType={eventType}
                onClose={() => setSlotStart(null)}
              />
            )}
          </div>

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 font-mono text-[10px] text-faint">
            <span>ОКНА · демо-сервис записи по мотивам Cal.com</span>
            <span>
              форматов: {EVENT_TYPES.length} · записей в памяти: {bookings.length}
            </span>
          </footer>
        </main>
      </div>

      <BookingsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ToastHost />
    </div>
  );
}
