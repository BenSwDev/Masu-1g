import { eventBus } from "./event-bus"
import { notificationHandler } from "./handlers/notification-handler"
import { dashboardHandler } from "./handlers/dashboard-handler"
import { logger } from "@/lib/logs/logger"

/**
 * Booking Event System - registers all handlers and provides centralized event management
 * This maintains the exact same behavior as the current scattered logic
 */
class BookingEventSystem {
  private isInitialized = false

  /**
   * Initialize the event system by registering all handlers
   * This is called once when the application starts
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.info("Booking event system already initialized")
      return
    }

    logger.info("Initializing booking event system...")

    // Register notification handlers (replaces scattered notification logic)
    eventBus.on('booking.created', notificationHandler.handleBookingCreated.bind(notificationHandler))
    eventBus.on('booking.confirmed', notificationHandler.handleBookingConfirmed.bind(notificationHandler))
    eventBus.on('booking.professional_assigned', notificationHandler.handleProfessionalAssigned.bind(notificationHandler))
    eventBus.on('booking.completed', notificationHandler.handleBookingCompleted.bind(notificationHandler))

    // Register dashboard handlers (replaces scattered revalidatePath calls)
    eventBus.on('booking.created', dashboardHandler.handleBookingCreated.bind(dashboardHandler))
    eventBus.on('booking.cancelled', dashboardHandler.handleBookingCancelled.bind(dashboardHandler))
    eventBus.on('booking.confirmed', dashboardHandler.handleBookingConfirmed.bind(dashboardHandler))
    eventBus.on('booking.professional_assigned', dashboardHandler.handleProfessionalAssigned.bind(dashboardHandler))
    eventBus.on('booking.completed', dashboardHandler.handleBookingCompleted.bind(dashboardHandler))
    eventBus.on('booking.payment_updated', dashboardHandler.handlePaymentUpdated.bind(dashboardHandler))

    this.isInitialized = true
    logger.info("Booking event system initialized successfully")
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
export const bookingEventSystem = new BookingEventSystem()

// Auto-initialize the system
bookingEventSystem.initialize()

// Export the event bus for easy access
export { eventBus, createBookingEvent } from "./event-bus"
export type { BookingEvent, BookingEventType } from "./event-bus" 