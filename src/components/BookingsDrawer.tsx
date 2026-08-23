import { useEffect, useMemo } from 'react';
import { cancelBooking, getEventType, useBookings, type Booking } from '../lib/store';
import { humanDateFull, minLabel, nowMinutes, todayKey, weekdayIndex } from '../lib/time';
import { toast } from './Toasts';
import { IconCalendar, IconClose, IconTrash } from './icons';

interface BookingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function BookingsDrawer({ open, onClose }: BookingsDrawerProps) {
  const bookings = useBookings();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    return [...map.entries()].sort((a, z) => a[0].localeCompare(z[0]));
  }, [bookings]);

  if (!open) return null;

  const today = todayKey();
  const now = nowMinutes();
  const isPast = (b: Booking) => b.date < today || (b.date === today && b.end <= now);

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 w-full bg-pine-deep/45"
        onClick={onClose}
        aria-label="Закрыть список записей"
      />
      <aside className="anim-drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2.5 font-display text-lg font-bold text-ink">
            Записи
            <span className="tabular rounded-full bg-pine-deep px-2 py-0.5 font-mono text-xs font-bold text-lime">
              {bookings.length}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-faint transition hover:bg-moss hover:text-ink active:scale-90"
            aria-label="Закрыть"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </header>

        <div className="nice-scroll flex-1 overflow-y-auto px-5 py-5">
          {bookings.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-moss text-pine">
                <IconCalendar className="h-7 w-7" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">Пока нет записей</h3>
              <p className="mt-1.5 max-w-[240px] text-sm leading-relaxed text-soft">
                Выберите свободное окно в календаре — запись появится здесь.
              </p>
              <button
                onClick={onClose}
                className="mt-5 rounded-lg bg-pine px-4 py-2.5 text-sm font-bold text-paper transition hover:bg-pine-dark active:scale-[0.98]"
              >
                К календарю
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(([date, list]) => (
                <section key={date}>
                  <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                    <span className={`h-1.5 w-1.5 rounded-full ${date === today ? 'bg-lime ring-2 ring-pine/30' : 'bg-pine/40'}`} />
                    {humanDateFull(date)}
                    {weekdayIndex(date) === 5 && ' · сокращённый день'}
                  </p>
                  <ul className="space-y-2">
                    {list.map((b, i) => {
                      const et = getEventType(b.eventTypeId);
                      const past = isPast(b);
                      return (
                        <li
                          key={b.id}
                          className={`anim-rise flex items-start gap-3 rounded-xl border border-line bg-card p-3.5 ${
                            past ? 'opacity-55' : ''
                          }`}
                          style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                        >
                          <div className="w-[74px] shrink-0">
                            <p className="tabular font-mono text-sm font-bold text-ink">{minLabel(b.start)}</p>
                            <p className="tabular font-mono text-[11px] text-faint">–{minLabel(b.end)}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">{b.name}</p>
                            <p className="truncate text-xs text-faint">{b.email}</p>
                            {b.comment && (
                              <p className="mt-1 truncate text-xs italic text-soft">«{b.comment}»</p>
                            )}
                            <span
                              className="mt-1.5 inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-bold"
                              style={{ background: et.tint, color: et.color }}
                            >
                              {et.title} · {et.duration} мин
                            </span>
                          </div>
                          {past ? (
                            <span className="shrink-0 rounded-md bg-moss px-2 py-1 font-mono text-[10px] font-semibold text-faint">
                              завершена
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                cancelBooking(b.id);
                                toast('Запись отменена — окно снова свободно', 'warn');
                              }}
                              className="shrink-0 rounded-lg p-2 text-faint transition hover:bg-rust/10 hover:text-rust active:scale-90"
                              title="Отменить запись"
                              aria-label={`Отменить запись ${b.name}`}
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-line px-5 py-3 text-center font-mono text-[10px] text-faint">
          Хранилище в памяти — перезапуск сервиса сбросит записи
        </footer>
      </aside>
    </div>
  );
}
