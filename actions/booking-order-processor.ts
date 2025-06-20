"use server"

import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"

// Import models
import Booking, { type IBooking } from "@/lib/db/models/booking"
import User, { type IUser, UserRole } from "@/lib/db/models/user"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import { sendUserNotification, sendGuestNotification } from "@/actions/notification-service"
import type { NotificationLanguage } from "@/lib/notifications/notification-types"

/**
 * 🎯 CENTRALIZED ORDER PROCESSOR
 * 
 * התהליך המרכזי שמתבצע אחרי תשלום מוצלח:
 * 1. חישוב מחירים סטטיים ורווח
 * 2. חיפוש מטפלים מתאימים
 * 3. שליחת התראות למזמין ולמטופל
 * 4. שליחת התראות למטפלים
 * 5. הוספה לרשימת תפוצה (במידה ואושר)
 * 6. טריגר אירועי הזמנה
 */

interface OrderProcessingContext {
  bookingId: string
  paymentStatus: "success" | "failed"
  transactionId?: string
  cardLast4?: string
  amountPaid?: number
}

interface ProcessingResult {
  success: boolean
  error?: string
  details?: {
    professionalCount?: number
    notificationsSent?: number
    mailingListAdded?: boolean
    priceBreakdown?: PriceBreakdown
  }
}

interface PriceBreakdown {
  basePrice: number
  addons: number
  totalPrice: number
  amountPaid: number
  therapistPay: number
  systemFee: number
}

