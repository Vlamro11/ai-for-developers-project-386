export interface BookingInfo {
  guestName: string;
  guestContact: string;
  comment?: string;
  bookedAt: string;
}

export interface Slot {
  id: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  isBooked: boolean;
  booking?: BookingInfo;
}

export type UserRole = 'guest' | 'owner';

export interface CreateSlotDto {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
}

export interface CreateBookingDto {
  slotId: string;
  guestName: string;
  guestContact: string;
  comment?: string;
}
