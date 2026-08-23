import { useEffect, useState } from 'react';
import { EVENT_TYPES, useBookings, countFree } from '../lib/store';
import {
  MONTHS,
  WEEKDAYS_MINI,
  dateKey,
  parseKey,
  todayKey,
} from '../lib/time';
import { IconCheck, IconChevronLeft, IconChevronRight, LogoMark } from './icons';

interface LeftRailProps {
  selectedId: string;
  onSelect: (id: string) => void;
  dateKey: string;
  onSelectDate: (key: string) => void;
}

function MiniCalendar({ dateKey: selected, onSelectDate }: { dateKey: string; onSelectDate: (k: string) => void }) {
  const [view, setView] = useState(() => {
    const d = parseKey(selected);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    const d = parseKey(selected);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [selected]);

  const today = todayKey();
  const offset = (view.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      dateKey(new Date(view.getFullYear(), view.getMonth(), i + 1)),
    ),
  ];

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <button
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="rounded-md p-1.5 text-paper/60 transition hover:bg-white/10 hover:text-lime active:scale-95"
          aria-label="Предыдущий месяц"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-paper/85">
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </p>
        <button
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="rounded-md p-1.5 text-paper/60 transition hover:bg-white/10 hover:text-lime active:scale-95"
          aria-label="Следующий месяц"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_MINI.map((w, i) => (
          <span key={i} className="py-1 font-mono text-[10px] text-paper/40">
            {w}
          </span>
        ))}
        {cells.map((k, i) =>
          k === null ? (
            <span key={`e${i}`} />
          ) : (
            <button
              key={k}
              onClick={() => onSelectDate(k)}
              className={`tabular mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all active:scale-90 ${
                k === selected
                  ? 'bg-lime text-pine-deep shadow-md'
                  : k === today
                    ? 'text-lime ring-1 ring-lime/60 hover:bg-white/10'
                    : 'text-paper/75 hover:bg-white/10 hover:text-paper'
              }`}
            >
              {parseKey(k).getDate()}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

const LEGEND = [
  { label: 'Свободно', cls: 'border-2 border-pine bg-card', dark: false },
  { label: 'Занято', cls: 'bg-rust', dark: false },
  { label: 'Перерыв', cls: 'lunch-stripes border border-ochre/50 bg-ochre/15', dark: false },
  { label: 'Завершено', cls: 'bg-paper/25', dark: true },
];

export default function LeftRail({ selectedId, onSelect, dateKey, onSelectDate }: LeftRailProps) {
  const bookings = useBookings();

  return (
    <aside className="flex flex-col gap-6 bg-pine-deep px-4 py-5 text-paper lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:px-5 nice-scroll-dark">
      {/* Форматы встреч */}
      <section>
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
          Формат встречи
        </p>
        <div className="nice-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {EVENT_TYPES.map((et) => {
            const active = et.id === selectedId;
            const freeToday = countFree(todayKey(), et, bookings);
            return (
              <button
                key={et.id}
                onClick={() => onSelect(et.id)}
                className={`group relative min-w-[228px] shrink-0 rounded-xl border p-3.5 text-left transition-all duration-200 active:scale-[0.98] lg:min-w-0 ${
                  active
                    ? 'border-lime bg-lime text-pine-deep shadow-[0_10px_28px_rgba(217,242,107,0.22)]'
                    : 'border-white/10 bg-white/[0.05] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.09]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: active ? '#0e2b21' : et.color }}
                    />
                    <span className="font-display text-[13px] font-semibold">{et.title}</span>
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                      active ? 'bg-pine-deep text-lime' : 'bg-white/10 text-paper/70'
                    }`}
                  >
                    {et.duration} мин
                  </span>
                </div>
                <p className={`mt-2 text-xs leading-relaxed ${active ? 'text-pine-deep/75' : 'text-paper/55'}`}>
                  {et.desc}
                </p>
                <p className={`mt-2 font-mono text-[10px] ${active ? 'text-pine-deep/60' : 'text-paper/35'}`}>
                  сегодня свободно: {freeToday}
                </p>
                {active && (
                  <span className="anim-pop absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pine-deep text-lime shadow-md">
                    <IconCheck className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Мини-календарь */}
      <section className="hidden rounded-xl border border-white/10 bg-white/[0.04] p-3.5 lg:block">
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
          Перейти к дате
        </p>
        <MiniCalendar dateKey={dateKey} onSelectDate={onSelectDate} />
      </section>

      {/* Легенда */}
      <section className="hidden lg:block">
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
          Статусы слотов
        </p>
        <ul className="space-y-2">
          {LEGEND.map((l) => (
            <li key={l.label} className="flex items-center gap-2.5 text-xs text-paper/70">
              <span className={`h-3.5 w-3.5 rounded-[5px] ${l.cls}`} />
              {l.label}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto hidden items-start gap-2 pt-2 lg:flex">
        <LogoMark className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
        <p className="font-mono text-[10px] leading-relaxed text-paper/35">
          Хранилище — в памяти сервиса: перезапуск сбросит все записи. Без аккаунтов и внешних
          календарей.
        </p>
      </div>
    </aside>
  );
}