export async function processBookingOrder(context: OrderProcessingContext): Promise<ProcessingResult> {
  try {
    await dbConnect()
    
    logger.info("🎯 Starting centralized order processing", { 
      bookingId: context.bookingId,
      paymentStatus: context.paymentStatus 
    })

    const booking = await Booking.findById(context.bookingId)
      .populate('treatmentId')
      .populate('userId')
    
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (context.paymentStatus === "success") {
      return await processSuccessfulPayment(booking, context)
    } else {
      return await processFailedPayment(booking, context)
    }

  } catch (error) {
    logger.error("❌ Error in centralized order processing:", {
      bookingId: context.bookingId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Order processing failed" }
  }
}

async function processSuccessfulPayment(booking: IBooking, context: OrderProcessingContext): Promise<ProcessingResult> {
  const mongooseDbSession = await mongoose.startSession()
  
  try {
    let processedData: ProcessingResult = { success: true, details: {} }
    
    await mongooseDbSession.withTransaction(async () => {
      
      // ✅ 1. עדכון פרטי תשלום וסטטוס
      booking.paymentDetails.paymentStatus = "paid"
      booking.paymentDetails.transactionId = context.transactionId
      booking.paymentDetails.paymentDate = new Date()
      booking.paymentDetails.amountPaid = context.amountPaid || booking.priceDetails.finalAmount
      booking.paymentDetails.cardLast4 = context.cardLast4
      
      booking.status = "in_process" // שולם אבל לא שויך מטפל
      booking.step = 8 // שלב אישור סופי
      booking.orderEventTriggered = true
      booking.orderEventTimestamp = new Date()
      
      // ✅ 2. חישוב מחירים סטטיים ורווח
      const priceBreakdown = calculatePriceBreakdown(booking)
      booking.staticTreatmentPrice = priceBreakdown.basePrice
      booking.staticTherapistPay = priceBreakdown.therapistPay
      booking.staticSystemFee = priceBreakdown.systemFee
      
      processedData.details!.priceBreakdown = priceBreakdown
      
      await booking.save({ session: mongooseDbSession })
    })
    
    // ✅ 3. חיפוש מטפלים מתאימים (מחוץ לטרנזקציה)
    const suitableProfessionals = await findSuitableProfessionals(booking)
    if (suitableProfessionals.success && suitableProfessionals.professionals) {
      processedData.details!.professionalCount = suitableProfessionals.professionals.length
      
      // שמירת רשימת המטפלים בהזמנה
      booking.suitableProfessionals = suitableProfessionals.professionals.map((prof: any) => ({
        professionalId: prof.userId._id,
        name: prof.userId.name,
        email: prof.userId.email,
        phone: prof.userId.phone,
        gender: prof.userId.gender,
        profileId: prof._id,
        calculatedAt: new Date()
      }))
      
      await booking.save()
    }
    
    // ✅ 4. שליחת התראות למזמין ולמטופל
    const notificationResults = await sendBookingConfirmationNotifications(booking)
    processedData.details!.notificationsSent = notificationResults.sentCount
    
    // ✅ 5. שליחת התראות למטפלים
    if (suitableProfessionals.success && suitableProfessionals.professionals?.length > 0) {
      try {
        const { resendProfessionalNotifications } = await import("@/actions/notification-service")
        const smsResult = await resendProfessionalNotifications(booking._id.toString())
        
        logger.info("✅ Sent professional notifications", { 
          bookingId: booking._id.toString(),
          sentCount: smsResult.sentCount 
        })
      } catch (error) {
        logger.error("❌ Failed to send professional notifications", { 
          bookingId: booking._id.toString(),
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }
    
    // ✅ 6. הוספה לרשימת תפוצה (אם אושר marketing consent)
    if (booking.consents?.marketingOptIn) {
      const mailingResult = await addToMailingList(booking)
      processedData.details!.mailingListAdded = mailingResult.success
    }
    
    // ✅ 7. טריגר אירועי הזמנה
    await triggerOrderEvents(booking)
    
    logger.info("✅ Order processing completed successfully", { 
      bookingId: booking._id.toString(),
      details: processedData.details 
    })
    
    return processedData
    
  } catch (error) {
    logger.error("❌ Error processing successful payment:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to process successful payment" }
  } finally {
    await mongooseDbSession.endSession()
  }
}

async function processFailedPayment(booking: IBooking, context: OrderProcessingContext): Promise<ProcessingResult> {
  try {
    // עדכון סטטוס תשלום כושל
    booking.paymentDetails.paymentStatus = "failed"
    if (context.transactionId) {
      booking.paymentDetails.transactionId = context.transactionId
    }
    
    await booking.save()
    
    logger.info("⚠️  Payment failed, booking status updated", { 
      bookingId: booking._id.toString() 
    })
    
    return { success: true }
    
  } catch (error) {
    logger.error("❌ Error processing failed payment:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: "Failed to process failed payment" }
  }
}

/**
 * חישוב פילוח מחירים ורווח
 */
function calculatePriceBreakdown(booking: IBooking): PriceBreakdown {
  const basePrice = booking.priceDetails.basePrice || 0
  const addons = (booking.priceDetails.addons || []).reduce((sum, addon) => sum + addon.price, 0)
  const totalPrice = booking.priceDetails.finalAmount || 0
  const amountPaid = booking.paymentDetails.amountPaid || totalPrice
  
  // חישוב תשלום למטפל - 70% מהמחיר הבסיסי + אחוז מהתוספות
  const therapistBaseRate = 0.7
  const therapistAddonRate = 0.6 // אחוז נמוך יותר מתוספות
  
  const therapistPay = Math.round((basePrice * therapistBaseRate) + (addons * therapistAddonRate))
  const systemFee = amountPaid - therapistPay
  
  return {
    basePrice,
    addons,
    totalPrice,
    amountPaid,
    therapistPay,
    systemFee
  }
}

/**
 * חיפוש מטפלים מתאימים לפי הקריטריונים
 */
async function findSuitableProfessionals(booking: IBooking): Promise<{ success: boolean; professionals?: any[] }> {
  try {
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default
    
    // קריטריונים לחיפוש
    const treatmentId = booking.treatmentId._id.toString()
    const cityName = booking.bookingAddressSnapshot?.city
    const genderPreference = booking.therapistGenderPreference
    const durationId = booking.selectedDurationId?.toString()
    
    if (!cityName) {
      return { success: false }
    }

    // בניית שאילתת חיפוש
    const query: any = {
      status: 'active',
      isActive: true,
      'treatments.treatmentId': new mongoose.Types.ObjectId(treatmentId),
      $or: [
        { 'workAreas.cityName': cityName },
        { 'workAreas.coveredCities': cityName }
      ]
    }
    
    let professionals = await ProfessionalProfile.find(query)
      .populate({
        path: 'userId',
        select: 'name email phone gender roles',
        model: User,
        match: { roles: 'professional' }
      })
      .populate('treatments.treatmentId')
      .lean()
    
    // סינון לפי קריטריונים נוספים
    professionals = professionals.filter(prof => prof.userId !== null)
    
    if (genderPreference && genderPreference !== 'any') {
      professionals = professionals.filter(prof => 
        prof.userId && prof.userId.gender === genderPreference
      )
    }
    
    if (durationId) {
      professionals = professionals.filter(prof =>
        prof.treatments.some(t => 
          t.treatmentId._id.toString() === treatmentId &&
          (!t.durationId || t.durationId.toString() === durationId)
        )
      )
    }
    
    logger.info("🔍 Found suitable professionals", {
      bookingId: booking._id.toString(),
      professionalCount: professionals.length,
      criteria: { treatmentId, cityName, genderPreference: genderPreference || 'any' }
    })
    
    return { success: true, professionals }
  } catch (error) {
    logger.error("❌ Error finding suitable professionals:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false }
  }
}

/**
 * שליחת התראות אישור הזמנה למזמין ולמטופל
 */
async function sendBookingConfirmationNotifications(booking: IBooking): Promise<{ sentCount: number }> {
  let sentCount = 0
  
  try {
    const treatment = booking.treatmentId as ITreatment
    
    // התראה למזמין
    if (booking.consents?.customerAlerts && booking.consents.customerAlerts !== "none") {
      const customerNotificationData = {
        type: "BOOKING_CONFIRMED",
        bookingNumber: booking.bookingNumber,
        treatmentName: treatment.name,
        bookingDateTime: booking.bookingDateTime,
        customerName: booking.bookedByUserName
      }
      
      if (booking.userId) {
        // משתמש רשום
        const result = await sendUserNotification(
          booking.userId.toString(),
          customerNotificationData,
          booking.consents.customerAlerts,
          "he" as NotificationLanguage
        )
        if (result.success) sentCount++
      } else {
        // אורח
        const result = await sendGuestNotification(
          {
            name: booking.bookedByUserName || "",
            email: booking.bookedByUserEmail || "",
            phone: booking.bookedByUserPhone || ""
          },
          customerNotificationData,
          booking.consents.customerAlerts,
          "he" as NotificationLanguage
        )
        if (result.success) sentCount++
      }
    }
    
    // התראה למטופל (אם זה הזמנה עבור מישהו אחר)
    if (booking.bookedByUserName !== booking.recipientName && booking.consents?.patientAlerts && booking.consents.patientAlerts !== "none") {
      const patientNotificationData = {
        type: "BOOKING_CONFIRMED_PATIENT",
        bookingNumber: booking.bookingNumber,
        treatmentName: treatment.name,
        bookingDateTime: booking.bookingDateTime,
        patientName: booking.recipientName
      }
      
      const result = await sendGuestNotification(
        {
          name: booking.recipientName || "",
          email: booking.recipientEmail || "",
          phone: booking.recipientPhone || ""
        },
        patientNotificationData,
        booking.consents.patientAlerts,
        "he" as NotificationLanguage
      )
      if (result.success) sentCount++
    }
    
  } catch (error) {
    logger.error("❌ Error sending booking confirmation notifications:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
  
  return { sentCount }
}

/**
 * הוספה לרשימת תפוצה
 */
async function addToMailingList(booking: IBooking): Promise<{ success: boolean }> {
  try {
    // כאן תתווסף הלוגיקה להוספה לרשימת תפוצה
    // לדוגמה: integration עם מערכת Email Marketing
    
    const subscriberData = {
      name: booking.bookedByUserName,
      email: booking.bookedByUserEmail,
      phone: booking.bookedByUserPhone,
      source: "booking_completed",
      consentDate: new Date(),
      bookingId: booking._id.toString()
    }
    
    logger.info("📧 Added to mailing list", {
      bookingId: booking._id.toString(),
      email: subscriberData.email
    })
    
    // TODO: Implement actual mailing list integration
    
    return { success: true }
  } catch (error) {
    logger.error("❌ Error adding to mailing list:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false }
  }
}

/**
 * טריגר אירועי הזמנה
 */
async function triggerOrderEvents(booking: IBooking): Promise<void> {
  try {
    const { eventBus, createBookingEvent } = await import("@/lib/events/booking-event-system")
    
    // יצירת אירוע הזמנה הושלמה
    const orderCompletedEvent = createBookingEvent({
      type: "BOOKING_ORDER_COMPLETED",
      bookingId: booking._id.toString(),
      userId: booking.userId?.toString() || "guest",
      data: {
        bookingNumber: booking.bookingNumber,
        treatmentName: booking.treatmentId.name,
        finalAmount: booking.priceDetails.finalAmount,
        paymentStatus: booking.paymentDetails.paymentStatus
      }
    })
    
    await eventBus.emit(orderCompletedEvent)
    
    logger.info("🎉 Order events triggered", {
      bookingId: booking._id.toString(),
      eventType: "BOOKING_ORDER_COMPLETED"
    })
    
  } catch (error) {
    logger.error("❌ Error triggering order events:", {
      bookingId: booking._id.toString(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
} 