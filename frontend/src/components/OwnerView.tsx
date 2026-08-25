import React, { useState } from 'react';
import type { Slot, CreateSlotDto } from '../types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Calendar, Plus, User, PhoneCall, MessageSquare, Clock, ShieldCheck } from 'lucide-react';

interface OwnerViewProps {
  slots: Slot[];
  onCreateSlot: (dto: CreateSlotDto) => Promise<void>;
}

export const OwnerView: React.FC<OwnerViewProps> = ({ slots, onCreateSlot }) => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookedSlots = slots
    .filter((s) => s.isBooked)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateSlot({
        date,
        startTime: time,
      });
      alert('Новый слот успешно добавлен!');
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании слота');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div className="bg-purple-900 text-white rounded-2xl p-6 shadow-md border border-purple-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-700/60 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-purple-200" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Панель Владельца</h2>
            <p className="text-xs text-purple-200 mt-0.5">
              Управлениеокнами записи и просмотр забронированных звонков
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs bg-purple-950/50 px-4 py-2 rounded-xl border border-purple-700/50">
          <div>
            <span className="text-purple-300">Всего слотов: </span>
            <span className="font-bold text-white">{slots.length}</span>
          </div>
          <div className="h-4 w-px bg-purple-700" />
          <div>
            <span className="text-purple-300">Забронировано: </span>
            <span className="font-bold text-emerald-400">{bookedSlots.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create slot form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" />
            Добавить окно для записи
          </h3>

          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Дата
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Время начала (30 минут)
              </label>
              <input
                type="time"
                required
                step="1800"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-xl transition shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Создание...' : 'Создать слот'}
            </button>
          </form>
        </div>

        {/* Booked meetings list */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Предстоящие запланированные звонки ({bookedSlots.length})
          </h3>

          {bookedSlots.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">Запланированных звонков пока нет</p>
              <p className="text-xs text-slate-400 mt-1">Гости могут забронировать свободные слоты на главной</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookedSlots.map((slot) => {
                const dateStr = format(parseISO(slot.startTime), 'd MMMM yyyy, EEEE', { locale: ru });
                const startTimeStr = format(parseISO(slot.startTime), 'HH:mm');
                const endTimeStr = format(parseISO(slot.endTime), 'HH:mm');

                return (
                  <div
                    key={slot.id}
                    className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-purple-900 capitalize flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        {dateStr}
                      </div>
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span>{startTimeStr} — {endTimeStr}</span>
                      </div>
                    </div>

                    {slot.booking && (
                      <div className="bg-white p-3 rounded-xl border border-purple-100 text-xs space-y-1 min-w-[240px]">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-purple-600" />
                          {slot.booking.guestName}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                          {slot.booking.guestContact}
                        </div>
                        {slot.booking.comment && (
                          <div className="flex items-start gap-1.5 text-slate-500 italic">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>"{slot.booking.comment}"</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
