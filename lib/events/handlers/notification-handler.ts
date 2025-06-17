import { logger } from "@/lib/logs/logger"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { BookingEvent } from "../event-bus"
import type { NotificationLanguage } from "@/lib/notifications/notification-types"

// Import models for data access
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"

/**
 * Notification Handler - consolidates all notification logic from booking functions
 * Maintains exact same behavior as the current scattered notification code
 */
export class NotificationHandler {
  
  /**
   * Handle booking.created event - replicates createBooking notification logic
   */
  async handleBookingCreated(event: BookingEvent): Promise<void> {
    try {
      await dbConnect()
      
      const { booking } = event.data
      if (!booking) {
        logger.warn(`No booking data in event: ${event.bookingId}`)
        return
      }

      // Exact same logic as in createBooking function
      const userForNotification = await User.findById(booking.userId)
        .select("name email phone notificationPreferences")
        .lean()
      
      const treatment = await Treatment.findById(booking.treatmentId)
        .select("name")
        .lean()

      if (!userForNotification || !treatment) {
        logger.warn(`Missing user or treatment data for booking: ${event.bookingId}`)
        return
      }

      const lang = userForNotification.notificationPreferences?.language || "he"
      const methods = userForNotification.notificationPreferences?.methods || ["email"]
      const recipients: any[] = []

      if (methods.includes("email") && userForNotification.email) {
        recipients.push({ 
          type: "email", 
          value: userForNotification.email, 
          name: userForNotification.name, 
          language: lang 
        })
      }
      
      if (methods.includes("sms") && userForNotification.phone) {
        recipients.push({ 
          type: "phone", 
          value: userForNotification.phone, 
          language: lang 
        })
      }

      // Handle booking for someone else - exact same logic
      if (booking.recipientEmail && booking.recipientEmail !== userForNotification.email) {
        recipients.push({
          type: "email",
          value: booking.recipientEmail,
          name: booking.recipientName || "",
          language: lang,
        })
      }
      
      if (booking.recipientPhone && booking.recipientPhone !== userForNotification.phone) {
        recipients.push({
          type: "phone",
          value: booking.recipientPhone,
          language: lang,
        })
      }

      if (recipients.length > 0) {
        await unifiedNotificationService.sendTreatmentBookingSuccess(recipients, {
          recipientName: booking.recipientName || userForNotification.name,
          bookerName: userForNotification.name,
          treatmentName: treatment.name,
          bookingDateTime: booking.bookingDateTime,
          bookingNumber: booking.bookingNumber,
          bookingAddress: booking.bookingAddressSnapshot?.fullAddress || "",
          isForSomeoneElse: Boolean(
            booking.recipientName && booking.recipientName !== userForNotification.name
          ),
        })
      }

      logger.info(`Booking created notifications sent for: ${event.bookingId}`)
      
    } catch (error) {
      // Same error handling as current code - log but don't throw
      logger.error("Failed to send booking created notifications:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.professional_assigned event - replicates assignProfessional notification logic
   */
  async handleProfessionalAssigned(event: BookingEvent): Promise<void> {
    try {
      await dbConnect()
      
      const { booking, professionalId } = event.data
      if (!booking || !professionalId) {
        logger.warn(`Missing booking or professional data in event: ${event.bookingId}`)
        return
      }

      // Exact same logic as in assignProfessionalToBooking function
      const [clientUser, professional, treatment] = await Promise.all([
        User.findById(booking.userId).select("name email phone notificationPreferences").lean(),
        User.findById(professionalId).select("name email phone notificationPreferences").lean(),
        Treatment.findById(booking.treatmentId).select("name").lean(),
      ])

      if (!clientUser || !professional || !treatment) {
        logger.warn(`Missing user, professional or treatment data for booking: ${event.bookingId}`)
        return
      }

      // Client notification - exact same logic
      const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
      const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]

      const clientNotificationData = {
        type: "BOOKING_CONFIRMED_CLIENT",
        userName: clientUser.name || "לקוח/ה",
        professionalName: professional.name || "מטפל/ת",
        bookingDateTime: booking.bookingDateTime,
        treatmentName: treatment.name,
        bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/member/bookings?bookingId=${booking._id.toString()}`,
      }

      const clientRecipients = []
      if (clientNotificationMethods.includes("email") && clientUser.email) {
        clientRecipients.push({ type: "email" as const, value: clientUser.email, name: clientUser.name, language: clientLang })
      }
      if (clientNotificationMethods.includes("sms") && clientUser.phone) {
        clientRecipients.push({ type: "phone" as const, value: clientUser.phone, language: clientLang })
      }
      
      if (clientRecipients.length > 0) {
        await unifiedNotificationService.sendNotificationToMultiple(clientRecipients, clientNotificationData)
      }

      // Professional notification - exact same logic
      const professionalLang = (professional.notificationPreferences?.language as NotificationLanguage) || "he"
      const professionalNotificationMethods = professional.notificationPreferences?.methods || ["email"]

      const professionalNotificationData = {
        type: "BOOKING_ASSIGNED_PROFESSIONAL",
        professionalName: professional.name || "מטפל/ת",
        clientName: clientUser.name || "לקוח/ה",
        bookingDateTime: booking.bookingDateTime,
        treatmentName: treatment.name,
        bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/professional/booking-management/${booking._id.toString()}`,
      }

      const professionalRecipients = []
      if (professionalNotificationMethods.includes("email") && professional.email) {
        professionalRecipients.push({ type: "email" as const, value: professional.email, name: professional.name, language: professionalLang })
      }
      if (professionalNotificationMethods.includes("sms") && professional.phone) {
        professionalRecipients.push({ type: "phone" as const, value: professional.phone, language: professionalLang })
      }
      
      if (professionalRecipients.length > 0) {
        await unifiedNotificationService.sendNotificationToMultiple(professionalRecipients, professionalNotificationData)
      }

      logger.info(`Professional assigned notifications sent for: ${event.bookingId}`)
      
    } catch (error) {
      // Same error handling as current code
      logger.error("Failed to send professional assignment notifications:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.confirmed event - replicates professionalAcceptBooking notification logic
   */
  async handleBookingConfirmed(event: BookingEvent): Promise<void> {
    try {
      await dbConnect()
      
      const { booking, professionalId } = event.data
      if (!booking || !professionalId) {
        logger.warn(`Missing booking or professional data in event: ${event.bookingId}`)
        return
      }

      // Exact same logic as in professionalAcceptBooking function
      const clientUser = await User.findById(booking.userId)
        .select("name email phone notificationPreferences")
        .lean()
      const treatment = await Treatment.findById(booking.treatmentId).select("name").lean()
      const professional = await User.findById(professionalId).select("name").lean()

      if (!clientUser || !treatment || !professional) {
        logger.warn(`Missing user, treatment or professional data for booking: ${event.bookingId}`)
        return
      }

      const clientLang = (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
      const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["email"]

      const notificationData = {
        type: "BOOKING_CONFIRMED_CLIENT",
        userName: clientUser.name || "לקוח/ה",
        professionalName: professional.name || "מטפל/ת",
        bookingDateTime: booking.bookingDateTime,
        treatmentName: treatment.name,
        bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/member/bookings?bookingId=${booking._id.toString()}`,
      }

      const recipients = []
      if (clientNotificationMethods.includes("email") && clientUser.email) {
        recipients.push({ type: "email" as const, value: clientUser.email, name: clientUser.name, language: clientLang })
      }
      if (clientNotificationMethods.includes("sms") && clientUser.phone) {
        recipients.push({ type: "phone" as const, value: clientUser.phone, language: clientLang })
      }
      
      if (recipients.length > 0) {
        await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)
      }

      logger.info(`Booking confirmed notifications sent for: ${event.bookingId}`)
      
    } catch (error) {
      // Same error handling as current code
      logger.error("Failed to send booking confirmed notifications:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }

  /**
   * Handle booking.completed event - replicates review reminder sending
   */
  async handleBookingCompleted(event: BookingEvent): Promise<void> {
    try {
      // Send review reminder - exact same logic as current code
      const { sendReviewReminder } = await import("@/actions/review-actions")
      await sendReviewReminder(event.bookingId)
      
      logger.info(`Review reminder sent for completed booking: ${event.bookingId}`)
      
    } catch (error) {
      // Same error handling as current code
      logger.error("Failed to send review reminder:", {
        error: error instanceof Error ? error.message : String(error),
        bookingId: event.bookingId,
      })
    }
  }
}

// Export singleton instance
export const notificationHandler = new NotificationHandler() 