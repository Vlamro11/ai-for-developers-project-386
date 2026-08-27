import { useEffect, useState } from "react";
import {
  ApiRequestError,
  createBooking,
  getAvailability,
  getSlots,
  type AvailabilityDay,
  type Booking,
  type Slot,
} from "../api/client";
import { BookingCalendar } from "../components/BookingCalendar";
import { SlotList } from "../components/SlotList";
import { BookingForm } from "../components/BookingForm";
import { getWindowEnd, getWindowStart, toApiDate } from "../lib/bookingWindow";

export function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Загрузка агрегированной доступности для подсветки дней в календаре.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingAvailability(true);
    getAvailability(toApiDate(getWindowStart()), toApiDate(getWindowEnd()))
      .then((res) => {
        if (!cancelled) setAvailabilityDays(res.days);
      })
      .catch(() => {
        if (!cancelled) setAvailabilityDays([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Загрузка слотов при выборе дня.
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSlots(true);
    setSelectedSlot(undefined);
    setFormError(null);
    getSlots(toApiDate(selectedDate))
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setFormError(null);
    setConfirmedBooking(null);
  };

  const handleSubmitBooking = async (guestName: string, guestPhone: string) => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const booking = await createBooking({ slotId: selectedSlot.id, guestName, guestPhone });
      setConfirmedBooking(booking);
      setSelectedSlot(undefined);
      // Слот только что забронирован — обновляем список, чтобы он стал "занят"
      // для всех, кто сейчас смотрит на этот день (в т.ч. текущего пользователя).
      if (selectedDate) {
        const res = await getSlots(toApiDate(selectedDate));
        setSlots(res.slots);
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setFormError("Этот слот только что забронировали. Пожалуйста, выберите другой.");
        if (selectedDate) {
          const res = await getSlots(toApiDate(selectedDate));
          setSlots(res.slots);
        }
      } else if (err instanceof ApiRequestError) {
        setFormError(err.message);
      } else {
        setFormError("Не удалось создать запись. Попробуйте ещё раз.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="booking-page">
      <h1>Запись на звонок</h1>

      {confirmedBooking && (
        <div className="booking-page__confirmation" role="status">
          Вы записаны на {new Date(confirmedBooking.startAt).toLocaleString("ru-RU")}.
          Мы свяжемся с вами по номеру {confirmedBooking.guestPhone}.
        </div>
      )}

      <div className="booking-page__layout">
        <BookingCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          availabilityDays={availabilityDays}
          isLoading={isLoadingAvailability}
        />

        <div className="booking-page__slots">
          <h2>Слоты</h2>
          <SlotList
            slots={slots}
            selectedSlotId={selectedSlot?.id}
            onSelectSlot={handleSelectSlot}
            isLoading={isLoadingSlots}
            hasDate={Boolean(selectedDate)}
          />
        </div>

        <div className="booking-page__form">
          <h2>Ваши данные</h2>
          <BookingForm
            slot={selectedSlot}
            onSubmit={handleSubmitBooking}
            isSubmitting={isSubmitting}
            errorMessage={formError}
          />
        </div>
      </div>
    </div>
  );
}
