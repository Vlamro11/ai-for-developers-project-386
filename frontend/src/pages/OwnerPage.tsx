import { useEffect, useState, type FormEvent } from "react";
import {
  ApiRequestError,
  createOwnerAvailability,
  getOwnerAvailability,
  type AvailabilityInterval,
} from "../api/client";
import { getWindowEnd, getWindowStart, toApiDate } from "../lib/bookingWindow";

/**
 * Экран владельца: публикация доступных интервалов (рабочих часов на день).
 * Без авторизации, согласно ТЗ (см. AGENTS.md, "Открытые вопросы").
 * Из каждого интервала backend нарезает 30-минутные слоты, которые сразу
 * становятся видны гостям на странице записи.
 */
export function OwnerPage() {
  const [intervals, setIntervals] = useState<AvailabilityInterval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(toApiDate(getWindowStart()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIntervals = () => {
    setIsLoading(true);
    getOwnerAvailability()
      .then(setIntervals)
      .catch(() => setIntervals([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadIntervals();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createOwnerAvailability({ date, startTime, endTime });
      loadIntervals();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Не удалось опубликовать интервал. Попробуйте ещё раз.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const windowStart = toApiDate(getWindowStart());
  const windowEnd = toApiDate(getWindowEnd());

  return (
    <div className="owner-page">
      <h1>Панель владельца</h1>
      <p className="owner-page__note">
        Опубликуйте рабочий интервал на день — из него автоматически нарежутся
        30-минутные слоты, доступные для записи гостям. Интервал должен
        укладываться в окно записи {windowStart}–{windowEnd}.
      </p>

      <form className="owner-form" onSubmit={handleSubmit}>
        <label className="owner-form__field">
          Дата
          <input
            type="date"
            value={date}
            min={windowStart}
            max={windowEnd}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>
        <label className="owner-form__field">
          Начало
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>
        <label className="owner-form__field">
          Конец
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>
        {error && <p className="owner-form__error">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Публикуем…" : "Опубликовать интервал"}
        </button>
      </form>

      <h2>Опубликованные интервалы</h2>
      {isLoading && <p className="owner-page__hint">Загрузка…</p>}
      {!isLoading && intervals.length === 0 && (
        <p className="owner-page__hint">Пока не опубликовано ни одного интервала.</p>
      )}
      {intervals.length > 0 && (
        <ul className="owner-interval-list">
          {intervals
            .slice()
            .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
            .map((interval) => (
              <li key={interval.id} className="owner-interval-list__item">
                <span>{interval.date}</span>
                <span>
                  {interval.startTime}–{interval.endTime}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
