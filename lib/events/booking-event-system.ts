import { eventBus } from "./event-bus"
import { notificationHandler } from "./handlers/notification-handler"
import { dashboardHandler } from "./handlers/dashboard-handler"
import { logger } from "@/lib/logs/logger"

/**
 * Comprehensive Event System - registers all handlers and provides centralized event management
 * This maintains the exact same behavior as the current scattered logic
 * Supports booking, gift voucher, user, subscription, transaction, professional, and admin events
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

    logger.info("Initializing comprehensive event system...")

    // ===== BOOKING EVENT HANDLERS =====
    this.registerBookingHandlers()
    
    // ===== GIFT VOUCHER EVENT HANDLERS =====
    this.registerGiftVoucherHandlers()
    
    // ===== USER EVENT HANDLERS =====
    this.registerUserHandlers()
    
    // ===== SUBSCRIPTION EVENT HANDLERS =====
    this.registerSubscriptionHandlers()
    
    // ===== TRANSACTION/PAYMENT EVENT HANDLERS =====
    this.registerTransactionHandlers()
    
    // ===== PROFESSIONAL EVENT HANDLERS =====
    this.registerProfessionalHandlers()
    
    // ===== TREATMENT EVENT HANDLERS =====
    this.registerTreatmentHandlers()
    
    // ===== REVIEW EVENT HANDLERS =====
    this.registerReviewHandlers()
    
    // ===== ADMIN EVENT HANDLERS =====
    this.registerAdminHandlers()

    this.isInitialized = true
    logger.info("Comprehensive event system initialized successfully - all event types registered")
  }

  private registerBookingHandlers(): void {
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

    logger.debug("Booking event handlers registered")
  }

  private registerGiftVoucherHandlers(): void {
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

    logger.debug("Gift voucher event handlers registered")
  }

  private registerUserHandlers(): void {
    // User registration and authentication events
    eventBus.on('user.registered', notificationHandler.handleUserRegistered.bind(notificationHandler))
    eventBus.on('user.login', notificationHandler.handleUserLogin.bind(notificationHandler))
    eventBus.on('user.password_reset_requested', notificationHandler.handlePasswordResetRequested.bind(notificationHandler))
    eventBus.on('user.password_reset_completed', notificationHandler.handlePasswordResetCompleted.bind(notificationHandler))
    eventBus.on('user.email_verified', notificationHandler.handleEmailVerified.bind(notificationHandler))
    eventBus.on('user.phone_verified', notificationHandler.handlePhoneVerified.bind(notificationHandler))
    eventBus.on('user.email_change_requested', notificationHandler.handleEmailChangeRequested.bind(notificationHandler))

    // User dashboard handlers
    eventBus.on('user.profile_updated', dashboardHandler.handleUserProfileUpdated.bind(dashboardHandler))
    eventBus.on('user.role_changed', dashboardHandler.handleUserRoleChanged.bind(dashboardHandler))
    eventBus.on('user.deleted', dashboardHandler.handleUserDeleted.bind(dashboardHandler))

    logger.debug("User event handlers registered")
  }

  private registerSubscriptionHandlers(): void {
    // Subscription lifecycle events
    eventBus.on('subscription.purchased', notificationHandler.handleSubscriptionPurchased.bind(notificationHandler))
    eventBus.on('subscription.activated', notificationHandler.handleSubscriptionActivated.bind(notificationHandler))
    eventBus.on('subscription.used', notificationHandler.handleSubscriptionUsed.bind(notificationHandler))
    eventBus.on('subscription.expired', notificationHandler.handleSubscriptionExpired.bind(notificationHandler))
    eventBus.on('subscription.cancelled', notificationHandler.handleSubscriptionCancelled.bind(notificationHandler))

    // Subscription dashboard handlers
    eventBus.on('subscription.purchased', dashboardHandler.handleSubscriptionPurchased.bind(dashboardHandler))
    eventBus.on('subscription.activated', dashboardHandler.handleSubscriptionActivated.bind(dashboardHandler))
    eventBus.on('subscription.expired', dashboardHandler.handleSubscriptionExpired.bind(dashboardHandler))
    eventBus.on('subscription.cancelled', dashboardHandler.handleSubscriptionCancelled.bind(dashboardHandler))

    logger.debug("Subscription event handlers registered")
  }

  private registerTransactionHandlers(): void {
    // Transaction and payment events
    eventBus.on('transaction.created', notificationHandler.handleTransactionCreated.bind(notificationHandler))
    eventBus.on('transaction.completed', notificationHandler.handleTransactionCompleted.bind(notificationHandler))
    eventBus.on('transaction.failed', notificationHandler.handleTransactionFailed.bind(notificationHandler))
    eventBus.on('transaction.refunded', notificationHandler.handleTransactionRefunded.bind(notificationHandler))

    // Payment method events
    eventBus.on('payment.method_added', notificationHandler.handlePaymentMethodAdded.bind(notificationHandler))
    eventBus.on('payment.method_updated', notificationHandler.handlePaymentMethodUpdated.bind(notificationHandler))
    eventBus.on('payment.method_deleted', notificationHandler.handlePaymentMethodDeleted.bind(notificationHandler))

    // Transaction dashboard handlers
    eventBus.on('transaction.completed', dashboardHandler.handleTransactionCompleted.bind(dashboardHandler))
    eventBus.on('transaction.failed', dashboardHandler.handleTransactionFailed.bind(dashboardHandler))
    eventBus.on('transaction.refunded', dashboardHandler.handleTransactionRefunded.bind(dashboardHandler))

    logger.debug("Transaction and payment event handlers registered")
  }

  private registerProfessionalHandlers(): void {
    // Professional lifecycle events
    eventBus.on('professional.profile_created', notificationHandler.handleProfessionalProfileCreated.bind(notificationHandler))
    eventBus.on('professional.profile_updated', notificationHandler.handleProfessionalProfileUpdated.bind(notificationHandler))
    eventBus.on('professional.verified', notificationHandler.handleProfessionalVerified.bind(notificationHandler))
    eventBus.on('professional.payment_received', notificationHandler.handleProfessionalPaymentReceived.bind(notificationHandler))
    eventBus.on('professional.review_received', notificationHandler.handleProfessionalReviewReceived.bind(notificationHandler))

    // Professional dashboard handlers
    eventBus.on('professional.profile_created', dashboardHandler.handleProfessionalProfileCreated.bind(dashboardHandler))
    eventBus.on('professional.profile_updated', dashboardHandler.handleProfessionalProfileUpdated.bind(dashboardHandler))
    eventBus.on('professional.verified', dashboardHandler.handleProfessionalVerified.bind(dashboardHandler))
    eventBus.on('professional.availability_updated', dashboardHandler.handleProfessionalAvailabilityUpdated.bind(dashboardHandler))

    logger.debug("Professional event handlers registered")
  }

  private registerTreatmentHandlers(): void {
    // Treatment management events
    eventBus.on('treatment.created', notificationHandler.handleTreatmentCreated.bind(notificationHandler))
    eventBus.on('treatment.updated', notificationHandler.handleTreatmentUpdated.bind(notificationHandler))
    eventBus.on('treatment.deleted', notificationHandler.handleTreatmentDeleted.bind(notificationHandler))
    eventBus.on('treatment.price_updated', notificationHandler.handleTreatmentPriceUpdated.bind(notificationHandler))

    // Treatment dashboard handlers
    eventBus.on('treatment.created', dashboardHandler.handleTreatmentCreated.bind(dashboardHandler))
    eventBus.on('treatment.updated', dashboardHandler.handleTreatmentUpdated.bind(dashboardHandler))
    eventBus.on('treatment.deleted', dashboardHandler.handleTreatmentDeleted.bind(dashboardHandler))
    eventBus.on('treatment.price_updated', dashboardHandler.handleTreatmentPriceUpdated.bind(dashboardHandler))

    logger.debug("Treatment event handlers registered")
  }

  private registerReviewHandlers(): void {
    // Review events
    eventBus.on('review.created', notificationHandler.handleReviewCreated.bind(notificationHandler))
    eventBus.on('review.updated', notificationHandler.handleReviewUpdated.bind(notificationHandler))
    eventBus.on('review.deleted', notificationHandler.handleReviewDeleted.bind(notificationHandler))
    eventBus.on('review.reminder_sent', notificationHandler.handleReviewReminderSent.bind(notificationHandler))

    // Review dashboard handlers
    eventBus.on('review.created', dashboardHandler.handleReviewCreated.bind(dashboardHandler))
    eventBus.on('review.updated', dashboardHandler.handleReviewUpdated.bind(dashboardHandler))
    eventBus.on('review.deleted', dashboardHandler.handleReviewDeleted.bind(dashboardHandler))

    logger.debug("Review event handlers registered")
  }

  private registerAdminHandlers(): void {
    // Admin events
    eventBus.on('admin.user_created', notificationHandler.handleAdminUserCreated.bind(notificationHandler))
    eventBus.on('admin.professional_approved', notificationHandler.handleAdminProfessionalApproved.bind(notificationHandler))
    eventBus.on('admin.professional_rejected', notificationHandler.handleAdminProfessionalRejected.bind(notificationHandler))

    // Admin dashboard handlers
    eventBus.on('admin.user_created', dashboardHandler.handleAdminUserCreated.bind(dashboardHandler))
    eventBus.on('admin.professional_approved', dashboardHandler.handleAdminProfessionalApproved.bind(dashboardHandler))
    eventBus.on('admin.professional_rejected', dashboardHandler.handleAdminProfessionalRejected.bind(dashboardHandler))
    eventBus.on('admin.system_backup', dashboardHandler.handleAdminSystemBackup.bind(dashboardHandler))
    eventBus.on('admin.data_export', dashboardHandler.handleAdminDataExport.bind(dashboardHandler))

    logger.debug("Admin event handlers registered")
  }

  /**
   * Get stats about registered handlers
   */
  getStats(): Record<string, number> {
    const allEventTypes = [
      // Booking events
      'booking.created', 'booking.confirmed', 'booking.cancelled', 'booking.completed', 
      'booking.professional_assigned', 'booking.payment_updated',
      
      // Gift voucher events
      'gift_voucher.created', 'gift_voucher.updated', 'gift_voucher.deleted', 
      'gift_voucher.purchased', 'gift_voucher.redeemed',
      
      // User events
      'user.registered', 'user.login', 'user.logout', 'user.profile_updated',
      'user.password_reset_requested', 'user.password_reset_completed',
      'user.email_verified', 'user.phone_verified', 'user.email_change_requested',
      'user.role_changed', 'user.deleted',
      
      // Subscription events
      'subscription.purchased', 'subscription.activated', 'subscription.used',
      'subscription.expired', 'subscription.cancelled', 'subscription.renewed',
      
      // Transaction events
      'transaction.created', 'transaction.completed', 'transaction.failed', 'transaction.refunded',
      'payment.method_added', 'payment.method_updated', 'payment.method_deleted',
      
      // Professional events
      'professional.profile_created', 'professional.profile_updated', 'professional.verified',
      'professional.payment_received', 'professional.review_received', 'professional.availability_updated',
      
      // Treatment events
      'treatment.created', 'treatment.updated', 'treatment.deleted', 'treatment.price_updated',
      
      // Review events
      'review.created', 'review.updated', 'review.deleted', 'review.reminder_sent',
      
      // Admin events
      'admin.user_created', 'admin.professional_approved', 'admin.professional_rejected',
      'admin.system_backup', 'admin.data_export'
    ]

    const stats: Record<string, number> = {}
    allEventTypes.forEach(eventType => {
      stats[eventType] = eventBus.getHandlerCount(eventType as any)
    })

    return stats
  }
}

// Export singleton instance
export const eventSystem = new EventSystem()

// Auto-initialize when imported
eventSystem.initialize()

// Export the event bus for direct access
export { eventBus, createBookingEvent, createGiftVoucherEvent } from "./event-bus"

// Export all new event creators
export {
  createUserEvent,
  createSubscriptionEvent,
  createTransactionEvent,
  createProfessionalEvent,
  createTreatmentEvent,
  createReviewEvent,
  createAdminEvent
} from "./event-bus" 