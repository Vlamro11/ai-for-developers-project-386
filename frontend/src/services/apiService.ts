import type { Slot, CreateBookingDto, CreateSlotDto } from '../types';
import { addDays, format, setHours, setMinutes, parseISO } from 'date-fns';

const API_BASE_URL = '/api';

// Initial local slots generator for fallback / frontend standalone testing
export function generateDefaultSlots(): Slot[] {
  const slots: Slot[] = [];
  const today = new Date();
  
  // Generate slots for next 14 days
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const currentDay = addDays(today, dayOffset);
    
    // Working hours: 10:00 to 18:00
    const startHour = 10;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min of [0, 30]) {
        const slotStart = setMinutes(setHours(currentDay, hour), min);
        const slotEnd = setMinutes(setHours(currentDay, min === 0 ? hour : hour + 1), min === 0 ? 30 : 0);
        
        const id = `slot-${format(slotStart, 'yyyyMMdd-HHmm')}`;
        
        // Demo: mark a couple of slots as booked on day 0 and day 1
        const isDemoBooked = (dayOffset === 0 && hour === 11 && min === 0) || 
                             (dayOffset === 1 && hour === 14 && min === 30);

        slots.push({
          id,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          isBooked: isDemoBooked,
          booking: isDemoBooked ? {
            guestName: min === 0 ? 'Алексей Смирнов' : 'Мария Иванова',
            guestContact: min === 0 ? '@alex_smirnov' : 'maria@example.com',
            comment: 'Обсуждение деталей проекта',
            bookedAt: new Date().toISOString()
          } : undefined
        });
      }
    }
  }
  return slots;
}

// Local Storage Helper
const STORAGE_KEY = 'hexlet_calls_slots';

function getLocalSlots(): Slot[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const defaultSlots = generateDefaultSlots();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSlots));
    return defaultSlots;
  }
  try {
    return JSON.parse(data);
  } catch {
    const defaultSlots = generateDefaultSlots();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSlots));
    return defaultSlots;
  }
}

function saveLocalSlots(slots: Slot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

// API methods with fallback
export async function fetchSlots(): Promise<Slot[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/slots`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to local storage
  }
  return getLocalSlots();
}

export async function createBooking(dto: CreateBookingDto): Promise<Slot> {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (res.ok) {
      return await res.json();
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Ошибка при бронировании');
    }
  } catch (e: any) {
    if (e.message && e.message !== 'Failed to fetch') {
      throw e;
    }
    // Fallback local logic
    const slots = getLocalSlots();
    const slotIndex = slots.findIndex(s => s.id === dto.slotId);
    if (slotIndex === -1) throw new Error('Слот не найден');
    if (slots[slotIndex].isBooked) throw new Error('Этот слот уже забронирован!');

    slots[slotIndex] = {
      ...slots[slotIndex],
      isBooked: true,
      booking: {
        guestName: dto.guestName,
        guestContact: dto.guestContact,
        comment: dto.comment,
        bookedAt: new Date().toISOString()
      }
    };
    saveLocalSlots(slots);
    return slots[slotIndex];
  }
}

export async function createSlot(dto: CreateSlotDto): Promise<Slot> {
  try {
    const res = await fetch(`${API_BASE_URL}/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback local logic
  }
  const slots = getLocalSlots();
  const [hour, min] = dto.startTime.split(':').map(Number);
  const baseDate = parseISO(dto.date);
  const start = setMinutes(setHours(baseDate, hour), min);
  const end = setMinutes(setHours(baseDate, min === 0 ? hour : hour + 1), min === 0 ? 30 : 0);
  
  const newSlot: Slot = {
    id: `slot-${format(start, 'yyyyMMdd-HHmm')}`,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isBooked: false
  };

  if (slots.some(s => s.id === newSlot.id)) {
    throw new Error('Слот на это время уже существует');
  }

  slots.push(newSlot);
  saveLocalSlots(slots);
  return newSlot;
}

export async function resetSlots(): Promise<void> {
  const defaultSlots = generateDefaultSlots();
  saveLocalSlots(defaultSlots);
}
