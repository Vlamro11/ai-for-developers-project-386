import type { components } from "./schema";

export type Slot = components["schemas"]["Slot"];
export type SlotStatus = components["schemas"]["SlotStatus"];
export type AvailabilityDay = components["schemas"]["AvailabilityDay"];
export type Booking = components["schemas"]["Booking"];
export type CreateBookingRequest = components["schemas"]["CreateBookingRequest"];
export type ApiError = components["schemas"]["Error"];

/** Базовый путь API. В dev проксируется Vite-девсервером, в проде — nginx. */
const BASE_URL = "/api";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, apiError: ApiError) {
    super(apiError.message);
    this.status = status;
    this.code = apiError.error;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      response.status,
      body ?? { error: "unknown_error", message: `Ошибка запроса: ${response.status}` },
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getAvailability(from: string, to: string): Promise<{
  from: string;
  to: string;
  days: AvailabilityDay[];
}> {
  const params = new URLSearchParams({ from, to });
  return request(`/availability?${params.toString()}`);
}

export function getSlots(date: string): Promise<{ date: string; slots: Slot[] }> {
  const params = new URLSearchParams({ date });
  return request(`/slots?${params.toString()}`);
}

export function createBooking(payload: CreateBookingRequest): Promise<Booking> {
  return request("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
