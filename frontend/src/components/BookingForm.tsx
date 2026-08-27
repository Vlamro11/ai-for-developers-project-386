import { useState, type FormEvent } from "react";
import type { Slot } from "../api/client";

interface BookingFormProps {
  slot: Slot | undefined;
  onSubmit: (guestName: string, guestPhone: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

/** Форма записи на выбранный свободный слот: имя, телефон, кнопка "Записаться". */
export function BookingForm({ slot, onSubmit, isSubmitting, errorMessage }: BookingFormProps) {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  if (!slot) {
    return <p className="booking-form__hint">Выберите свободный слот, чтобы записаться на звонок.</p>;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!guestName.trim() || !guestPhone.trim()) return;
    await onSubmit(guestName.trim(), guestPhone.trim());
  };

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <label className="booking-form__field">
        Имя
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
          minLength={1}
          maxLength={200}
          disabled={isSubmitting}
        />
      </label>
      <label className="booking-form__field">
        Телефон
        <input
          type="tel"
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          required
          minLength={3}
          maxLength={32}
          placeholder="+79990001122"
          disabled={isSubmitting}
        />
      </label>
      {errorMessage && <p className="booking-form__error">{errorMessage}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Записываем…" : "Записаться"}
      </button>
    </form>
  );
}
