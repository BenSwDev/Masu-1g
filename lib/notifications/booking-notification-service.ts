import { NotificationManager } from './notification-manager'
import { EmailService } from './email-service'
import { SMSService } from './sms-service'
import { logger } from '@/lib/logs/logger'
import dbConnect from '@/lib/db/mongoose'
import User from '@/lib/db/models/user'
import Booking from '@/lib/db/models/booking'
import Treatment from '@/lib/db/models/treatment'
import ProfessionalProfile from '@/lib/db/models/professional-profile'
import { eventBus, createBookingEvent } from '@/lib/events/booking-event-system'
import type { 
  NotificationRecipient,
  EmailRecipient,
  PhoneRecipient,
  NotificationResult,
  NotificationLanguage
} from './notification-types'

export type BookingNotificationType = 
  | "booking_created"
  | "booking_confirmed"
  | "booking_assignment"
  | "booking_reminder"
  | "professional_notification"
  | "professional_reminder"
  | "status_update"
  | "review_request"
  | "review_reminder"
  | "admin_alert"

export interface BookingNotificationData {
  type: BookingNotificationType
  bookingId: string
  recipientId: string
  recipientType: "client" | "professional" | "admin"
  language?: NotificationLanguage
  customMessage?: string
  metadata?: Record<string, any>
}

/**
 * שירות הודעות מתקדם למחזור חיי ההזמנות
 * מטפל בכל סוגי ההודעות הקשורות להזמנות ומטפלים
 */
export class BookingNotificationService {
  private notificationManager: NotificationManager
  
  constructor() {
    this.notificationManager = new NotificationManager()
  }

  /**
   * שליחת הודעה על יצירת הזמנה חדשה
   */
  async sendBookingCreated(bookingId: string, userId: string): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const booking = await Booking.findById(bookingId)
        .populate('treatmentId')
        .populate('userId')
        .lean()
        
      if (!booking) {
        throw new Error("הזמנה לא נמצאה")
      }

      const user = booking.userId as any
      if (!user) {
        throw new Error("משתמש לא נמצא")
      }

      const recipients = await this.getUserNotificationRecipients(user, ["email", "sms"])
      
