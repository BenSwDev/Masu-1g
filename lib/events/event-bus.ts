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

// NEW: User Management Events
export type UserEventType = 
  | 'user.registered'
  | 'user.login'
  | 'user.logout'
  | 'user.profile_updated'
  | 'user.password_reset_requested'
  | 'user.password_reset_completed'
  | 'user.email_verified'
  | 'user.phone_verified'
  | 'user.email_change_requested'
  | 'user.role_changed'
  | 'user.deleted'

// NEW: Subscription Events
export type SubscriptionEventType =
  | 'subscription.purchased'
  | 'subscription.activated'
  | 'subscription.used'
  | 'subscription.expired'
  | 'subscription.cancelled'
  | 'subscription.renewed'

// NEW: Transaction/Payment Events
export type TransactionEventType =
  | 'transaction.created'
  | 'transaction.completed'
  | 'transaction.failed'
  | 'transaction.refunded'
  | 'payment.method_added'
  | 'payment.method_updated'
  | 'payment.method_deleted'

// NEW: Professional Events
export type ProfessionalEventType =
  | 'professional.profile_created'
  | 'professional.profile_updated'
  | 'professional.verified'
  | 'professional.payment_received'
  | 'professional.review_received'
  | 'professional.availability_updated'

// NEW: Treatment/Service Events
export type TreatmentEventType =
  | 'treatment.created'
  | 'treatment.updated'
  | 'treatment.deleted'
  | 'treatment.price_updated'

// NEW: Review Events
export type ReviewEventType =
  | 'review.created'
  | 'review.updated'
  | 'review.deleted'
  | 'review.reminder_sent'

// NEW: Admin/System Events
export type AdminEventType =
  | 'admin.user_created'
  | 'admin.professional_approved'
  | 'admin.professional_rejected'
  | 'admin.system_backup'
  | 'admin.data_export'

// Union of all event types
export type EventType = 
  | BookingEventType 
  | GiftVoucherEventType
  | UserEventType
  | SubscriptionEventType
  | TransactionEventType
  | ProfessionalEventType
  | TreatmentEventType
  | ReviewEventType
  | AdminEventType

// Base Event interface with common properties
export interface BaseEvent {
  type: EventType
  timestamp: Date
  userId?: string
  data: Record<string, any>
  metadata?: {
    source?: string
    userAgent?: string
    ip?: string
  }
}

// Booking Events
export interface BookingEvent extends BaseEvent {
  type: BookingEventType
  bookingId: string
  userId: string
}

// Gift Voucher Events
export interface GiftVoucherEvent extends BaseEvent {
  type: GiftVoucherEventType
  voucherId: string
  userId?: string // Optional for guest purchases
}

// NEW: User Events
export interface UserEvent extends BaseEvent {
  type: UserEventType
  userId: string
  data: {
    oldData?: any
    newData?: any
    [key: string]: any
  }
}

// NEW: Subscription Events
export interface SubscriptionEvent extends BaseEvent {
  type: SubscriptionEventType
  subscriptionId: string
  userId: string
  data: {
    subscription?: any
    treatmentId?: string
    quantity?: number
    [key: string]: any
  }
}

// NEW: Transaction Events
export interface TransactionEvent extends BaseEvent {
  type: TransactionEventType
  transactionId: string
  userId: string
  data: {
    amount?: number
    currency?: string
    paymentMethod?: any
    status?: string
    [key: string]: any
  }
}

// NEW: Professional Events
export interface ProfessionalEvent extends BaseEvent {
  type: ProfessionalEventType
  professionalId: string
  userId: string
}

// NEW: Treatment Events
export interface TreatmentEvent extends BaseEvent {
  type: TreatmentEventType
  treatmentId: string
  data: {
    treatment?: any
    oldPrice?: number
    newPrice?: number
    [key: string]: any
  }
}

// NEW: Review Events
export interface ReviewEvent extends BaseEvent {
  type: ReviewEventType
  reviewId: string
  userId: string
  data: {
    bookingId?: string
    professionalId?: string
    rating?: number
    [key: string]: any
  }
}

// NEW: Admin Events
export interface AdminEvent extends BaseEvent {
  type: AdminEventType
  adminId: string
  data: {
    targetUserId?: string
    action?: string
    [key: string]: any
  }
}

// Event handler type
export type EventHandler<T = BaseEvent> = (event: T) => Promise<void> | void

/**
 * Event Bus - handles all system events
 * Centralized event management for the entire application
 */
export class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map()

  /**
   * Register an event handler for a specific event type
   */
  on<T extends BaseEvent>(eventType: EventType, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler as EventHandler)
    logger.debug(`Event handler registered for: ${eventType}`)
  }

  /**
   * Remove an event handler
   */
  off(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
        logger.debug(`Event handler removed for: ${eventType}`)
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: BaseEvent): Promise<void> {
    const handlers = this.handlers.get(event.type)
    if (!handlers || handlers.length === 0) {
      logger.debug(`No handlers registered for event: ${event.type}`)
      return
    }

    logger.info(`Emitting event: ${event.type}`, {
      handlersCount: handlers.length,
      timestamp: event.timestamp
    })

    // Execute all handlers in parallel
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event)
      } catch (error) {
        logger.error(`Event handler failed for ${event.type}:`, {
          error: error instanceof Error ? error.message : String(error),
          handlerName: handler.name
        })
        // Don't throw - other handlers should continue
      }
    })

    await Promise.all(promises)
  }

  /**
   * Get number of handlers for an event type
   */
  getHandlerCount(eventType: EventType): number {
    return this.handlers.get(eventType)?.length || 0
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear()
    logger.debug("All event handlers cleared")
  }
}

// Singleton event bus instance
export const eventBus = new EventBus()

// ===== EVENT CREATORS =====

/**
 * Create a booking event
 */
export function createBookingEvent(
  type: BookingEventType,
  bookingId: string,
  userId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): BookingEvent {
  return {
    type,
    bookingId,
    userId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create a gift voucher event
 */
export function createGiftVoucherEvent(
  type: GiftVoucherEventType,
  voucherId: string,
  userId: string | undefined,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): GiftVoucherEvent {
  return {
    type,
    voucherId,
    userId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create a user event
 */
export function createUserEvent(
  type: UserEventType,
  userId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): UserEvent {
  return {
    type,
    userId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create a subscription event
 */
export function createSubscriptionEvent(
  type: SubscriptionEventType,
  subscriptionId: string,
  userId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): SubscriptionEvent {
  return {
    type,
    subscriptionId,
    userId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create a transaction event
 */
export function createTransactionEvent(
  type: TransactionEventType,
  transactionId: string,
  userId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): TransactionEvent {
  return {
    type,
    transactionId,
    userId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create a professional event
 */
export function createProfessionalEvent(
  type: ProfessionalEventType,
  professionalId: string,
  userId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): ProfessionalEvent {
  return {
    type,
    professionalId,
    userId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create a treatment event
 */
export function createTreatmentEvent(
  type: TreatmentEventType,
  treatmentId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): TreatmentEvent {
  return {
    type,
    treatmentId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create a review event
 */
export function createReviewEvent(
  type: ReviewEventType,
  reviewId: string,
  userId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): ReviewEvent {
  return {
    type,
    reviewId,
    userId,
    timestamp: new Date(),
    data,
    metadata
  }
}

/**
 * Create an admin event
 */
export function createAdminEvent(
  type: AdminEventType,
  adminId: string,
  data: Record<string, any> = {},
  metadata?: BaseEvent['metadata']
): AdminEvent {
  return {
    type,
    adminId,
    timestamp: new Date(),
    data,
    metadata
  }
} 