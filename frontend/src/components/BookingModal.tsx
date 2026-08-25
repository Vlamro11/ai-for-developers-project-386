import React, { useState } from 'react';
import type { Slot, CreateBookingDto } from '../types';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { X, Calendar, Clock, User, Send, CheckCircle } from 'lucide-react';

interface BookingModalProps {
  slot: Slot | null;
  onClose: () => void;
  onConfirm: (dto: CreateBookingDto) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  slot,
  onClose,
  onConfirm,
}) => {
  if (!slot) return null;

  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTimeStr = format(parseISO(slot.startTime), 'HH:mm');
  const endTimeStr = format(parseISO(slot.endTime), 'HH:mm');
  const dateStr = format(parseISO(slot.startTime), 'd MMMM yyyy, EEEE', { locale: ru });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestContact.trim()) {
      setError('Пожалуйста, заполните имя и контактные данные');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm({
        slotId: slot.id,
        guestName: guestName.trim(),
        guestContact: guestContact.trim(),
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при подтверждении записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-200" />
            <h3 className="font-bold text-lg">Запись на звонок</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Slot summary info */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-1">
            <div className="text-xs font-semibold text-indigo-900 capitalize flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              {dateStr}
            </div>
            <div className="text-sm font-bold text-indigo-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>{startTimeStr} — {endTimeStr} (30 минут)</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ваше имя <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Иван Петров"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Контакты (Telegram / Email / Телефон) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Send className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="@username или example@mail.com"
                value={guestContact}
                onChange={(e) => setGuestContact(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Цель встречи / Комментарий <span className="text-slate-400 font-normal">(необязательно)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Кратко опишите, что хотите обсудить..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Сохранение...' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