      const notificationData = {
        type: "booking_created" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          recipientName: user.name,
          address: booking.bookingAddressSnapshot?.fullAddress || "לא מוגדר",
          status: booking.status,
          finalAmount: booking.priceDetails?.finalAmount || 0
        }
      }

      const results = await this.sendMultiChannelNotification(recipients, notificationData)
      
      // שמירת לוג
      await this.logNotification("booking_created", bookingId, userId, results)
      
      return results
      
    } catch (error) {
      logger.error("Error sending booking created notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת הודעה על אישור הזמנה
   */
  async sendBookingConfirmation(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const [booking, professional] = await Promise.all([
        Booking.findById(bookingId)
          .populate('treatmentId')
          .populate('userId')
          .lean(),
        ProfessionalProfile.findOne({ userId: professionalId })
          .populate('userId')
          .lean()
      ])

      if (!booking || !professional) {
        throw new Error("הזמנה או מטפל לא נמצאו")
      }

      const client = booking.userId as any
      const professionalUser = professional.userId as any

      // הודעה ללקוח
      const clientRecipients = await this.getUserNotificationRecipients(client, ["email", "sms"])
      const clientNotificationData = {
        type: "booking_confirmed" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          professionalName: professionalUser.name,
          professionalPhone: professionalUser.phone,
          address: booking.bookingAddressSnapshot?.fullAddress || "לא מוגדר",
          estimatedArrivalTime: booking.estimatedArrivalTime
        }
      }

      const clientResults = await this.sendMultiChannelNotification(clientRecipients, clientNotificationData)
      
      // שמירת לוג
      await this.logNotification("booking_confirmed", bookingId, client._id, clientResults)
      
      return clientResults
      
    } catch (error) {
      logger.error("Error sending booking confirmation notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת הודעה למטפל על הזמנה חדשה
   */
  async sendBookingNotification(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const [booking, professional] = await Promise.all([
        Booking.findById(bookingId)
          .populate('treatmentId')
          .populate('userId')
          .lean(),
        ProfessionalProfile.findOne({ userId: professionalId })
          .populate('userId')
          .lean()
      ])

      if (!booking || !professional) {
        throw new Error("הזמנה או מטפל לא נמצאו")
      }

      const professionalUser = professional.userId as any
      const client = booking.userId as any

      const recipients = await this.getUserNotificationRecipients(professionalUser, ["email", "sms"])
      
      const notificationData = {
        type: "professional_notification" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          clientName: client.name,
          clientPhone: client.phone,
          address: booking.bookingAddressSnapshot?.fullAddress || "לא מוגדר",
          amount: booking.priceDetails?.finalAmount || 0,
          professionalPayment: booking.priceDetails?.totalProfessionalPayment || 0,
          responseUrl: `${process.env.NEXTAUTH_URL}/dashboard/professional/bookings/${bookingId}`
        }
      }

      const results = await this.sendMultiChannelNotification(recipients, notificationData)
      
      // שמירת לוג
      await this.logNotification("professional_notification", bookingId, professionalId, results)
      
      return results
      
    } catch (error) {
      logger.error("Error sending professional notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת הודעה על שיוך מטפל
   */
  async sendBookingAssignment(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const [booking, professional] = await Promise.all([
        Booking.findById(bookingId)
          .populate('treatmentId')
          .populate('userId')
          .lean(),
        ProfessionalProfile.findOne({ userId: professionalId })
          .populate('userId')
          .lean()
      ])

      if (!booking || !professional) {
        throw new Error("הזמנה או מטפל לא נמצאו")
      }

      const professionalUser = professional.userId as any
      const client = booking.userId as any

      // הודעה למטפל
      const professionalRecipients = await this.getUserNotificationRecipients(professionalUser, ["email", "sms"])
      const professionalNotificationData = {
        type: "booking_assignment" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          clientName: client.name,
          clientPhone: client.phone,
          address: booking.bookingAddressSnapshot?.fullAddress || "לא מוגדר",
          amount: booking.priceDetails?.finalAmount || 0,
          professionalPayment: booking.priceDetails?.totalProfessionalPayment || 0,
          dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/professional/bookings/${bookingId}`
        }
      }

      const professionalResults = await this.sendMultiChannelNotification(professionalRecipients, professionalNotificationData)

      // הודעה ללקוח
      const clientRecipients = await this.getUserNotificationRecipients(client, ["email", "sms"])
      const clientNotificationData = {
        type: "booking_confirmed" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          professionalName: professionalUser.name,
          professionalPhone: professionalUser.phone,
          address: booking.bookingAddressSnapshot?.fullAddress || "לא מוגדר"
        }
      }

      const clientResults = await this.sendMultiChannelNotification(clientRecipients, clientNotificationData)
      
      // שמירת לוג
      await this.logNotification("booking_assignment", bookingId, professionalId, [...professionalResults, ...clientResults])
      
      return [...professionalResults, ...clientResults]
      
    } catch (error) {
      logger.error("Error sending booking assignment notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת הודעת עדכון סטטוס
   */
  async sendStatusUpdate(bookingId: string, status: string, metadata?: Record<string, any>): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const booking = await Booking.findById(bookingId)
        .populate('treatmentId')
        .populate('userId')
        .populate('professionalId')
        .lean()
        
      if (!booking) {
        throw new Error("הזמנה לא נמצאה")
      }

      const client = booking.userId as any
      const professional = booking.professionalId as any

      const recipients = await this.getUserNotificationRecipients(client, ["email", "sms"])
      
      const notificationData = {
        type: "status_update" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          status,
          statusText: this.getStatusText(status),
          professionalName: professional?.name || "לא מוגדר",
          professionalPhone: professional?.phone,
          estimatedArrival: metadata?.estimatedArrival,
          professionalNotes: metadata?.professionalNotes
        }
      }

      const results = await this.sendMultiChannelNotification(recipients, notificationData)
      
      // שמירת לוג
      await this.logNotification("status_update", bookingId, client._id, results)
      
      return results
      
    } catch (error) {
      logger.error("Error sending status update notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת בקשה לחוות דעת
   */
  async sendReviewRequest(bookingId: string, userId: string): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const booking = await Booking.findById(bookingId)
        .populate('treatmentId')
        .populate('userId')
        .populate('professionalId')
        .lean()
        
      if (!booking) {
        throw new Error("הזמנה לא נמצאה")
      }

      const client = booking.userId as any
      const professional = booking.professionalId as any

      const recipients = await this.getUserNotificationRecipients(client, ["email", "sms"])
      
      const notificationData = {
        type: "review_request" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          professionalName: professional?.name || "לא מוגדר",
          treatmentCompletedAt: booking.treatmentCompletedAt,
          reviewUrl: `${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}/review`
        }
      }

      const results = await this.sendMultiChannelNotification(recipients, notificationData)
      
      // שמירת לוג
      await this.logNotification("review_request", bookingId, userId, results)
      
      return results
      
    } catch (error) {
      logger.error("Error sending review request notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת תזכורת לחוות דעת
   */
  async sendReviewReminder(bookingId: string, userId: string): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const booking = await Booking.findById(bookingId)
        .populate('treatmentId')
        .populate('userId')
        .populate('professionalId')
        .lean()
        
      if (!booking) {
        throw new Error("הזמנה לא נמצאה")
      }

      const client = booking.userId as any
      const professional = booking.professionalId as any

      const recipients = await this.getUserNotificationRecipients(client, ["email", "sms"])
      
      const notificationData = {
        type: "review_reminder" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          professionalName: professional?.name || "לא מוגדר",
          treatmentCompletedAt: booking.treatmentCompletedAt,
          reviewUrl: `${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}/review`
        }
      }

      const results = await this.sendMultiChannelNotification(recipients, notificationData)
      
      // שמירת לוג
      await this.logNotification("review_reminder", bookingId, userId, results)
      
      return results
      
    } catch (error) {
      logger.error("Error sending review reminder notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת תזכורת למטפל
   */
  async sendBookingReminder(bookingId: string, professionalId: string): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      const [booking, professional] = await Promise.all([
        Booking.findById(bookingId)
          .populate('treatmentId')
          .populate('userId')
          .lean(),
        ProfessionalProfile.findOne({ userId: professionalId })
          .populate('userId')
          .lean()
      ])

      if (!booking || !professional) {
        throw new Error("הזמנה או מטפל לא נמצאו")
      }

      const professionalUser = professional.userId as any
      const client = booking.userId as any

      const recipients = await this.getUserNotificationRecipients(professionalUser, ["email", "sms"])
      
      const notificationData = {
        type: "professional_reminder" as const,
        bookingData: {
          bookingNumber: booking.bookingNumber,
          treatmentName: booking.treatmentId.name,
          bookingDateTime: booking.bookingDateTime,
          clientName: client.name,
          clientPhone: client.phone,
          address: booking.bookingAddressSnapshot?.fullAddress || "לא מוגדר",
          amount: booking.priceDetails?.finalAmount || 0,
          professionalPayment: booking.priceDetails?.totalProfessionalPayment || 0,
          responseUrl: `${process.env.NEXTAUTH_URL}/dashboard/professional/bookings/${bookingId}`
        }
      }

      const results = await this.sendMultiChannelNotification(recipients, notificationData)
      
      // שמירת לוג
      await this.logNotification("professional_reminder", bookingId, professionalId, results)
      
      return results
      
    } catch (error) {
      logger.error("Error sending professional reminder notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * שליחת התראה למנהל
   */
  async sendAdminAlert(alertType: string, metadata: Record<string, any>): Promise<NotificationResult[]> {
    try {
      await dbConnect()
      
      // מציאת מנהלים
      const adminUsers = await User.find({
        roles: "admin",
        isActive: true
      }).lean()

      if (adminUsers.length === 0) {
        logger.warn("No admin users found for alert:", alertType)
        return []
      }

      const results: NotificationResult[] = []
      
      for (const admin of adminUsers) {
        const recipients = await this.getUserNotificationRecipients(admin, ["email"])
        
        const notificationData = {
          type: "admin_alert" as const,
          alertData: {
            alertType,
            message: this.getAdminAlertMessage(alertType),
            metadata,
            timestamp: new Date(),
            dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/admin`
          }
        }

        const adminResults = await this.sendMultiChannelNotification(recipients, notificationData)
        results.push(...adminResults)
      }
      
      return results
      
    } catch (error) {
      logger.error("Error sending admin alert notification:", error)
      return [{ success: false, error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה" }]
    }
  }

  /**
   * קבלת recipients עבור משתמש
   */
  private async getUserNotificationRecipients(user: any, channels: string[]): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = []
    
    if (channels.includes("email") && user.email) {
      recipients.push({
        type: "email",
        value: user.email,
        language: user.language || "he"
      })
    }
    
    if (channels.includes("sms") && user.phone) {
      recipients.push({
        type: "phone",
        value: user.phone,
        language: user.language || "he"
      })
    }
    
    return recipients
  }

  /**
   * שליחת הודעה מרובת ערוצים
   */
  private async sendMultiChannelNotification(
    recipients: NotificationRecipient[],
    data: any
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []
    
    for (const recipient of recipients) {
      try {
        const result = await this.notificationManager.sendNotification(recipient, data)
        results.push(result)
      } catch (error) {
        logger.error("Error sending notification to recipient:", error)
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "שגיאה בשליחת הודעה"
        })
      }
    }
    
    return results
  }

  /**
   * קבלת טקסט סטטוס
   */
  private getStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      "pending_payment": "ממתין לתשלום",
      "pending_professional": "ממתין לשיוך מטפל",
      "confirmed": "מאושר",
      "on_way": "המטפל בדרך",
      "completed": "הושלם",
      "pending_review": "ממתין לחוות דעת",
      "reviewed": "נסקר",
      "no_professionals_available": "אין מטפלים זמינים",
      "cancelled": "בוטל",
      "refunded": "הוחזר"
    }
    
    return statusTexts[status] || status
  }

  /**
   * קבלת הודעת התראה למנהל
   */
  private getAdminAlertMessage(alertType: string): string {
    const messages: Record<string, string> = {
      "no_professionals_available": "אין מטפלים זמינים להזמנה",
      "booking_payment_failed": "תשלום להזמנה נכשל",
      "professional_no_response": "מטפל לא מגיב להזמנה",
      "booking_cancelled": "הזמנה בוטלה",
      "system_error": "שגיאת מערכת"
    }
    
    return messages[alertType] || "התראת מערכת"
  }

  /**
   * שמירת לוג הודעה
   */
  private async logNotification(
    type: string,
    bookingId: string,
    recipientId: string,
    results: NotificationResult[]
  ): Promise<void> {
    try {
      const successCount = results.filter(r => r.success).length
      logger.info(`Notification sent: ${type}`, {
        bookingId,
        recipientId,
        totalSent: results.length,
        successCount,
        failureCount: results.length - successCount
      })
      
      // הפעלת אירוע
      await eventBus.emit(createBookingEvent(
        "notification:sent",
        bookingId,
        recipientId,
        { type, results }
      ))
    } catch (error) {
      logger.error("Error logging notification:", error)
    }
  }
}

// יצירת instance יחיד
export const bookingNotificationService = new BookingNotificationService()

// Export functions for compatibility
export const {
  sendBookingCreated,
  sendBookingConfirmation,
  sendBookingNotification,
  sendBookingAssignment,
  sendStatusUpdate,
  sendReviewRequest,
  sendReviewReminder,
  sendBookingReminder,
  sendAdminAlert
} = bookingNotificationService as any 