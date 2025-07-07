import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import ProfessionalResponse from "@/lib/db/models/professional-response"
import { NotificationManager } from "@/lib/notifications/notification-manager"
import { BookingNotificationService } from "@/lib/notifications/booking-notification-service"
import { logger } from "@/lib/logs/logger"
import { eventBus, createBookingEvent } from "@/lib/events/booking-event-system"

export type ProfessionalResponseAction = "accept" | "decline" | "on_way" | "complete"

export interface ProfessionalResponseData {
  professionalId: string
  action: ProfessionalResponseAction
  notes?: string
  estimatedArrival?: Date
  cancelReason?: string
}

export interface ProfessionalResponseResult {
  success: boolean
  message?: string
  error?: string
  booking?: any
}

export class ProfessionalResponseService {
  private notificationManager: NotificationManager
  private bookingNotificationService: BookingNotificationService

  constructor() {
    this.notificationManager = new NotificationManager()
    this.bookingNotificationService = new BookingNotificationService()
  }

  /**
   * טיפול בתגובת מטפל - קבלה/דחייה/הגעה/השלמה
   */
  async handleProfessionalResponse(
    responseId: string,
    responseData: ProfessionalResponseData
  ): Promise<ProfessionalResponseResult> {
    try {
      // מצא את התגובה
      const response = await ProfessionalResponse.findById(responseId)
      if (!response) {
        return { success: false, error: "תגובה לא נמצאה" }
      }

      // מצא את ההזמנה
      const booking = await Booking.findById(response.bookingId)
      if (!booking) {
        return { success: false, error: "הזמנה לא נמצאה" }
      }

      // בדוק אם הפעולה מתאימה לסטטוס הנוכחי
      const isValidAction = await this.validateAction(booking, responseData.action)
      if (!isValidAction) {
        return { success: false, error: "הפעולה לא מתאימה לסטטוס הנוכחי" }
      }

      // בצע את הפעולה
      const result = await this.processAction(booking, response, responseData)
      
      return result
    } catch (error) {
      logger.error("Error handling professional response:", error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "שגיאה בטיפול בתגובת המטפל" 
      }
    }
  }

  /**
   * בדיקת תקינות הפעולה לפי סטטוס ההזמנה
   */
  private async validateAction(booking: any, action: ProfessionalResponseAction): Promise<boolean> {
    switch (action) {
      case "accept":
        return booking.status === "pending_professional"
      case "decline":
        return booking.status === "pending_professional"
      case "on_way":
        return booking.status === "confirmed"
      case "complete":
        return booking.status === "on_way"
      default:
        return false
    }
  }

  /**
   * ביצוע הפעולה על פי סוג התגובה
   */
  private async processAction(
    booking: any, 
    response: any, 
    responseData: ProfessionalResponseData
  ): Promise<ProfessionalResponseResult> {
    switch (responseData.action) {
      case "accept":
        return await this.handleAcceptance(booking, response, responseData)
      case "decline":
        return await this.handleDecline(booking, response, responseData)
      case "on_way":
        return await this.handleOnWay(booking, response, responseData)
      case "complete":
        return await this.handleComplete(booking, response, responseData)
      default:
        return { success: false, error: "פעולה לא מוכרת" }
    }
  }

  /**
   * טיפול בקבלת ההזמנה
   */
  private async handleAcceptance(
    booking: any, 
    response: any, 
    responseData: ProfessionalResponseData
  ): Promise<ProfessionalResponseResult> {
    try {
      // עדכון סטטוס התגובה
      response.status = "accepted"
      response.respondedAt = new Date()
      response.notes = responseData.notes
      await response.save()

      // עדכון ההזמנה
      const updatedBooking = await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: "confirmed",
          professionalId: responseData.professionalId,
          confirmedAt: new Date()
        },
        { new: true }
      )

      if (!updatedBooking) {
        return { success: false, error: "שגיאה בעדכון ההזמנה" }
      }

      // שליחת התראה ללקוח
      await this.bookingNotificationService.sendBookingConfirmation(
        (updatedBooking._id as any).toString(),
        responseData.professionalId
      )

