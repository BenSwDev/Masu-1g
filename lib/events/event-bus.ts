import { logger } from "@/lib/logs/logger"

// Event types that match current booking states and actions
export type BookingEventType = 
  | 'booking.created'
  | 'booking.confirmed' 
  | 'booking.cancelled'
  | 'booking.completed'
  | 'booking.professional_assigned'
  | 'booking.payment_updated'

// Event data structure
export interface BookingEvent {
  type: BookingEventType
  bookingId: string
  userId: string
  data: any // The booking object and related data
  timestamp: Date
  metadata?: Record<string, any>
}

// Handler function type
export type EventHandler = (event: BookingEvent) => Promise<void>

// Event bus class
class EventBus {
  private handlers = new Map<BookingEventType, EventHandler[]>()

  // Register an event handler
  on(eventType: BookingEventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
    logger.info(`Event handler registered for: ${eventType}`)
  }

  // Remove an event handler
  off(eventType: BookingEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
        logger.info(`Event handler removed for: ${eventType}`)
      }
    }
  }

  // Emit an event to all registered handlers
  async emit(event: BookingEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || []
    
    if (handlers.length === 0) {
      logger.info(`No handlers registered for event: ${event.type}`)
      return
    }

    logger.info(`Emitting event: ${event.type} for booking: ${event.bookingId}`)

    // Execute all handlers in parallel (current behavior is mostly parallel)
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event)
        logger.info(`Handler completed successfully for event: ${event.type}`)
      } catch (error) {
        // Log error but don't throw - matches current behavior where individual 
        // notification failures don't break the main flow
        logger.error(`Handler failed for event: ${event.type}`, { 
          error: error instanceof Error ? error.message : String(error),
          bookingId: event.bookingId 
        })
      }
    })

    await Promise.allSettled(promises)
    logger.info(`All handlers processed for event: ${event.type}`)
  }

  // Get current handlers (for debugging)
  getHandlers(eventType?: BookingEventType): Map<BookingEventType, EventHandler[]> | EventHandler[] {
    if (eventType) {
      return this.handlers.get(eventType) || []
    }
    return this.handlers
  }
}

// Export singleton instance
export const eventBus = new EventBus()

// Helper function to create booking events
export function createBookingEvent(
  type: BookingEventType,
  bookingId: string,
  userId: string,
  data: any,
  metadata?: Record<string, any>
): BookingEvent {
  return {
    type,
    bookingId,
    userId,
    data,
    timestamp: new Date(),
    metadata
  }
} 