import React from 'react';
import type { Slot } from '../types';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  slots: Slot[];
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  slots,
}) => {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-800">
            Окно записи на 14 дней ({format(today, 'd MMM', { locale: ru })} — {format(addDays(today, 13), 'd MMM', { locale: ru })})
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          
          // Count slots for this day
          const daySlots = slots.filter((slot) => isSameDay(parseISO(slot.startTime), day));
          const freeCount = daySlots.filter((s) => !s.isBooked).length;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl min-w-[80px] transition-all snap-start border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              <span className={`text-xs uppercase font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                {format(day, 'eee', { locale: ru })}
              </span>
              <span className="text-lg font-bold my-0.5">
                {format(day, 'd')}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isSelected
                  ? 'bg-indigo-700/60 text-indigo-100'
                  : freeCount > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {freeCount > 0 ? `${freeCount} своб.` : 'Нет мест'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
