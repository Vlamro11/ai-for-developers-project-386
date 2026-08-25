import { useState, useEffect } from 'react';
import type { Slot, UserRole, CreateBookingDto, CreateSlotDto } from './types';
import { fetchSlots, createBooking, createSlot, resetSlots } from './services/apiService';
import { Header } from './components/Header';
import { CalendarStrip } from './components/CalendarStrip';
import { SlotList } from './components/SlotList';
import { BookingModal } from './components/BookingModal';
import { OwnerView } from './components/OwnerView';
import { isSameDay, parseISO } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

export function App() {
  const [role, setRole] = useState<UserRole>('guest');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slotToBook, setSlotToBook] = useState<Slot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadSlots = async () => {
    const data = await fetchSlots();
    setSlots(data);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleReset = async () => {
    if (confirm('Сбросить тестовые слоты и бронирования на исходные?')) {
      await resetSlots();
      await loadSlots();
      showToast('Данные успешно сброшены');
    }
  };

  const handleConfirmBooking = async (dto: CreateBookingDto) => {
    await createBooking(dto);
    await loadSlots();
    showToast('Вы успешно записались на звонок!');
  };

  const handleCreateSlot = async (dto: CreateSlotDto) => {
    await createSlot(dto);
    await loadSlots();
    showToast('Новое окно записи успешно добавлено!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter slots for current selected date in guest view
  const currentDaySlots = slots.filter((s) =>
    isSameDay(parseISO(s.startTime), selectedDate)
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      <Header
        role={role}
        onRoleChange={handleRoleChange}
        onReset={handleReset}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {role === 'guest' ? (
          <div>
            {/* 14-day calendar strip */}
            <CalendarStrip
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              slots={slots}
            />

            {/* List of 30-min slots for selected date */}
            <SlotList
              date={selectedDate}
              slots={currentDaySlots}
              role={role}
              onSelectSlotToBook={(slot) => setSlotToBook(slot)}
            />
          </div>
        ) : (
          <OwnerView slots={slots} onCreateSlot={handleCreateSlot} />
        )}
      </main>

      {/* Booking Form Modal */}
      <BookingModal
        slot={slotToBook}
        onClose={() => setSlotToBook(null)}
        onConfirm={handleConfirmBooking}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>Приложение «Запись на звонок» — Демонстрация бронирования без авторизации</p>
      </footer>
    </div>
  );
}

export default App;
