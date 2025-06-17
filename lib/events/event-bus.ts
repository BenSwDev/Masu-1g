import { logger } from "@/lib/logs/logger"

// Event types that match current booking states and actions
export type BookingEventType = 
  | 'booking.created'
  | 'booking.confirmed' 
  | 'booking.cancelled'
  | 'booking.completed'
  | 'booking.professional_assigned'
  | 'booking.payment_updated'

// Gift Voucher Event types
export type GiftVoucherEventType =
  | 'gift_voucher.created'
  | 'gift_voucher.updated'
  | 'gift_voucher.deleted'
  | 'gift_voucher.purchased'
  | 'gift_voucher.redeemed'

export type EventType = BookingEventType | GiftVoucherEventType

// Event data structure
export interface BookingEvent {
  type: BookingEventType
  bookingId: string
  userId: string
  data: any // The booking object and related data
  timestamp: Date
  metadata?: Record<string, any>
}

// Gift Voucher Event data structure
export interface GiftVoucherEvent {
  type: GiftVoucherEventType
  voucherId: string
  userId: string
  data: any // The voucher object and related data
  timestamp: Date
  metadata?: Record<string, any>
}

// Union type for all events
export type Event = BookingEvent | GiftVoucherEvent

// Handler function types
export type BookingEventHandler = (event: BookingEvent) => Promise<void>
export type GiftVoucherEventHandler = (event: GiftVoucherEvent) => Promise<void>
export type EventHandler = BookingEventHandler | GiftVoucherEventHandler

// Event bus class
class EventBus {
  private handlers = new Map<EventType, EventHandler[]>()

  // Register an event handler  
  on(eventType: EventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
    logger.info(`Event handler registered for: ${eventType}`)
  }

  // Remove an event handler
  off(eventType: EventType, handler: EventHandler): void {
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
  async emit(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.type) || []
    
    if (handlers.length === 0) {
      logger.info(`No handlers registered for event: ${event.type}`)
      return
    }

    const entityId = 'bookingId' in event ? event.bookingId : event.voucherId
    logger.info(`Emitting event: ${event.type} for entity: ${entityId}`)

    // Execute all handlers in parallel (current behavior is mostly parallel)
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event as any) // Type assertion needed for union types
        logger.info(`Handler completed successfully for event: ${event.type}`)
      } catch (error) {
        // Log error but don't throw - matches current behavior where individual 
        // notification failures don't break the main flow
        logger.error(`Handler failed for event: ${event.type}`, { 
          error: error instanceof Error ? error.message : String(error),
          entityId 
        })
      }
    })

    await Promise.allSettled(promises)
    logger.info(`All handlers processed for event: ${event.type}`)
  }

  // Get current handlers (for debugging)
  getHandlers(eventType?: EventType): Map<EventType, EventHandler[]> | EventHandler[] {
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

// Helper function to create gift voucher events
export function createGiftVoucherEvent(
  type: GiftVoucherEventType,
  voucherId: string,
  userId: string,
  data: any,
  metadata?: Record<string, any>
): GiftVoucherEvent {
  return {
    type,
    voucherId,
    userId,
    data,
    timestamp: new Date(),
    metadata
  }
} 