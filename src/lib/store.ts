import { useSyncExternalStore } from 'react';
import { addDays, dateKey, nowMinutes, parseKey, todayKey, weekdayIndex } from './time';

/* ------------------------------------------------------------------ */
/*  Типы                                                               */
/* ------------------------------------------------------------------ */

export interface EventType {
  id: string;
  title: string;
  duration: number; // минуты
  desc: string;
  color: string;
  tint: string;
}

export interface Booking {
  id: string;
  eventTypeId: string;
  date: string; // YYYY-MM-DD
  start: number; // минуты от полуночи
  end: number;
  name: string;
  email: string;
  comment: string;
  createdAt: number;
}

export type SlotStatus = 'free' | 'booked' | 'lunch' | 'past';

export interface Slot {
  start: number;
  end: number;
  status: SlotStatus;
  booking?: Booking;
}

/* ------------------------------------------------------------------ */
/*  Форматы встреч                                                     */
/* ------------------------------------------------------------------ */

export const EVENT_TYPES: EventType[] = [
  {
    id: 'intro',
    title: 'Знакомство',
    duration: 15,
    color: '#1e5c48',
    tint: '#e2efe7',
    desc: 'Короткий видеозвонок: познакомимся, сверим ожидания и наметим план.',
  },
  {
    id: 'consult',
    title: 'Консультация',
    duration: 30,
    color: '#2e66a7',
    tint: '#e3ecf6',
    desc: 'Разбор конкретной задачи: вопросы, варианты решений, следующие шаги.',
  },
  {
    id: 'workshop',
    title: 'Воркшоп',
    duration: 60,
    color: '#b97f2f',
    tint: '#f5ecdd',
    desc: 'Глубокая рабочая сессия: анализ, проработка и план действий на неделю.',
  },
];

export const getEventType = (id: string): EventType =>
  EVENT_TYPES.find((e) => e.id === id) ?? EVENT_TYPES[0];

/* ------------------------------------------------------------------ */
/*  Хранилище в памяти (сбрасывается при перезапуске)                  */
/* ------------------------------------------------------------------ */

let seq = 100;
const nextId = () => `bk_${++seq}_${Math.random().toString(36).slice(2, 7)}`;

function seed(): Booking[] {
  const base = new Date();
  const mk = (
    offset: number,
    start: number,
    typeId: string,
    name: string,
    email: string,
    comment = '',
  ): Booking => {
    const et = getEventType(typeId);
    return {
      id: nextId(),
      eventTypeId: typeId,
      date: dateKey(addDays(base, offset)),
      start,
      end: start + et.duration,
      name,
      email,
      comment,
      createdAt: Date.now(),
    };
  };

  return [
    mk(0, 10 * 60, 'consult', 'Анна Крылова', 'anna.k@example.ru', 'Хочу обсудить редизайн каталога'),
    mk(0, 12 * 60, 'intro', 'Пётр Савельев', 'p.saveliev@example.ru'),
    mk(0, 15 * 60 + 30, 'workshop', 'Мария Демидова', 'm.demidova@example.ru', 'Нужна помощь с воронкой'),
    mk(1, 11 * 60, 'consult', 'Илья Гончаров', 'ilya.g@example.ru'),
    mk(1, 14 * 60, 'intro', 'Соня Ветрова', 'sonya.v@example.ru', 'По рекомендации Дмитрия'),
    mk(2, 10 * 60 + 30, 'workshop', 'Глеб Никитин', 'gleb.n@example.ru'),
    mk(2, 16 * 60, 'consult', 'Вера Ланская', 'vera.l@example.ru'),
    mk(3, 12 * 60 + 30, 'intro', 'Тимур Алиев', 'timur.a@example.ru'),
    mk(4, 11 * 60, 'consult', 'Ольга Мирова', 'olga.m@example.ru'),
    mk(5, 12 * 60, 'intro', 'Денис Царёв', 'denis.ts@example.ru'),
  ];
}

let bookings: Booking[] = seed();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const getBookings = () => bookings;

export function useBookings(): Booking[] {
  return useSyncExternalStore(subscribe, getBookings);
}

export function addBooking(input: Omit<Booking, 'id' | 'createdAt'>): Booking {
  const b: Booking = { ...input, id: nextId(), createdAt: Date.now() };
  bookings = [...bookings, b].sort((a, z) =>
    a.date === z.date ? a.start - z.start : a.date.localeCompare(z.date),
  );
  emit();
  return b;
}

export function cancelBooking(id: string) {
  bookings = bookings.filter((b) => b.id !== id);
  emit();
}

/* ------------------------------------------------------------------ */
/*  Рабочие часы и доступность                                         */
/* ------------------------------------------------------------------ */

export const LUNCH = { start: 13 * 60, end: 14 * 60 };

/** Пн–Пт 9:00–18:00, Сб 10:00–15:00, Вс — выходной */
export function workHours(key: string): { start: number; end: number } | null {
  const dow = weekdayIndex(key);
  if (dow === 6) return null;
  if (dow === 5) return { start: 10 * 60, end: 15 * 60 };
  return { start: 9 * 60, end: 18 * 60 };
}

export function getDayPlan(key: string, et: EventType, all: Booking[]): Slot[] {
  const wh = workHours(key);
  if (!wh) return [];
  const dow = weekdayIndex(key);
  const step = et.duration === 15 ? 15 : 30;
  const now = key === todayKey() ? nowMinutes() : null;
  const dayBookings = all.filter((b) => b.date === key);
  const slots: Slot[] = [];

  for (let t = wh.start; t + et.duration <= wh.end; t += step) {
    const end = t + et.duration;
    const booking = dayBookings.find((b) => b.start < end && t < b.end);
    let status: SlotStatus;
    if (booking) status = 'booked';
    else if (dow <= 4 && t < LUNCH.end && end > LUNCH.start) status = 'lunch';
    else if (now !== null && end <= now) status = 'past';
    else status = 'free';
    slots.push({ start: t, end, status, booking });
  }
  return slots;
}

export const countFree = (key: string, et: EventType, all: Booking[]) =>
  getDayPlan(key, et, all).filter((s) => s.status === 'free').length;

export function nextAvailable(fromKey: string, et: EventType, all: Booking[]): string | null {
  let d = parseKey(fromKey);
  for (let i = 1; i <= 21; i++) {
    d = addDays(d, 1);
    const k = dateKey(d);
    if (countFree(k, et, all) > 0) return k;
  }
  return null;
}

export const busyIntervals = (key: string, all: Booking[]) =>
  all
    .filter((b) => b.date === key)
    .map((b) => ({ start: b.start, end: b.end, id: b.id }))
    .sort((a, b) => a.start - b.start);

/* ------------------------------------------------------------------ */
/*  Мелкие помощники                                                   */
/* ------------------------------------------------------------------ */

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const maskName = (name: string) => {
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0];
};