      // הפעלת אירוע
      await eventBus.emit(createBookingEvent(
        "booking:professional_confirmed",
        (updatedBooking._id as any).toString(),
        booking.userId?.toString() || ""
      ))

      return { 
        success: true, 
        message: "ההזמנה אושרה בהצלחה",
        booking: updatedBooking 
      }
    } catch (error) {
      logger.error("Error in acceptance handling:", error)
      return { success: false, error: "שגיאה בטיפול בקבלת ההזמנה" }
    }
  }

  /**
   * טיפול בדחיית ההזמנה
   */
  private async handleDecline(
    booking: any, 
    response: any, 
    responseData: ProfessionalResponseData
  ): Promise<ProfessionalResponseResult> {
    try {
      // עדכון סטטוס התגובה
      response.status = "declined"
      response.respondedAt = new Date()
      response.notes = responseData.notes
      await response.save()

      // הסרת המטפל מרשימת המתאימים
      const updatedBooking = await Booking.findByIdAndUpdate(
        booking._id,
        {
          $pull: {
            suitableProfessionals: { professionalId: responseData.professionalId }
          }
        },
        { new: true }
      )

      if (!updatedBooking) {
        return { success: false, error: "שגיאה בעדכון ההזמנה" }
      }

      // בדיקה אם נותרו מטפלים
      const remainingProfessionals = updatedBooking.suitableProfessionals?.filter(
        (p: any) => p.professionalId.toString() !== responseData.professionalId
      ) || []

      if (remainingProfessionals.length === 0) {
        // אין מטפלים נוספים - סמן כלא זמין
        await Booking.findByIdAndUpdate(booking._id, {
          status: "no_professionals_available",
          noResponseFromProfessionalsAt: new Date()
        })

        // שליחת התראה למנהל
        await this.notificationManager.sendAdminAlert("no_professionals_available", {
          bookingId: booking._id.toString(),
          treatmentName: booking.treatmentId?.name || "טיפול לא ידוע"
        })
      } else {
        // שליחת התראה למטפלים הנותרים
        await this.bookingNotificationService.sendBookingNotification(
          (updatedBooking._id as any).toString(),
          ""
        )
      }

      return { 
        success: true, 
        message: "ההזמנה נדחתה",
        booking: updatedBooking 
      }
    } catch (error) {
      logger.error("Error in decline handling:", error)
      return { success: false, error: "שגיאה בטיפול בדחיית ההזמנה" }
    }
  }

  /**
   * טיפול בהודעת "בדרך"
   */
  private async handleOnWay(
    booking: any, 
    response: any, 
    responseData: ProfessionalResponseData
  ): Promise<ProfessionalResponseResult> {
    try {
      // עדכון ההזמנה
      const updatedBooking = await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: "on_way",
          professionalArrivedAt: new Date(),
          estimatedArrivalTime: responseData.estimatedArrival
        },
        { new: true }
      )

      if (!updatedBooking) {
        return { success: false, error: "שגיאה בעדכון ההזמנה" }
      }

      // שליחת התראה ללקוח
      await this.bookingNotificationService.sendStatusUpdate(
        (updatedBooking as any)._id.toString(),
        "on_way",
        { estimatedArrival: responseData.estimatedArrival }
      )

      return { 
        success: true, 
        message: "הסטטוס עודכן ל'בדרך'",
        booking: updatedBooking 
      }
    } catch (error) {
      logger.error("Error in on_way handling:", error)
      return { success: false, error: "שגיאה בעדכון הסטטוס" }
    }
  }

  /**
   * טיפול בהשלמת הטיפול
   */
  private async handleComplete(
    booking: any, 
    response: any, 
    responseData: ProfessionalResponseData
  ): Promise<ProfessionalResponseResult> {
    try {
      // עדכון ההזמנה
      const updatedBooking = await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: "completed",
          treatmentCompletedAt: new Date(),
          endTime: new Date()
        },
        { new: true }
      )

      if (!updatedBooking) {
        return { success: false, error: "שגיאה בעדכון ההזמנה" }
      }

      // שליחת התראה ללקוח
      await this.bookingNotificationService.sendStatusUpdate(
        (updatedBooking as any)._id.toString(),
        "completed"
      )

      // הפעלת שירות הביקורות האוטומטי
      await eventBus.emit(createBookingEvent(
        "booking:completed",
        (updatedBooking as any)._id.toString(),
        booking.userId?.toString() || ""
      ))

      return { 
        success: true, 
        message: "הטיפול הושלם בהצלחה",
        booking: updatedBooking 
      }
    } catch (error) {
      logger.error("Error in complete handling:", error)
      return { success: false, error: "שגיאה בטיפול בהשלמת הטיפול" }
    }
  }

  /**
   * בדיקת תגובות מטפלים עבור הזמנה
   */
  async getProfessionalResponses(bookingId: string): Promise<any[]> {
    try {
      const responses = await ProfessionalResponse.find({ bookingId })
        .populate("professionalId", "name email phone")
        .sort({ createdAt: -1 })
        .lean()

      return responses.map((response: any) => ({
        ...response,
        professionalId: response.professionalId || null
      }))
    } catch (error) {
      logger.error("Error getting professional responses:", error)
      return []
    }
  }

  /**
   * קבלת כל התגובות הממתינות עבור מטפל
   */
  async getPendingResponsesForProfessional(professionalId: string): Promise<any[]> {
    try {
      const responses = await ProfessionalResponse.find({
        professionalId,
        status: "sent"
      })
        .populate("bookingId")
        .sort({ createdAt: -1 })
        .lean()

      return responses.filter(
        (response: any) => response.bookingId && response.bookingId.status === "pending_professional"
      )
    } catch (error) {
      logger.error("Error getting pending responses:", error)
      return []
    }
  }

  /**
   * מציאת המטפל הבא לשליחת התראה
   */
  async getNextProfessionalToNotify(bookingId: string): Promise<string | null> {
    try {
      const booking = await Booking.findById(bookingId)
      if (!booking || !booking.suitableProfessionals) {
        return null
      }

      // מצא מטפלים שטרם נשלחה להם התראה
      const sentResponses = await ProfessionalResponse.find({ bookingId })
      const sentProfessionalIds = sentResponses.map(r => r.professionalId.toString())

      const availableProfessionals = booking.suitableProfessionals.filter(
        (p: any) => !sentProfessionalIds.includes(p.professionalId.toString())
      )

      return availableProfessionals.length > 0 ? availableProfessionals[0].professionalId.toString() : null
    } catch (error) {
      logger.error("Error getting next professional:", error)
      return null
    }
  }

  /**
   * קבלת סטטוס התגובות עבור הזמנה
   */
  async getBookingResponseStatus(bookingId: string): Promise<any> {
    try {
      const responses = await this.getProfessionalResponses(bookingId)
      const total = responses.length
      const pending = responses.filter(r => r.status === "sent").length
      const accepted = responses.filter(r => r.status === "accepted").length
      const declined = responses.filter(r => r.status === "declined").length
      const expired = responses.filter(r => r.status === "expired").length

      return {
        total,
        pending,
        accepted,
        declined,
        expired,
        responses
      }
    } catch (error) {
      logger.error("Error getting booking response status:", error)
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        declined: 0,
        expired: 0,
        responses: []
      }
    }
  }

  /**
   * שליחת תזכורת תגובה למטפל
   */
  async sendResponseReminder(bookingId: string, professionalId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const booking = await Booking.findById(bookingId)
      if (!booking) {
        return { success: false, error: "הזמנה לא נמצאה" }
      }

      const response = await ProfessionalResponse.findOne({ bookingId, professionalId })
      if (!response) {
        return { success: false, error: "תגובה לא נמצאה" }
      }

      if (response.status !== "sent") {
        return { success: false, error: "אי אפשר לשלוח תזכורת לתגובה שכבר נענתה" }
      }

      // שליחת התזכורת
      await this.bookingNotificationService.sendBookingReminder(bookingId, professionalId)

      return { success: true, message: "תזכורת נשלחה בהצלחה" }
    } catch (error) {
      logger.error("Error sending response reminder:", error)
      return { success: false, error: "שגיאה בשליחת התזכורת" }
    }
  }
}

// Export singleton instance
export const professionalResponseService = new ProfessionalResponseService() 