import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logs/logger"
import type { BookingEvent } from "../event-bus"

/**
 * Dashboard Handler - consolidates all revalidatePath calls from booking functions
 * Maintains exact same cache invalidation behavior as current scattered calls
 */
export class DashboardHandler {
  
  /**
   * Handle booking.created event - replicates createBooking revalidatePath calls
   */
  async handleBookingCreated(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in createBooking function
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")
      revalidatePath("/dashboard/member/bookings")
      revalidatePath("/dashboard/admin/bookings")

      logger.info(`Dashboard paths revalidated for booking created: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for booking created:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.cancelled event - replicates cancelBooking revalidatePath calls
   */
  async handleBookingCancelled(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in cancelBooking function
      revalidatePath("/dashboard/member/book-treatment")
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/member/subscriptions")
      revalidatePath("/dashboard/member/gift-vouchers")

      logger.info(`Dashboard paths revalidated for booking cancelled: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for booking cancelled:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.confirmed event - replicates professionalAcceptBooking revalidatePath calls
   */
  async handleBookingConfirmed(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in professionalAcceptBooking function
      revalidatePath(`/dashboard/professional/booking-management/${event.bookingId}`)
      revalidatePath("/dashboard/admin/bookings")

      logger.info(`Dashboard paths revalidated for booking confirmed: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for booking confirmed:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.professional_assigned event - replicates assignProfessional revalidatePath calls
   */
  async handleProfessionalAssigned(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in assignProfessionalToBooking function
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath(`/dashboard/professional/booking-management/${event.bookingId}`)

      logger.info(`Dashboard paths revalidated for professional assigned: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for professional assigned:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.completed event - replicates professionalMarkCompleted revalidatePath calls
   */
  async handleBookingCompleted(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in professionalMarkCompleted function
      revalidatePath(`/dashboard/professional/booking-management/${event.bookingId}`)
      revalidatePath("/dashboard/admin/bookings")

      logger.info(`Dashboard paths revalidated for booking completed: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for booking completed:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.payment_updated event - replicates updateBookingStatusAfterPayment revalidatePath calls
   */
  async handlePaymentUpdated(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in updateBookingStatusAfterPayment function
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/member/bookings")

      logger.info(`Dashboard paths revalidated for payment updated: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for payment updated:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle admin booking updates - replicates updateBookingByAdmin revalidatePath calls
   */
  async handleAdminBookingUpdate(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in updateBookingByAdmin function
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/member/bookings")
      revalidatePath("/dashboard/professional/bookings")

      logger.info(`Dashboard paths revalidated for admin booking update: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for admin booking update:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Professional response handling - replicates professional SMS actions revalidatePath calls
   */
  async handleProfessionalResponse(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in professional-sms-actions
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath("/dashboard/professional/booking-management")

      logger.info(`Dashboard paths revalidated for professional response: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for professional response:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Review reminder sent - replicates review-actions revalidatePath calls
   */
  async handleReviewReminderSent(event: BookingEvent): Promise<void> {
    try {
      // Exact same revalidatePath calls as in review-actions
      revalidatePath("/dashboard/admin/bookings")

      logger.info(`Dashboard paths revalidated for review reminder sent: ${event.bookingId}`)
      
    } catch (error) {
      logger.error("Failed to revalidate dashboard paths for review reminder sent:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }
}

// Export singleton instance
export const dashboardHandler = new DashboardHandler() 