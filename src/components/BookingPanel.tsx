import { useState } from 'react';
import { addBooking, cancelBooking, type Booking, type EventType } from '../lib/store';
import { humanDate, humanDateFull, minLabel } from '../lib/time';
import { toast } from './Toasts';
import { IconArrowRight, IconCheck, IconClose, IconMail, IconTrash, IconUser, IconVideo } from './icons';

interface BookingPanelProps {
  dateKey: string;
  start: number;
  eventType: EventType;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function BookingPanel({ dateKey, start, eventType, onClose }: BookingPanelProps) {
  const end = start + eventType.duration;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [phase, setPhase] = useState<'form' | 'sending' | 'done'>('form');
  const [done, setDone] = useState<Booking | null>(null);

  const submit = () => {
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = 'Укажите имя (минимум 2 символа)';
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Похоже, в адресе почты ошибка';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPhase('sending');
    window.setTimeout(() => {
      const b = addBooking({
        eventTypeId: eventType.id,
        date: dateKey,
        start,
        end,
        name: name.trim(),
        email: email.trim(),
        comment: comment.trim(),
      });
      setDone(b);
      setPhase('done');
      toast(`Записали: ${humanDate(dateKey)} в ${minLabel(start)}`);
    }, 700);
  };

  const cancelDone = () => {
    if (!done) return;
    cancelBooking(done.id);
    toast('Запись отменена — окно снова свободно', 'warn');
    onClose();
  };

  return (
    <aside className="panel-in fixed inset-x-0 bottom-0 z-40 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-line bg-card shadow-[0_-18px_50px_rgba(14,43,33,0.28)] nice-scroll lg:static lg:z-auto lg:max-h-none lg:w-[340px] lg:shrink-0 lg:overflow-visible lg:rounded-2xl lg:border lg:shadow-[0_18px_44px_rgba(14,43,33,0.16)]">
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line lg:hidden" />

      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            {phase === 'done' ? 'Подтверждение' : 'Ваша запись'}
          </p>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-faint transition hover:bg-moss hover:text-ink active:scale-90"
            aria-label="Закрыть панель записи"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        {/* сводка слота */}
        <div className="mt-3.5 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: eventType.color }} />
              <span className="font-display text-[13px] font-semibold text-ink">{eventType.title}</span>
            </span>
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold"
              style={{ background: eventType.tint, color: eventType.color }}
            >
              {eventType.duration} мин
            </span>
          </div>
          <div className="my-3 border-t border-dashed border-line" />
          <p className="tabular font-mono text-[26px] font-bold leading-none tracking-tight text-ink">
            {minLabel(start)}–{minLabel(end)}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-soft">{humanDateFull(dateKey)}</p>
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-faint">
            <IconVideo className="h-4 w-4 shrink-0 text-pine" />
            Видеозвонок — ссылка придёт на почту
          </p>
        </div>

        {phase !== 'done' ? (
          <form
            className="mt-4 space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div>
              <label htmlFor="bk-name" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                Ваше имя *
              </label>
              <div className="relative">
                <IconUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="bk-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  className={`w-full rounded-lg border bg-paper py-2.5 pl-10 pr-3 text-sm font-medium text-ink outline-none transition placeholder:text-faint/70 focus:ring-2 ${
                    errors.name
                      ? 'border-rust focus:ring-rust/25'
                      : 'border-line focus:border-pine focus:ring-pine/20'
                  }`}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs font-semibold text-rust">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="bk-email" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                Почта *
              </label>
              <div className="relative">
                <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="bk-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.ru"
                  className={`w-full rounded-lg border bg-paper py-2.5 pl-10 pr-3 text-sm font-medium text-ink outline-none transition placeholder:text-faint/70 focus:ring-2 ${
                    errors.email
                      ? 'border-rust focus:ring-rust/25'
                      : 'border-line focus:border-pine focus:ring-pine/20'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs font-semibold text-rust">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="bk-comment" className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                Комментарий
              </label>
              <textarea
                id="bk-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Пара слов о задаче — по желанию"
                className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2.5 text-sm font-medium text-ink outline-none transition placeholder:text-faint/70 focus:border-pine focus:ring-2 focus:ring-pine/20"
              />
            </div>

            <button
              type="submit"
              disabled={phase === 'sending'}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-pine py-3 text-sm font-bold text-paper transition hover:bg-pine-dark active:scale-[0.98] disabled:opacity-75"
            >
              {phase === 'sending' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                  Бронируем…
                </>
              ) : (
                <>
                  Подтвердить запись <IconArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-center font-mono text-[10px] text-faint">
              Демо-режим: данные не покидают ваш браузер
            </p>
          </form>
        ) : (
          <div className="mt-4 text-center">
            <div className="anim-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine/10">
              <svg viewBox="0 0 72 72" className="h-16 w-16">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#1e5c48" strokeWidth="3.5" className="circle-draw" strokeLinecap="round" transform="rotate(-90 36 36)" />
                <path d="M23 37.5l9 9L50 28" fill="none" stroke="#1e5c48" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="check-draw" />
              </svg>
            </div>
            <h3 className="mt-3 font-display text-lg font-bold text-ink">Вы записаны!</h3>
            <p className="mt-1 text-xs leading-relaxed text-soft">
              Подтверждение «отправлено» на <span className="font-semibold text-ink">{done?.email}</span> — в
              демо-режиме письма не уходят.
            </p>
            <div className="mt-4 rounded-xl border border-line bg-paper px-4 py-3 text-left">
              <p className="tabular font-mono text-sm font-bold text-ink">
                {humanDateFull(dateKey)} · {minLabel(start)}–{minLabel(end)}
              </p>
              <p className="mt-1 text-xs text-soft">
                {eventType.title} с {done?.name}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-pine py-2.5 text-sm font-bold text-paper transition hover:bg-pine-dark active:scale-[0.98]"
              >
                <IconCheck className="h-4 w-4" /> Готово
              </button>
              <button
                onClick={cancelDone}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-rust/30 px-3 py-2.5 font-mono text-[11px] font-bold text-rust transition hover:bg-rust/10 active:scale-[0.98]"
                title="Отменить запись"
              >
                <IconTrash className="h-4 w-4" /> отменить
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
