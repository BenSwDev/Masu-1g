/**
 * Booking Event System
 * Provides a simple event bus for booking-related events
 */

export interface BookingEvent {
  type: string
  bookingId: string
  userId: string
  data?: any
  timestamp: Date
}

class BookingEventBus {
  private listeners: Map<string, Array<(event: BookingEvent) => Promise<void>>> = new Map()

  async emit(event: BookingEvent): Promise<void> {
    const eventListeners = this.listeners.get(event.type) || []
    
    // Execute all listeners for this event type
    await Promise.allSettled(
      eventListeners.map(listener => listener(event))
    )
  }

  on(eventType: string, listener: (event: BookingEvent) => Promise<void>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }

  off(eventType: string, listener: (event: BookingEvent) => Promise<void>): void {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }
}

export const eventBus = new BookingEventBus()

export function createBookingEvent(
  type: string,
  bookingId: string,
  userId: string,
  data?: any
): BookingEvent {
  return {
    type,
    bookingId,
    userId,
    data,
    timestamp: new Date()
  }
} 