import { eventBus } from "./event-bus"
import { notificationHandler } from "./handlers/notification-handler"
import { dashboardHandler } from "./handlers/dashboard-handler"
import { logger } from "@/lib/logs/logger"

/**
 * Event System - registers all handlers and provides centralized event management
 * This maintains the exact same behavior as the current scattered logic
 * Supports both booking and gift voucher events
 */
class EventSystem {
  private isInitialized = false

  /**
   * Initialize the event system by registering all handlers
   * This is called once when the application starts
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.info("Event system already initialized")
      return
    }

    logger.info("Initializing event system...")

    // ===== BOOKING EVENT HANDLERS =====
    // Register notification handlers (replaces scattered notification logic)
    eventBus.on('booking.created', notificationHandler.handleBookingCreated.bind(notificationHandler))
    eventBus.on('booking.confirmed', notificationHandler.handleBookingConfirmed.bind(notificationHandler))
    eventBus.on('booking.professional_assigned', notificationHandler.handleProfessionalAssigned.bind(notificationHandler))
    eventBus.on('booking.completed', notificationHandler.handleBookingCompleted.bind(notificationHandler))
    eventBus.on('booking.cancelled', notificationHandler.handleBookingCancelled.bind(notificationHandler))

    // Register dashboard handlers (replaces scattered revalidatePath calls)
    eventBus.on('booking.created', dashboardHandler.handleBookingCreated.bind(dashboardHandler))
    eventBus.on('booking.cancelled', dashboardHandler.handleBookingCancelled.bind(dashboardHandler))
    eventBus.on('booking.confirmed', dashboardHandler.handleBookingConfirmed.bind(dashboardHandler))
    eventBus.on('booking.professional_assigned', dashboardHandler.handleProfessionalAssigned.bind(dashboardHandler))
    eventBus.on('booking.completed', dashboardHandler.handleBookingCompleted.bind(dashboardHandler))
    eventBus.on('booking.payment_updated', dashboardHandler.handlePaymentUpdated.bind(dashboardHandler))

    // ===== GIFT VOUCHER EVENT HANDLERS =====
    // Register gift voucher notification handlers
    eventBus.on('gift_voucher.created', notificationHandler.handleGiftVoucherCreated.bind(notificationHandler))
    eventBus.on('gift_voucher.updated', notificationHandler.handleGiftVoucherUpdated.bind(notificationHandler))
    eventBus.on('gift_voucher.deleted', notificationHandler.handleGiftVoucherDeleted.bind(notificationHandler))
    eventBus.on('gift_voucher.purchased', notificationHandler.handleGiftVoucherPurchased.bind(notificationHandler))
    eventBus.on('gift_voucher.redeemed', notificationHandler.handleGiftVoucherRedeemed.bind(notificationHandler))

    // Register gift voucher dashboard handlers
    eventBus.on('gift_voucher.created', dashboardHandler.handleGiftVoucherCreated.bind(dashboardHandler))
    eventBus.on('gift_voucher.updated', dashboardHandler.handleGiftVoucherUpdated.bind(dashboardHandler))
    eventBus.on('gift_voucher.deleted', dashboardHandler.handleGiftVoucherDeleted.bind(dashboardHandler))
    eventBus.on('gift_voucher.purchased', dashboardHandler.handleGiftVoucherPurchased.bind(dashboardHandler))
    eventBus.on('gift_voucher.redeemed', dashboardHandler.handleGiftVoucherRedeemed.bind(dashboardHandler))

    this.isInitialized = true
    logger.info("Event system initialized successfully - booking and gift voucher events registered")
  }

  /**
   * Check if the system is initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Get the event bus instance for emitting events
   */
  getEventBus() {
    if (!this.isInitialized) {
      logger.warn("Event system not initialized, initializing now...")
      this.initialize()
    }
    return eventBus
  }
}

// Export singleton instance
export const eventSystem = new EventSystem()

// Auto-initialize the system
eventSystem.initialize()

// Export the event bus for easy access
export { eventBus, createBookingEvent, createGiftVoucherEvent } from "./event-bus"
export type { BookingEvent, BookingEventType, GiftVoucherEvent, GiftVoucherEventType } from "./event-bus"

// Legacy export for backward compatibility
export const bookingEventSystem = eventSystem 