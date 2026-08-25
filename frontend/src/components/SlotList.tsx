import React, { useState } from 'react';
import type { Slot, UserRole } from '../types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Clock, CheckCircle2, XCircle, User, MessageSquare, PhoneCall } from 'lucide-react';

interface SlotListProps {
  date: Date;
  slots: Slot[];
  role?: UserRole;
  onSelectSlotToBook: (slot: Slot) => void;
}

export const SlotList: React.FC<SlotListProps> = ({
  date,
  slots,
  onSelectSlotToBook,
}) => {
  const [filter, setFilter] = useState<'all' | 'free' | 'booked'>('all');

  const filteredSlots = slots.filter((s) => {
    if (filter === 'free') return !s.isBooked;
    if (filter === 'booked') return s.isBooked;
    return true;
  });

  const formattedDate = format(date, 'd MMMM yyyy, EEEE', { locale: ru });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {formattedDate}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Слоты длительностью по 30 минут
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Все ({slots.length})
          </button>
          <button
            onClick={() => setFilter('free')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'free'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-emerald-600'
            }`}
          >
            Свободные ({slots.filter((s) => !s.isBooked).length})
          </button>
          <button
            onClick={() => setFilter('booked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'booked'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-500 hover:text-rose-600'
            }`}
          >
            Занятые ({slots.filter((s) => s.isBooked).length})
          </button>
        </div>
      </div>

      {filteredSlots.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">Слоты по выбранному фильтру отсутствуют</p>
          <p className="text-xs text-slate-400 mt-1">Выберите другой день или избавьтесь от фильтра</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSlots.map((slot) => {
            const startTimeStr = format(parseISO(slot.startTime), 'HH:mm');
            const endTimeStr = format(parseISO(slot.endTime), 'HH:mm');

            return (
              <div
                key={slot.id}
                className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  slot.isBooked
                    ? 'bg-rose-50/40 border-rose-200 text-slate-700'
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>{startTimeStr} — {endTimeStr}</span>
                    </div>

                    {/* Status Badge */}
                    {slot.isBooked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <XCircle className="w-3.5 h-3.5" />
                        Занят
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Свободен
                      </span>
                    )}
                  </div>

                  {/* Booking details for booked slots */}
                  {slot.isBooked && slot.booking && (
                    <div className="mt-3 pt-3 border-t border-rose-100/80 text-xs text-slate-600 space-y-1 bg-white/60 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-rose-600" />
                        {slot.booking.guestName}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                        {slot.booking.guestContact}
                      </div>
                      {slot.booking.comment && (
                        <div className="flex items-start gap-1.5 text-slate-600 italic mt-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>"{slot.booking.comment}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-4 pt-2">
                  {!slot.isBooked ? (
                    <button
                      onClick={() => onSelectSlotToBook(slot)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Забронировать слот</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 px-3 bg-slate-100 text-slate-400 font-medium text-xs rounded-lg cursor-not-allowed text-center"
                    >
                      Недоступен
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
